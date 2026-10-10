import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Role, Prisma } from '@prisma/client';
import { Request } from 'express';
import { z } from 'zod';
import { PlatformService } from './platform.service';
import { requireYearTerm } from './academic-terms';

const term = z.string().trim().min(1).max(80);
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => { const d = new Date(v); return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v; }, 'Enter a valid calendar date.');
const uuid = z.string().uuid();
const parse = <S extends z.ZodTypeAny>(schema: S, input: unknown): z.output<S> => {
  const r = schema.safeParse(input);
  if (!r.success) throw new BadRequestException(r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '));
  return r.data;
};
const key = (req: Request) => parse(uuid, req.header('Idempotency-Key'));

const bursars: Role[] = ['HEADMASTER', 'BURSAR'];

@Controller('api/v1/schools/:schoolId/finance')
export class BursarController {
  constructor(private readonly svc: PlatformService) {}

  private access(req: Request, schoolId: string, roles = bursars) {
    return this.svc.authorize(req, parse(uuid, schoolId), roles);
  }

  private async openYear(tx: Prisma.TransactionClient, schoolId: string, yearId: string) {
    const year = await tx.academicYear.findFirst({ where: { id: yearId, schoolId } });
    if (!year) {
      throw new BadRequestException('Choose an academic year in this school.');
    }
    return year;
  }

  private async feeDate(tx: Prisma.TransactionClient, schoolId: string, yearId: string, date: string) {
    const year = await tx.academicYear.findFirst({ where: { id: yearId, schoolId } });
    const value = new Date(date);
    if (!year || value < year.startsAt || value > year.endsAt) throw new BadRequestException('Fee due date must fall within the academic year.');
  }
  private async selectedTerm(schoolId: string, yearId: string, selected?: string): Promise<void> {
    if (!selected) return;
    const year = await this.svc.db.academicYear.findFirst({ where: { id: yearId, schoolId } });
    if (!year) throw new BadRequestException('Choose an academic year in this school.');
    requireYearTerm(year, selected, true);
  }

  @Get('fees')
  async listFees(@Req() req: Request, @Param('schoolId') schoolId: string, @Query() query: unknown) {
    await this.access(req, schoolId, [...bursars, 'REGISTRAR']);
    const q = parse(z.object({ yearId: uuid, term: term.optional(), classroomId: uuid.optional() }).strict(), query);
    await this.selectedTerm(schoolId, q.yearId, q.term);
    
    const fees = await this.svc.db.feeStructure.findMany({
      where: {
        schoolId,
        yearId: q.yearId,
        ...(q.term ? { term: q.term } : {}),
        ...(q.classroomId ? { classroomId: q.classroomId } : {})
      },
      include: {
        _count: { select: { charges: true } }
      },
      orderBy: [{ term: 'asc' }, { name: 'asc' }]
    });
    
    return fees.map(f => {
      const { _count, ...rest } = f;
      return { ...rest, used: _count.charges > 0 };
    });
  }

  @Get('ledger')
  async ledger(@Req() req: Request, @Param('schoolId') schoolId: string, @Query() query: unknown) {
    await this.access(req, schoolId, [...bursars, 'REGISTRAR']);
    const { yearId } = parse(z.object({ yearId: uuid }).strict(), query);
    const where = { schoolId, yearId };
    const [charges, payments, adjustments] = await Promise.all([
      this.svc.db.studentCharge.findMany({
        where,
        include: { student: { select: { name: true, admissionNumber: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      this.svc.db.payment.findMany({
        where,
        include: { student: { select: { name: true, admissionNumber: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      this.svc.db.adjustment.findMany({
        where,
        include: { student: { select: { name: true, admissionNumber: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
    ]);
    return { charges, payments, adjustments };
  }

  @Post('fees')
  async createFee(@Req() req: Request, @Param('schoolId') schoolId: string, @Body() body: unknown) {
    const { user } = await this.access(req, schoolId);
    const b = parse(z.object({
      yearId: uuid, classroomId: uuid.optional(),
      classroomIds: z.array(uuid).min(1).max(100).refine(ids => new Set(ids).size === ids.length, 'Classes must be unique.').optional(),
      term, name: z.string().trim().min(1).max(200),
      amount: z.number().int().positive().max(1_000_000_000), dueDate: dateOnly,
    }).strict().refine(v => !!v.classroomId !== !!v.classroomIds, 'Choose one or more classes.'), body);
    return this.svc.idempotent(`${user.id}:create-fee:${schoolId}`, key(req), b, async tx => {
      requireYearTerm(await this.openYear(tx, schoolId, b.yearId), b.term, true);
      await this.feeDate(tx, schoolId, b.yearId, b.dueDate);
      const ids = b.classroomIds ?? [b.classroomId!];
      if (await tx.classroom.count({ where: { id: { in: ids }, schoolId, yearId: b.yearId } }) !== ids.length)
        throw new BadRequestException('Choose classes in the selected school and academic year.');
      if (await tx.feeStructure.findFirst({ where: { schoolId, yearId: b.yearId, classroomId: { in: ids }, term: b.term, name: b.name } }))
        throw new ConflictException('This fee already exists for at least one selected class. No fees were created.');
      const fees = [];
      for (const classroomId of ids) {
        const fee = await tx.feeStructure.create({ data: { schoolId, classroomId, yearId: b.yearId, term: b.term, name: b.name, amount: b.amount, dueDate: new Date(b.dueDate) } });
        await tx.auditEvent.create({ data: { schoolId, actorId: user.id, action: 'FEE_CREATED', target: fee.id } });
        fees.push(fee);
      }
      return b.classroomIds ? { fees } : fees[0];
    });
  }

  @Patch('fees/:feeId')
  async updateFee(@Req() req: Request, @Param('schoolId') schoolId: string, @Param('feeId') feeId: string, @Body() body: unknown) {
    const { user } = await this.access(req, schoolId);
    parse(uuid, feeId);
    const b = parse(z.object({
      term: term.optional(),
      name: z.string().trim().min(1).max(200).optional(),
      amount: z.number().int().positive().max(1_000_000_000).optional(),
      dueDate: dateOnly.optional()
    }).strict(), body);
    
    return this.svc.idempotent(`${user.id}:update-fee:${schoolId}:${feeId}`, key(req), b, async tx => {
      const fee = await tx.feeStructure.findFirst({
        where: { id: feeId, schoolId },
        include: { _count: { select: { charges: true } } }
      });
      if (!fee) throw new BadRequestException('Fee not found.');
      if (fee.locked || fee._count.charges > 0) throw new ConflictException('Cannot edit fee with existing charges.');
      
      const year = await this.openYear(tx, schoolId, fee.yearId);
      if (b.term) requireYearTerm(year, b.term, true);
      if (b.dueDate) await this.feeDate(tx, schoolId, fee.yearId, b.dueDate);
      
      if (b.name || b.term) {
        const term = b.term || fee.term;
        const name = b.name || fee.name;
        const existing = await tx.feeStructure.findFirst({
          where: { schoolId, yearId: fee.yearId, classroomId: fee.classroomId, term, name, id: { not: feeId } }
        });
        if (existing) throw new ConflictException('Fee with this name and term already exists.');
      }
      
      const updated = await tx.feeStructure.update({
        where: { id: feeId },
        data: {
          ...(b.term && { term: b.term }),
          ...(b.name && { name: b.name }),
          ...(b.amount && { amount: b.amount }),
          ...(b.dueDate && { dueDate: new Date(b.dueDate) })
        }
      });
      await tx.auditEvent.create({ data: { schoolId, actorId: user.id, action: 'FEE_UPDATED', target: feeId } });
      return updated;
    });
  }

  @Post('fees/:feeId/apply')
  async applyFee(@Req() req: Request, @Param('schoolId') schoolId: string, @Param('feeId') feeId: string) {
    const { user } = await this.access(req, schoolId);
    parse(uuid, feeId);
    
    return this.svc.idempotent(`${user.id}:apply-fee:${schoolId}:${feeId}`, key(req), {}, async tx => {
      const fee = await tx.feeStructure.findFirst({ where: { id: feeId, schoolId } });
      if (!fee) throw new BadRequestException('Fee not found.');
      await this.openYear(tx, schoolId, fee.yearId);
      
      const enrollments = await tx.enrollment.findMany({
        where: {
          schoolId,
          classroomId: fee.classroomId,
          status: 'active',
          student: {
            NOT: {
              charges: { some: { feeId } }
            }
          }
        },
        select: { studentId: true }
      });
      
      if (enrollments.length > 0) {
        await tx.studentCharge.createMany({
          data: enrollments.map(e => ({
            schoolId,
            feeId,
            studentId: e.studentId,
            yearId: fee.yearId,
            classroomId: fee.classroomId,
            term: fee.term,
            name: fee.name,
            amount: fee.amount,
            dueDate: fee.dueDate
          }))
        });
      }
      
      if (enrollments.length) await tx.feeStructure.update({
        where: { id: feeId },
        data: { locked: true }
      });
      
      await tx.auditEvent.create({ data: { schoolId, actorId: user.id, action: 'FEE_APPLIED', target: feeId } });
      return { count: enrollments.length };
    });
  }

  @Get('accounts')
  async accounts(@Req() req: Request, @Param('schoolId') schoolId: string, @Query() query: unknown) {
    await this.access(req, schoolId, [...bursars, 'REGISTRAR']);
    const q = parse(z.object({
      yearId: uuid,
      classroomId: uuid.optional(),
      term: term.optional(),
      search: z.string().trim().max(200).optional(),
      owingOnly: z.enum(['true', 'false']).optional(),
      page: z.coerce.number().int().min(1).default(1)
    }).strict(), query);
    await this.selectedTerm(schoolId, q.yearId, q.term);
    
    const rows = (await this.accountRows(schoolId, q.yearId, q.term)).filter(row =>
      (!q.classroomId || row.classroomId === q.classroomId) &&
      (!q.search || `${row.name} ${row.admissionNumber}`.toLowerCase().includes(q.search.toLowerCase())) &&
      (q.owingOnly !== 'true' || row.balance > 0));
    return { items: rows.slice((q.page - 1) * 25, q.page * 25), total: rows.length, page: q.page };
  }

  @Get('accounts/:studentId')
  async accountDetails(@Req() req: Request, @Param('schoolId') schoolId: string, @Param('studentId') studentId: string, @Query() query: unknown) {
    await this.access(req, schoolId, [...bursars, 'REGISTRAR']);
    parse(uuid, studentId);
    const q = parse(z.object({ yearId: uuid }).strict(), query);
    
    const [charges, payments, adjustments] = await Promise.all([
      this.svc.db.studentCharge.findMany({ where: { schoolId, studentId, yearId: q.yearId }, orderBy: { dueDate: 'asc' } }),
      this.svc.db.payment.findMany({ where: { schoolId, studentId, yearId: q.yearId }, orderBy: { date: 'desc' } }),
      this.svc.db.adjustment.findMany({ where: { schoolId, studentId, yearId: q.yearId }, orderBy: { createdAt: 'desc' } })
    ]);
    
    const charged = charges.reduce((s, c) => s + c.amount, 0);
    const paid = payments.filter(p => !p.voidAt).reduce((s, p) => s + p.amount, 0);
    const adj = adjustments.reduce((s, a) => s + a.amount, 0);
    const balance = charged + adj - paid;
    
    return { charges, payments, adjustments, totals: { charged, paid, adjustments: adj, balance } };
  }

  @Get('payments')
  async listPayments(@Req() req: Request, @Param('schoolId') schoolId: string, @Query() query: unknown) {
    await this.access(req, schoolId, [...bursars, 'REGISTRAR']);
    const q = parse(z.object({
      yearId: uuid,
      term: term.optional(),
      classroomId: uuid.optional(),
      search: z.string().trim().max(200).optional(),
      page: z.coerce.number().int().min(1).default(1)
    }).strict(), query);
    await this.selectedTerm(schoolId, q.yearId, q.term);
    
    const limit = 25;
    const skip = (q.page - 1) * limit;
    
    const where: Prisma.PaymentWhereInput = {
      schoolId,
      yearId: q.yearId,
      ...(q.term ? { term: q.term } : {}),
      ...(q.classroomId ? { student: { enrollments: { some: { schoolId, classroomId: q.classroomId } } } } : {}),
      ...(q.search ? {
        OR: [
          { receipt: { contains: q.search, mode: 'insensitive' } },
          { reference: { contains: q.search, mode: 'insensitive' } },
          { student: { name: { contains: q.search, mode: 'insensitive' } } }
        ]
      } : {})
    };
    
    const [items, total] = await Promise.all([
      this.svc.db.payment.findMany({ where, include: { student: { select: { name: true, admissionNumber: true } } }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take: limit, skip }),
      this.svc.db.payment.count({ where })
    ]);
    
    return { items, total, page: q.page };
  }

  @Post('payments')
  async recordPayment(@Req() req: Request, @Param('schoolId') schoolId: string, @Body() body: unknown) {
    return this.savePayment(req, schoolId, body);
  }

  @Post('payments/:paymentId/correct')
  async correctPayment(@Req() req: Request, @Param('schoolId') schoolId: string, @Param('paymentId') paymentId: string, @Body() body: unknown) {
    return this.savePayment(req, schoolId, body, parse(uuid, paymentId));
  }

  private async savePayment(req: Request, schoolId: string, body: unknown, originalId?: string) {
    const { user } = await this.access(req, schoolId, [...bursars, 'REGISTRAR']);
    const b = parse(z.object({
      yearId: uuid,
      studentId: uuid,
      chargeId: uuid.optional(),
      term,
      amount: z.number().int().positive().max(1_000_000_000),
      method: z.enum(['Cash', 'Bank transfer', 'Mobile money']),
      reference: z.string().trim().max(200).optional(),
      date: dateOnly,
      reason: originalId ? z.string().trim().min(10).max(2000) : z.never().optional(),
    }).strict().refine(v => v.method === 'Cash' || (v.reference && v.reference.trim().length > 0), 'Non-cash payments require a reference number.'), body);
    
    return this.svc.idempotent(`${user.id}:payment:${schoolId}${originalId ? ":correct:" + originalId : ""}`, key(req), b, async tx => {
      requireYearTerm(await this.openYear(tx, schoolId, b.yearId), b.term, true);
      
      if (originalId) {
        const original = await tx.payment.findFirst({ where: { id: originalId, schoolId, yearId: b.yearId } });
        if (!original) throw new BadRequestException('Original payment not found in the selected school and academic year.');
        if (original.voidAt) throw new ConflictException('This payment has already been voided or corrected. Refresh the list.');
        // This reversal and replacement commit together; validation failures leave the original unchanged.
        await tx.payment.update({ where: { id: originalId }, data: { voidAt: new Date(), voidBy: user.id, voidReason: b.reason } });
      }

      const student = await tx.student.findFirst({ where: { id: b.studentId, schoolId } });
      if (!student) throw new BadRequestException('Student not found.');
      
      const charges = await tx.studentCharge.aggregate({ where: { schoolId, studentId: b.studentId, term: b.term, yearId: b.yearId }, _sum: { amount: true } });
      const adjustments = await tx.adjustment.aggregate({ where: { schoolId, studentId: b.studentId, term: b.term, yearId: b.yearId }, _sum: { amount: true } });
      const payments = await tx.payment.aggregate({ where: { schoolId, studentId: b.studentId, term: b.term, yearId: b.yearId, voidAt: null }, _sum: { amount: true } });
      
      const charged = charges._sum.amount || 0;
      if (charged === 0) throw new BadRequestException('Student has no charges for this term.');
      
      const bal = charged + (adjustments._sum.amount || 0) - (payments._sum.amount || 0);
      if (b.amount > bal) throw new BadRequestException('Payment amount exceeds term balance.');
      if (b.chargeId) {
        const charge = await tx.studentCharge.findFirst({ where: { id: b.chargeId, schoolId, studentId: b.studentId, yearId: b.yearId, term: b.term } });
        if (!charge) throw new BadRequestException('Choose a fee assigned to this student in the selected period.');
        const allocated = await tx.payment.aggregate({ where: { chargeId: charge.id, voidAt: null }, _sum: { amount: true } });
        if (b.amount > charge.amount - (allocated._sum.amount ?? 0)) throw new BadRequestException('Payment amount exceeds the selected fee balance.');
      }
      
      if (b.reference) {
        const existingRef = await tx.payment.findFirst({ where: { schoolId, reference: b.reference, voidAt: null } });
        if (existingRef) throw new ConflictException('Payment reference already used.');
      }
      
      const year = await tx.academicYear.findFirst({ where: { id: b.yearId, schoolId } });
      if (!year) throw new BadRequestException('Choose an academic year in this school.');
      const d = new Date(b.date);
      if (d > new Date() || d < year.startsAt || d > year.endsAt) throw new BadRequestException('Invalid payment date.');
      
      const count = await tx.payment.count({ where: { schoolId } });
      const seq = String(count + 1).padStart(5, '0');
      const yearStr = year.name.replace(/[^A-Za-z0-9]/g, '').substring(0, 4).toUpperCase();
      const receipt = `SA-${yearStr}-${seq}`;
      
      const payment = await tx.payment.create({
        data: {
          schoolId,
          yearId: b.yearId,
          studentId: b.studentId,
          term: b.term,
          amount: b.amount,
          method: b.method,
          reference: b.reference || '',
          date: d,
          receipt,
          chargeId: b.chargeId,
          replacesId: originalId
        }
      });
      
      if (originalId) {
        await tx.payment.update({ where: { id: originalId }, data: { voidReason: `Corrected by ${receipt}: ${b.reason}` } });
        await tx.auditEvent.create({ data: { schoolId, actorId: user.id, action: 'PAYMENT_CORRECTED', target: `${originalId}:${payment.id}` } });
      }
      await tx.auditEvent.create({ data: { schoolId, actorId: user.id, action: 'PAYMENT_RECORDED', target: payment.id } });
      return payment;
    });
  }

  @Post('payments/:paymentId/void')
  async voidPayment(@Req() req: Request, @Param('schoolId') schoolId: string, @Param('paymentId') paymentId: string, @Body() body: unknown) {
    const { user } = await this.access(req, schoolId);
    parse(uuid, paymentId);
    const b = parse(z.object({ reason: z.string().trim().min(10).max(2000) }).strict(), body);
    
    return this.svc.idempotent(`${user.id}:void-payment:${schoolId}:${paymentId}`, key(req), b, async tx => {
      const payment = await tx.payment.findFirst({ where: { id: paymentId, schoolId } });
      if (!payment) throw new BadRequestException('Payment not found.');
      if (payment.voidAt) throw new ConflictException('Payment already voided.');
      await this.openYear(tx, schoolId, payment.yearId);
      
      const updated = await tx.payment.update({
        where: { id: paymentId },
        data: { voidReason: b.reason, voidAt: new Date(), voidBy: user.id }
      });
      
      await tx.auditEvent.create({ data: { schoolId, actorId: user.id, action: 'PAYMENT_VOIDED', target: paymentId } });
      return updated;
    });
  }

  @Post('adjustments')
  async recordAdjustment(@Req() req: Request, @Param('schoolId') schoolId: string, @Body() body: unknown) {
    const { user } = await this.access(req, schoolId);
    const b = parse(z.object({
      yearId: uuid,
      studentId: uuid,
      term,
      amount: z.number().int().positive().max(1_000_000_000),
      kind: z.enum(['Discount', 'Scholarship', 'Credit correction', 'Debit correction']),
      reason: z.string().trim().min(10).max(2000)
    }).strict(), body);
    
    return this.svc.idempotent(`${user.id}:adjustment:${schoolId}`, key(req), b, async tx => {
      requireYearTerm(await this.openYear(tx, schoolId, b.yearId), b.term, true);
      
      const charges = await tx.studentCharge.aggregate({ where: { schoolId, studentId: b.studentId, term: b.term, yearId: b.yearId }, _sum: { amount: true } });
      if ((charges._sum.amount || 0) === 0) throw new BadRequestException('Student has no charges for this term.');
      
      const isCredit = b.kind !== 'Debit correction';
      const actualAmount = isCredit ? -b.amount : b.amount;
      
      if (isCredit) {
        const adjustments = await tx.adjustment.aggregate({ where: { schoolId, studentId: b.studentId, term: b.term, yearId: b.yearId }, _sum: { amount: true } });
        const payments = await tx.payment.aggregate({ where: { schoolId, studentId: b.studentId, term: b.term, yearId: b.yearId, voidAt: null }, _sum: { amount: true } });
        const bal = (charges._sum.amount || 0) + (adjustments._sum.amount || 0) - (payments._sum.amount || 0);
        
        if (bal + actualAmount < 0) throw new BadRequestException('Credit adjustment would result in negative balance.');
      }
      
      const adjustment = await tx.adjustment.create({
        data: {
          schoolId,
          yearId: b.yearId,
          studentId: b.studentId,
          term: b.term,
          amount: actualAmount,
          kind: b.kind,
          reason: b.reason,
          actorId: user.id
        }
      });
      
      await tx.auditEvent.create({ data: { schoolId, actorId: user.id, action: 'ADJUSTMENT_RECORDED', target: adjustment.id } });
      return adjustment;
    });
  }

  // Aggregate each student/term once. Joining payments to fee rows multiplies receipts.
  private async accountRows(schoolId: string, yearId: string, selectedTerm?: string) {
    await this.selectedTerm(schoolId, yearId, selectedTerm);
    const where = { schoolId, yearId, ...(selectedTerm ? { term: selectedTerm } : {}) };
    const [students, charges, payments, adjustments] = await Promise.all([
      this.svc.db.student.findMany({ where: { schoolId, OR: [
        { enrollments: { some: { classroom: { yearId } } } }, { charges: { some: { yearId } } },
      ] }, select: { id: true, name: true, admissionNumber: true, enrollments: {
        where: { classroom: { yearId } }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], select: { classroomId: true }, take: 1,
      } }, orderBy: [{ name: 'asc' }, { id: 'asc' }] }),
      this.svc.db.studentCharge.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }] }),
      this.svc.db.payment.findMany({ where: { ...where, voidAt: null } }),
      this.svc.db.adjustment.findMany({ where }),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    return students.map(student => {
      const cs = charges.filter(c => c.studentId === student.id);
      const ps = payments.filter(p => p.studentId === student.id);
      const ads = adjustments.filter(a => a.studentId === student.id);
      const sum = (items: { amount: number }[]) => items.reduce((n, i) => n + i.amount, 0);
      const charged = sum(cs), paid = sum(ps), adjusted = sum(ads);
      const overdue = [...new Set(cs.map(c => c.term))].reduce((n, t) => {
        const termCharges = cs.filter(c => c.term === t);
        const dueCharges = termCharges.filter(c => c.dueDate.toISOString().slice(0, 10) < today);
        const due = sum(dueCharges);
        const adjustment = sum(ads.filter(a => a.term === t));
        const received = sum(ps.filter(p => p.term === t));
        const receivedForDue = sum(ps.filter(p => p.term === t && (!p.chargeId || dueCharges.some(c => c.id === p.chargeId))));
        // Debit corrections become overdue only once a charge in that term is due.
        return n + (due > 0 ? Math.max(0, Math.min(sum(termCharges) + adjustment - received, due + adjustment - receivedForDue)) : 0);
      }, 0);
      return { studentId: student.id, name: student.name, admissionNumber: student.admissionNumber,
        classroomId: student.enrollments[0]?.classroomId ?? cs[0]?.classroomId ?? '',
        charged, paid, adjustments: adjusted, expected: charged + adjusted, balance: charged + adjusted - paid, overdue };
    });
  }

  private totals(rows: Awaited<ReturnType<BursarController['accountRows']>>) {
    return rows.reduce((sum, row) => ({ charged: sum.charged + row.charged, paid: sum.paid + row.paid,
      adjustments: sum.adjustments + row.adjustments, expected: sum.expected + row.expected,
      balance: sum.balance + row.balance, overdue: sum.overdue + row.overdue, studentCount: sum.studentCount + 1,
    }), { charged: 0, paid: 0, adjustments: 0, expected: 0, balance: 0, overdue: 0, studentCount: 0 });
  }

  @Get('summary')
  async summary(@Req() req: Request, @Param('schoolId') schoolId: string, @Query() query: unknown) {
    await this.access(req, schoolId);
    const q = parse(z.object({ yearId: uuid, term: term.optional(), classroomId: uuid.optional() }).strict(), query);
    const rows = await this.accountRows(schoolId, q.yearId, q.term);
    return this.totals(rows.filter(row => !q.classroomId || row.classroomId === q.classroomId));
  }

  @Get('reports')
  async reports(@Req() req: Request, @Param('schoolId') schoolId: string, @Query() query: unknown) {
    await this.access(req, schoolId);
    const q = parse(z.object({ yearId: uuid, term: term.optional() }).strict(), query);
    const [classes, rows] = await Promise.all([
      this.svc.db.classroom.findMany({ where: { schoolId, yearId: q.yearId }, orderBy: { name: 'asc' } }),
      this.accountRows(schoolId, q.yearId, q.term),
    ]);
    return classes.map(cls => ({ classroomId: cls.id, className: cls.name,
      ...this.totals(rows.filter(row => row.classroomId === cls.id)) }));
  }
}
