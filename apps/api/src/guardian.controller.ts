import { 
  BadRequestException, 
  Body, 
  ConflictException, 
  Controller, 
  Delete, 
  ForbiddenException, 
  Get, 
  NotFoundException, 
  Param, 
  Patch, 
  Post, 
  Query, 
  Req 
} from '@nestjs/common';
import { CommunicationChannel, Prisma, Role } from '@prisma/client';
import { Request } from 'express';
import { z } from 'zod';
import { PlatformService } from './platform.service';
import { CommunicationService, normalizePhoneNumber } from './communication/communication.service';

const uuid = z.string().uuid();
const parse = <S extends z.ZodTypeAny>(schema: S, input: unknown): z.output<S> => {
  const result = schema.safeParse(input);
  if (!result.success) throw new BadRequestException(result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '));
  return result.data;
};

const readers: Role[] = ['HEADMASTER', 'REGISTRAR', 'ACADEMIC', 'TEACHER', 'BURSAR'];
const writers: Role[] = ['HEADMASTER', 'REGISTRAR'];

const phoneValidator = z.string().trim().min(7).max(25).transform(v => normalizePhoneNumber(v)).refine(v => /^255\d{9}$|^\+?[1-9]\d{6,14}$/.test(v), {
  message: 'Enter a valid phone number (e.g., 0712345678 or 255712345678).',
});

const guardianSchema = z.object({
  name: z.string().trim().min(2).max(150),
  phone: phoneValidator,
  whatsappPhone: z.string().trim().transform(v => v ? normalizePhoneNumber(v) : '').optional().nullable(),
  email: z.string().trim().email().optional().nullable().or(z.literal('')),
  preferredChannel: z.enum(['SMS', 'WHATSAPP', 'EMAIL']).default('SMS'),
  preferredLanguage: z.enum(['sw', 'en']).default('sw'),
  optOutSms: z.boolean().default(false),
  optOutWhatsapp: z.boolean().default(false),
});

const linkGuardianSchema = z.object({
  guardianId: uuid.optional(),
  guardianData: guardianSchema.optional(),
  relationship: z.string().trim().min(2).max(50).default('Guardian'),
  isPrimary: z.boolean().default(false),
  canReceiveReports: z.boolean().default(true),
  canReceiveFinanceAlert: z.boolean().default(true),
  canReceiveAttendanceAlert: z.boolean().default(true),
}).refine(data => !!data.guardianId || !!data.guardianData, {
  message: 'Provide either an existing guardianId or guardianData to create a new guardian.',
});

const updateLinkSchema = z.object({
  relationship: z.string().trim().min(2).max(50).optional(),
  isPrimary: z.boolean().optional(),
  canReceiveReports: z.boolean().optional(),
  canReceiveFinanceAlert: z.boolean().optional(),
  canReceiveAttendanceAlert: z.boolean().optional(),
});

const paging = {
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(150).default(''),
};

@Controller('api/v1/schools/:schoolId')
export class GuardianController {
  constructor(
    private readonly svc: PlatformService,
    private readonly comms: CommunicationService,
  ) {}

  private async access(req: Request, schoolId: string, write = false) {
    return this.svc.authorize(req, parse(uuid, schoolId), write ? writers : readers);
  }

  /**
   * List guardians registered in the school with paging, search, and student count
   */
  @Get('guardians')
  async listGuardians(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Query() query: unknown
  ) {
    await this.access(req, schoolId, false);
    const b = parse(z.object(paging).strict(), query);

    const where: Prisma.GuardianWhereInput = {
      schoolId,
      ...(b.q ? {
        OR: [
          { name: { contains: b.q, mode: 'insensitive' } },
          { phone: { contains: b.q } },
          { email: { contains: b.q, mode: 'insensitive' } },
        ],
      } : {}),
    };

    const [total, items] = await Promise.all([
      this.svc.db.guardian.count({ where }),
      this.svc.db.guardian.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (b.page - 1) * b.pageSize,
        take: b.pageSize,
        include: {
          _count: { select: { students: true } },
          students: {
            include: {
              student: {
                select: { id: true, name: true, admissionNumber: true },
              },
            },
          },
        },
      }),
    ]);

    return {
      items: items.map(g => ({
        id: g.id,
        name: g.name,
        phone: g.phone,
        whatsappPhone: g.whatsappPhone,
        email: g.email,
        preferredChannel: g.preferredChannel,
        preferredLanguage: g.preferredLanguage,
        phoneVerifiedAt: g.phoneVerifiedAt,
        whatsappVerifiedAt: g.whatsappVerifiedAt,
        emailVerifiedAt: g.emailVerifiedAt,
        optOutSms: g.optOutSms,
        optOutWhatsapp: g.optOutWhatsapp,
        studentCount: g._count.students,
        students: g.students.map(sg => ({
          studentId: sg.student.id,
          name: sg.student.name,
          admissionNumber: sg.student.admissionNumber,
          relationship: sg.relationship,
          isPrimary: sg.isPrimary,
        })),
        createdAt: g.createdAt,
      })),
      total,
      page: b.page,
      pageSize: b.pageSize,
    };
  }

  /**
   * Create a guardian in the school
   */
  @Post('guardians')
  async createGuardian(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Body() body: unknown
  ) {
    const { user } = await this.access(req, schoolId, true);
    const b = parse(guardianSchema, body);

    const existing = await this.svc.db.guardian.findFirst({
      where: { schoolId, phone: b.phone },
    });

    if (existing) {
      throw new ConflictException(`A guardian with phone number ${b.phone} already exists in this school.`);
    }

    const guardian = await this.svc.db.guardian.create({
      data: {
        schoolId,
        name: b.name,
        phone: b.phone,
        whatsappPhone: b.whatsappPhone || undefined,
        email: b.email || undefined,
        preferredChannel: b.preferredChannel as CommunicationChannel,
        preferredLanguage: b.preferredLanguage,
        optOutSms: b.optOutSms,
        optOutWhatsapp: b.optOutWhatsapp,
      },
    });

    await this.svc.db.auditEvent.create({
      data: {
        schoolId,
        actorId: user.id,
        action: 'GUARDIAN_CREATED',
        target: guardian.id,
      },
    });

    return guardian;
  }

  /**
   * Get single guardian details with linked students and contact verification status
   */
  @Get('guardians/:guardianId')
  async getGuardian(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Param('guardianId') guardianId: string
  ) {
    await this.access(req, schoolId, false);
    parse(uuid, guardianId);

    const guardian = await this.svc.db.guardian.findFirst({
      where: { id: guardianId, schoolId },
      include: {
        students: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                admissionNumber: true,
                gender: true,
                enrollments: {
                  where: { status: 'active' },
                  include: { classroom: { select: { name: true } } },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!guardian) {
      throw new NotFoundException('Guardian not found in this school.');
    }

    return {
      ...guardian,
      students: guardian.students.map(sg => ({
        id: sg.id,
        studentId: sg.student.id,
        name: sg.student.name,
        admissionNumber: sg.student.admissionNumber,
        classroomName: sg.student.enrollments[0]?.classroom?.name ?? 'Unassigned',
        relationship: sg.relationship,
        isPrimary: sg.isPrimary,
        canReceiveReports: sg.canReceiveReports,
        canReceiveFinanceAlert: sg.canReceiveFinanceAlert,
        canReceiveAttendanceAlert: sg.canReceiveAttendanceAlert,
      })),
    };
  }

  /**
   * Update guardian information
   */
  @Patch('guardians/:guardianId')
  async updateGuardian(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Param('guardianId') guardianId: string,
    @Body() body: unknown
  ) {
    const { user } = await this.access(req, schoolId, true);
    parse(uuid, guardianId);
    const b = parse(guardianSchema.partial(), body);

    const existing = await this.svc.db.guardian.findFirst({
      where: { id: guardianId, schoolId },
    });

    if (!existing) {
      throw new NotFoundException('Guardian not found in this school.');
    }

    if (b.phone && b.phone !== existing.phone) {
      const duplicate = await this.svc.db.guardian.findFirst({
        where: { schoolId, phone: b.phone, NOT: { id: guardianId } },
      });
      if (duplicate) throw new ConflictException(`Phone number ${b.phone} is already registered to another guardian.`);
    }

    const updated = await this.svc.db.guardian.update({
      where: { id_schoolId: { id: guardianId, schoolId } },
      data: {
        ...(b.name ? { name: b.name } : {}),
        ...(b.phone ? { phone: b.phone, phoneVerifiedAt: b.phone === existing.phone ? existing.phoneVerifiedAt : null } : {}),
        ...(b.whatsappPhone !== undefined ? { whatsappPhone: b.whatsappPhone || null, whatsappVerifiedAt: b.whatsappPhone === existing.whatsappPhone ? existing.whatsappVerifiedAt : null } : {}),
        ...(b.email !== undefined ? { email: b.email || null, emailVerifiedAt: b.email === existing.email ? existing.emailVerifiedAt : null } : {}),
        ...(b.preferredChannel ? { preferredChannel: b.preferredChannel as CommunicationChannel } : {}),
        ...(b.preferredLanguage ? { preferredLanguage: b.preferredLanguage } : {}),
        ...(b.optOutSms !== undefined ? { optOutSms: b.optOutSms } : {}),
        ...(b.optOutWhatsapp !== undefined ? { optOutWhatsapp: b.optOutWhatsapp } : {}),
      },
    });

    await this.svc.db.auditEvent.create({
      data: {
        schoolId,
        actorId: user.id,
        action: 'GUARDIAN_UPDATED',
        target: guardianId,
      },
    });

    return updated;
  }

  /**
   * Link a guardian to a student
   */
  @Post('students/:studentId/guardians')
  async linkGuardianToStudent(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Param('studentId') studentId: string,
    @Body() body: unknown
  ) {
    const { user } = await this.access(req, schoolId, true);
    parse(uuid, studentId);
    const b = parse(linkGuardianSchema, body);

    const student = await this.svc.db.student.findFirst({
      where: { id: studentId, schoolId },
    });
    if (!student) throw new NotFoundException('Student not found in this school.');

    return this.svc.atomic(async tx => {
      let guardianId = b.guardianId;

      if (!guardianId && b.guardianData) {
        // Find existing guardian by phone or create new
        const existing = await tx.guardian.findFirst({
          where: { schoolId, phone: b.guardianData.phone },
        });

        if (existing) {
          guardianId = existing.id;
        } else {
          const created = await tx.guardian.create({
            data: {
              schoolId,
              name: b.guardianData.name,
              phone: b.guardianData.phone,
              whatsappPhone: b.guardianData.whatsappPhone || undefined,
              email: b.guardianData.email || undefined,
              preferredChannel: b.guardianData.preferredChannel as CommunicationChannel,
              preferredLanguage: b.guardianData.preferredLanguage,
            },
          });
          guardianId = created.id;
        }
      }

      if (!guardianId) throw new BadRequestException('Guardian identification failed.');

      // Check if already linked
      const existingLink = await tx.studentGuardian.findUnique({
        where: { studentId_guardianId: { studentId, guardianId } },
      });

      if (existingLink) {
        throw new ConflictException('This guardian is already linked to the student.');
      }

      // If isPrimary is true, unset other primary guardians for this student
      if (b.isPrimary) {
        await tx.studentGuardian.updateMany({
          where: { studentId, schoolId },
          data: { isPrimary: false },
        });
      }

      const link = await tx.studentGuardian.create({
        data: {
          schoolId,
          studentId,
          guardianId,
          relationship: b.relationship,
          isPrimary: b.isPrimary,
          canReceiveReports: b.canReceiveReports,
          canReceiveFinanceAlert: b.canReceiveFinanceAlert,
          canReceiveAttendanceAlert: b.canReceiveAttendanceAlert,
        },
        include: { guardian: true },
      });

      // Keep legacy student fields synced with primary or first guardian for backwards-compatibility
      if (b.isPrimary || !student.guardianName) {
        await tx.student.update({
          where: { id_schoolId: { id: studentId, schoolId } },
          data: {
            guardianName: link.guardian.name,
            guardianPhone: link.guardian.phone,
          },
        });
      }

      await tx.auditEvent.create({
        data: {
          schoolId,
          actorId: user.id,
          action: 'STUDENT_GUARDIAN_LINKED',
          target: `${studentId}:${guardianId}`,
        },
      });

      return link;
    });
  }

  /**
   * Update student-guardian relationship and notification permissions
   */
  @Patch('students/:studentId/guardians/:guardianId')
  async updateStudentGuardianLink(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Param('studentId') studentId: string,
    @Param('guardianId') guardianId: string,
    @Body() body: unknown
  ) {
    const { user } = await this.access(req, schoolId, true);
    parse(uuid, studentId);
    parse(uuid, guardianId);
    const b = parse(updateLinkSchema, body);

    const link = await this.svc.db.studentGuardian.findFirst({
      where: { schoolId, studentId, guardianId },
    });

    if (!link) throw new NotFoundException('Guardian is not linked to this student.');

    return this.svc.atomic(async tx => {
      if (b.isPrimary) {
        await tx.studentGuardian.updateMany({
          where: { studentId, schoolId, NOT: { guardianId } },
          data: { isPrimary: false },
        });
      }

      const updated = await tx.studentGuardian.update({
        where: { id_schoolId: { id: link.id, schoolId } },
        data: {
          ...(b.relationship ? { relationship: b.relationship } : {}),
          ...(b.isPrimary !== undefined ? { isPrimary: b.isPrimary } : {}),
          ...(b.canReceiveReports !== undefined ? { canReceiveReports: b.canReceiveReports } : {}),
          ...(b.canReceiveFinanceAlert !== undefined ? { canReceiveFinanceAlert: b.canReceiveFinanceAlert } : {}),
          ...(b.canReceiveAttendanceAlert !== undefined ? { canReceiveAttendanceAlert: b.canReceiveAttendanceAlert } : {}),
        },
        include: { guardian: true },
      });

      if (b.isPrimary) {
        await tx.student.update({
          where: { id_schoolId: { id: studentId, schoolId } },
          data: {
            guardianName: updated.guardian.name,
            guardianPhone: updated.guardian.phone,
          },
        });
      }

      await tx.auditEvent.create({
        data: {
          schoolId,
          actorId: user.id,
          action: 'STUDENT_GUARDIAN_PERMISSIONS_UPDATED',
          target: `${studentId}:${guardianId}`,
        },
      });

      return updated;
    });
  }

  /**
   * Unlink a guardian from a student
   */
  @Delete('students/:studentId/guardians/:guardianId')
  async unlinkGuardianFromStudent(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Param('studentId') studentId: string,
    @Param('guardianId') guardianId: string
  ) {
    const { user } = await this.access(req, schoolId, true);
    parse(uuid, studentId);
    parse(uuid, guardianId);

    const link = await this.svc.db.studentGuardian.findFirst({
      where: { schoolId, studentId, guardianId },
    });

    if (!link) throw new NotFoundException('Guardian is not linked to this student.');

    await this.svc.atomic(async tx => {
      await tx.studentGuardian.delete({
        where: { id_schoolId: { id: link.id, schoolId } },
      });

      await tx.auditEvent.create({
        data: {
          schoolId,
          actorId: user.id,
          action: 'STUDENT_GUARDIAN_UNLINKED',
          target: `${studentId}:${guardianId}`,
        },
      });
    });

    return { message: 'Guardian unlinked successfully.' };
  }

  /**
   * Request contact verification code
   */
  @Post('guardians/:guardianId/verification/request')
  async requestVerification(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Param('guardianId') guardianId: string,
    @Body() body: unknown
  ) {
    const { user } = await this.access(req, schoolId, true);
    parse(uuid, guardianId);
    const b = parse(z.object({ channel: z.enum(['SMS', 'WHATSAPP', 'EMAIL']) }), body);

    return this.comms.requestVerification(schoolId, guardianId, b.channel as CommunicationChannel, user.id);
  }

  /**
   * Confirm verification code
   */
  @Post('guardians/:guardianId/verification/confirm')
  async confirmVerification(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Param('guardianId') guardianId: string,
    @Body() body: unknown
  ) {
    const { user } = await this.access(req, schoolId, true);
    parse(uuid, guardianId);
    const b = parse(z.object({
      channel: z.enum(['SMS', 'WHATSAPP', 'EMAIL']),
      code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit verification code.'),
    }), body);

    return this.comms.confirmVerification(schoolId, guardianId, b.channel as CommunicationChannel, b.code, user.id);
  }

  /**
   * View delivery log history for this guardian
   */
  @Get('guardians/:guardianId/history')
  async guardianCommunicationHistory(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Param('guardianId') guardianId: string,
    @Query() query: unknown
  ) {
    await this.access(req, schoolId, false);
    parse(uuid, guardianId);
    const b = parse(z.object(paging).strict(), query);

    const where: Prisma.CommunicationLogWhereInput = {
      schoolId,
      guardianId,
    };

    const [total, items] = await Promise.all([
      this.svc.db.communicationLog.count({ where }),
      this.svc.db.communicationLog.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip: (b.page - 1) * b.pageSize,
        take: b.pageSize,
      }),
    ]);

    return { items, total, page: b.page, pageSize: b.pageSize };
  }
}
