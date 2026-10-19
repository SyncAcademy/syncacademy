import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { Request } from 'express';
import { z } from 'zod';
import { PlatformService } from './platform.service';
import { studentProfile, contactFields, setSubjects, subjectIds, teacherEnrollmentScope, defaultSubjectIds, classTeacherIds, isClassTeacher } from './registry-support';

const uuid = z.string().uuid();
const name = z.string().trim().min(2).max(150);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v && v <= new Date().toISOString().slice(0, 10), 'Enter a valid birth date that is not in the future.');
const profile = studentProfile;
const readers: Role[] = ['HEADMASTER', 'REGISTRAR', 'ACADEMIC', 'TEACHER'];
const writers: Role[] = ['HEADMASTER', 'REGISTRAR'];
const parse = <S extends z.ZodTypeAny>(schema: S, input: unknown): z.output<S> => { const result = schema.safeParse(input); if (!result.success) throw new BadRequestException(result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')); return result.data; };
const key = (req: Request) => parse(uuid, req.header('Idempotency-Key'));
const paging = { page: z.coerce.number().int().min(1).max(100000).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(25), q: z.string().trim().max(150).default('') };

@Controller('api/v1/schools/:schoolId/registry')
export class RegistryController {
  constructor(private readonly svc: PlatformService) {}
  private async access(req: Request, id: string, write = false) { return this.svc.authorize(req, parse(uuid, id), write ? writers : readers); }
  private async openClass(tx: Prisma.TransactionClient, schoolId: string, id: string) {
    const c = await tx.classroom.findFirst({ where: { id, schoolId }, include: { year: true } });
    if (!c) throw new BadRequestException('Choose a class in this school.');
    return c;
  }
  private async event(tx: Prisma.TransactionClient, schoolId: string, actorId: string, yearId: string, kind: string, message: string, studentId?: string, fromClassId?: string, toClassId?: string) {
    const event = await tx.registryEvent.create({ data: { schoolId, actorId, yearId, kind, message, studentId, fromClassId, toClassId } });
    await tx.auditEvent.create({ data: { schoolId, actorId, action: 'REGISTRY_' + kind.toUpperCase(), target: studentId || event.id } });
  }
  @Get('student-subjects') async studentSubjects(@Req() req: Request, @Param('schoolId') schoolId: string, @Query() query: unknown) {
    const { user } = await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER', 'ACADEMIC', 'TEACHER']);
    const b = parse(z.object({ yearId: uuid, classroomId: uuid.optional(), ...paging }).strict(), query);
    const role = req.session.selectedRole;
    const year = await this.svc.db.academicYear.findFirst({ where: { id: b.yearId, schoolId } });
    if (!year) throw new BadRequestException('Choose an academic year in this school.');
    const assignedIds = role === 'TEACHER'
      ? (await classTeacherIds(this.svc.db, schoolId, year.id)).filter(assignment => assignment.teacherId === user.id).map(assignment => assignment.classId)
      : undefined;
    const classes = await this.svc.db.classroom.findMany({
      where: { schoolId, yearId: year.id, ...(assignedIds ? { id: { in: assignedIds } } : {}) },
      orderBy: { name: 'asc' },
      include: {
        subjects: { include: { subject: { select: { id: true, name: true, code: true } } } },
        _count: { select: { enrollments: { where: { status: 'active' } } } },
      },
    });
    const cards = classes.map(classroom => ({
      id: classroom.id,
      name: classroom.name,
      studentCount: classroom._count.enrollments,
      subjects: classroom.subjects.map(row => row.subject),
    }));
    if (!b.classroomId) return { classes: cards, year: { id: year.id, name: year.name, closed: year.closed } };
    const selectedClass = cards.find(classroom => classroom.id === b.classroomId);
    if (!selectedClass) throw new ForbiddenException('You do not manage subjects for this class.');
    const where: Prisma.EnrollmentWhereInput = { schoolId, classroomId: selectedClass.id, status: 'active',
      ...(b.q ? { student: { OR: [{ name: { contains: b.q, mode: 'insensitive' } }, { admissionNumber: { contains: b.q, mode: 'insensitive' } }] } } : {}) };
    const [total, enrollments] = await this.svc.db.$transaction([
      this.svc.db.enrollment.count({ where }),
      this.svc.db.enrollment.findMany({
      where, skip: (b.page - 1) * b.pageSize, take: b.pageSize,
      orderBy: [{ student: { name: 'asc' } }, { id: 'asc' }],
      include: { student: { select: { id: true, name: true, admissionNumber: true } }, subjects: { select: { subjectId: true } } },
    })]);
    return {
      total, page: b.page, pageSize: b.pageSize,
      classes: cards,
      year: { id: year.id, name: year.name, closed: year.closed },
      selectedClass,
      students: enrollments.map(enrollment => ({
        enrollmentId: enrollment.id,
        version: enrollment.version,
        studentId: enrollment.student.id,
        name: enrollment.student.name,
        admissionNumber: enrollment.student.admissionNumber,
        subjectIds: enrollment.subjects.map(subject => subject.subjectId),
      })),
    };
  }
  @Get('students') async students(@Req() req: Request, @Param('schoolId') schoolId: string, @Query() query: unknown) {
    const { user, memberships } = await this.access(req, schoolId);
    const b = parse(z.object({ ...paging, yearId: uuid, classId: uuid.optional(), status: z.enum(['active', 'transferred_out', 'withdrawn', 'graduated', 'unassigned']).optional() }).strict(), query);
    const manager = user.platformAdmin || memberships.some(m => writers.includes(m.role));
    const teacher = !manager && !memberships.some(m => m.role === 'ACADEMIC') && memberships.some(m => m.role === 'TEACHER');
    const teacherScope = teacher ? await teacherEnrollmentScope(this.svc.db, schoolId, user.id) : {};
    const classroom: Prisma.ClassroomWhereInput = { yearId: b.yearId, ...(b.classId ? { id: b.classId } : {}), ...(teacher ? { assignments: { some: { membership: { userId: user.id, active: true } } } } : {}) };
    const enrollment: Prisma.EnrollmentWhereInput = { ...teacherScope, schoolId, classroom, ...(!teacher && b.status && b.status !== 'unassigned' ? { status: b.status } : {}) };
    const where: Prisma.StudentWhereInput = { schoolId, ...(b.q ? { OR: [{ name: { contains: b.q, mode: 'insensitive' } }, { admissionNumber: { contains: b.q, mode: 'insensitive' } }] } : {}),
      ...(b.status === 'unassigned' && !teacher ? { enrollments: { none: { classroom: { yearId: b.yearId } } } } : b.classId || b.status || teacher ? { enrollments: { some: enrollment } } : {}) };
    const [total, items] = await this.svc.db.$transaction([
      this.svc.db.student.count({ where }),
      this.svc.db.student.findMany({ where, orderBy: [{ name: 'asc' }, { id: 'asc' }], skip: (b.page - 1) * b.pageSize, take: b.pageSize,
        select: { id: true, name: true, admissionNumber: true, gender: true, version: true, ...(manager ? { dateOfBirth: true, address: true, admissionDate: true, ownPhone: true, guardianName: true, guardianPhone: true } : {}),
          enrollments: { where: { ...teacherScope, classroom: { yearId: b.yearId, ...(teacher ? { assignments: { some: { membership: { userId: user.id, active: true } } } } : {}) } }, include: { subjects: { include: { subject: true } }, classroom: { select: { name: true, yearId: true } } } } } }),
    ]);
    return { items, total, page: b.page, pageSize: b.pageSize };
  }
  @Get('students/:studentId') async detail(@Req() req: Request, @Param('schoolId') schoolId: string, @Param('studentId') studentId: string) {
    const { user, memberships } = await this.access(req, schoolId); parse(uuid, studentId);
    const manager = user.platformAdmin || memberships.some(m => writers.includes(m.role));
    const teacher = !manager && !memberships.some(m => m.role === 'ACADEMIC') && memberships.some(m => m.role === 'TEACHER');
    const permitted: Prisma.EnrollmentWhereInput = teacher ? await teacherEnrollmentScope(this.svc.db, schoolId, user.id) : {};
    const student = await this.svc.db.student.findFirst({ where: { id: studentId, schoolId, ...(teacher ? { enrollments: { some: permitted } } : {}) }, select: { id: true, name: true, admissionNumber: true, gender: true, version: true, ...(manager ? { address: true, dateOfBirth: true, admissionDate: true, ownPhone: true, guardianName: true, guardianPhone: true, guardians: { include: { guardian: true } } } : {}), enrollments: { where: permitted, include: { subjects: { include: { subject: true } }, classroom: { include: { year: { select: { name: true } } } } }, orderBy: { createdAt: 'desc' } } } });
    if (!student) throw new BadRequestException('Student is unavailable.');
    const events = manager ? await this.svc.db.registryEvent.findMany({ where: { schoolId, studentId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 100 }) : [];
    return { ...student, events };
  }
  @Get('summary') async summary(@Req() req: Request, @Param('schoolId') schoolId: string, @Query('yearId') yearId: string) {
    const { user, memberships } = await this.access(req, schoolId); parse(uuid, yearId);
    const manager = user.platformAdmin || memberships.some(m => writers.includes(m.role));
    const teacher = memberships.some(m => m.role === 'TEACHER');
    const classWhere: Prisma.ClassroomWhereInput = { schoolId, yearId, ...(teacher ? { assignments: { some: { membership: { userId: user.id, active: true } } } } : {}) };
    const [classes, pending, unassigned, movements, events] = await Promise.all([
      this.svc.db.classroom.findMany({ where: classWhere, orderBy: { name: 'asc' }, include: { _count: { select: { enrollments: { where: { status: 'active' } } } } } }),
      manager ? this.svc.db.admission.count({ where: { schoolId, yearId, status: 'pending' } }) : 0,
      teacher ? 0 : this.svc.db.student.count({ where: { schoolId, enrollments: { none: { classroom: { yearId } } } } }),
      manager ? this.svc.db.registryEvent.count({ where: { schoolId, yearId, kind: 'movement' } }) : 0,
      manager ? this.svc.db.registryEvent.findMany({ where: { schoolId, yearId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 20 }) : [],
    ]);
    return { classes, active: classes.reduce((n, c) => n + c._count.enrollments, 0), pending, unassigned, movements, events, canManage: manager };
  }
  @Post('students') async create(@Req() req: Request, @Param('schoolId') schoolId: string, @Body() body: unknown) {
    const { user } = await this.access(req, schoolId, true);
    const b = parse(z.object({ ...profile, classroomId: uuid, subjectIds: subjectIds.default([]) }).strict(), body);
    return this.svc.idempotent(`${user.id}:registry-create:${schoolId}`, key(req), b, async tx => {
      const c = await this.openClass(tx, schoolId, b.classroomId);
      const { classroomId, subjectIds: selectedSubjects, ...p } = b;
      const student = await tx.student.create({ data: { ...p, schoolId, dateOfBirth: b.dateOfBirth ? new Date(b.dateOfBirth) : null, admissionDate: b.admissionDate ? new Date(b.admissionDate) : null } });
      const enrollment = await tx.enrollment.create({ data: { schoolId, studentId: student.id, classroomId } });
      await setSubjects(tx, schoolId, enrollment.id, classroomId, await defaultSubjectIds(tx, schoolId, classroomId, selectedSubjects));
      await this.event(tx, schoolId, user.id, c.yearId, 'registration', `${student.name} registered in ${c.name}.`, student.id, undefined, c.id);
      return student;
    });
  }
  @Patch('students/:studentId') async edit(@Req() req: Request, @Param('schoolId') schoolId: string, @Param('studentId') studentId: string, @Body() body: unknown) {
    const { user } = await this.access(req, schoolId, true); parse(uuid, studentId);
    const b = parse(z.object({ ...profile, version: z.number().int().positive(), yearId: uuid }).strict(), body);
    return this.svc.idempotent(`${user.id}:registry-edit:${schoolId}:${studentId}`, key(req), b, async tx => {
      if (!await tx.academicYear.findFirst({ where: { id: b.yearId, schoolId } })) throw new BadRequestException('Choose an academic year.');
      const { yearId, version, ...p } = b;
      const result = await tx.student.updateMany({ where: { id: studentId, schoolId, version }, data: { ...p, dateOfBirth: b.dateOfBirth ? new Date(b.dateOfBirth) : null, admissionDate: b.admissionDate ? new Date(b.admissionDate) : null, version: { increment: 1 } } });
      if (!result.count) throw new ConflictException('Student details changed. Refresh and reopen the profile before saving.');
      await this.event(tx, schoolId, user.id, yearId, 'profile', `${b.name}: student details updated.`, studentId);
      return { message: 'Student profile saved.' };
    });
  }
  @Post('enrollments') async enroll(@Req() req: Request, @Param('schoolId') schoolId: string, @Body() body: unknown) {
    const { user } = await this.access(req, schoolId, true);
    const b = parse(z.object({ studentId: uuid, classroomId: uuid, subjectIds: subjectIds.default([]) }).strict(), body);
    return this.svc.idempotent(`${user.id}:registry-enroll:${schoolId}`, key(req), b, async tx => {
      const c = await this.openClass(tx, schoolId, b.classroomId);
      const student = await tx.student.findFirst({ where: { id: b.studentId, schoolId } });
      if (!student) throw new BadRequestException('Choose a student in this school.');
      if (await tx.enrollment.findFirst({ where: { schoolId, studentId: b.studentId, classroom: { yearId: c.yearId } } })) throw new ConflictException('This student already has an enrollment in this year. Use student movement to change it.');
      const enrollment = await tx.enrollment.create({ data: { studentId: b.studentId, classroomId: b.classroomId, schoolId } });
      await setSubjects(tx, schoolId, enrollment.id, c.id, await defaultSubjectIds(tx, schoolId, c.id, b.subjectIds));
      await this.event(tx, schoolId, user.id, c.yearId, 'enrollment', `${student.name} enrolled in ${c.name}.`, student.id, undefined, c.id);
      return enrollment;
    });
  }
  @Post('movements') async move(@Req() req: Request, @Param('schoolId') schoolId: string, @Body() body: unknown) {
    const { user } = await this.access(req, schoolId, true);
    const b = parse(z.object({ enrollmentId: uuid, version: z.number().int().positive(), action: z.enum(['class_change', 'transferred_out', 'withdrawn', 'graduated', 'reactivate']), classroomId: uuid.optional(), subjectIds: subjectIds.default([]), reason: z.string().trim().min(5).max(500) }).strict(), body);
    return this.svc.idempotent(`${user.id}:registry-move:${schoolId}`, key(req), b, async tx => {
      const e = await tx.enrollment.findFirst({ where: { id: b.enrollmentId, schoolId }, include: { classroom: { include: { year: true } }, student: true } });
      if (!e || e.version !== b.version) throw new ConflictException('Enrollment changed. Refresh and try again.');
      if (b.action === 'reactivate' ? e.status === 'active' : e.status !== 'active') throw new ConflictException('This action does not match the current enrollment status.');
      let target = e.classroom;
      if (b.action === 'class_change') {
        if (!b.classroomId) throw new BadRequestException('Choose the destination class.');
        target = await this.openClass(tx, schoolId, b.classroomId);
        if (target.yearId !== e.classroom.yearId || target.id === e.classroomId) throw new BadRequestException('Choose a different class in the same academic year.');
      }
      if (b.action === 'class_change') await setSubjects(tx, schoolId, e.id, target.id, await defaultSubjectIds(tx, schoolId, target.id, b.subjectIds));
      await tx.teachingAssignment.updateMany({ where: { schoolId, classroomId: { in: [e.classroomId, target.id] } }, data: { confirmedAt: null } });
      const status = ['class_change', 'reactivate'].includes(b.action) ? 'active' : b.action;
      await tx.enrollment.update({ where: { id: e.id }, data: { classroomId: target.id, status, version: { increment: 1 } } });
      await this.event(tx, schoolId, user.id, target.yearId, 'movement', `${e.student.name}: ${b.action.replaceAll('_', ' ')} (${e.classroom.name}${target.id !== e.classroomId ? ' ? ' + target.name : ''}). ${b.reason}`, e.studentId, e.classroomId, target.id);
      return { message: 'Student movement saved.' };
    });
  }
  @Get('admissions') async admissions(@Req() req: Request, @Param('schoolId') schoolId: string, @Query() query: unknown) {
    await this.access(req, schoolId, true);
    const b = parse(z.object({ ...paging, yearId: uuid, status: z.enum(['pending', 'accepted', 'rejected']).optional() }).strict(), query);
    const where: Prisma.AdmissionWhereInput = { schoolId, yearId: b.yearId, ...(b.status ? { status: b.status } : {}), ...(b.q ? { name: { contains: b.q, mode: 'insensitive' } } : {}) };
    const [total, items] = await this.svc.db.$transaction([this.svc.db.admission.count({ where }), this.svc.db.admission.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (b.page - 1) * b.pageSize, take: b.pageSize })]);
    return { total, items };
  }
  @Post('admissions') async apply(@Req() req: Request, @Param('schoolId') schoolId: string, @Body() body: unknown) {
    const { user } = await this.access(req, schoolId, true);
    const b = parse(z.object({ ...contactFields, name, gender: profile.gender, dateOfBirth: profile.dateOfBirth, address: profile.address, requestedClassId: uuid }).strict(), body);
    return this.svc.idempotent(`${user.id}:registry-apply:${schoolId}`, key(req), b, async tx => {
      const c = await this.openClass(tx, schoolId, b.requestedClassId);
      if (await tx.admission.findFirst({ where: { schoolId, yearId: c.yearId, name: { equals: b.name, mode: 'insensitive' }, dateOfBirth: b.dateOfBirth ? new Date(b.dateOfBirth) : null, status: { in: ['pending', 'accepted'] } } })) throw new ConflictException('An application with this name and birth date already exists in this year.');
      const admission = await tx.admission.create({ data: { ...b, schoolId, yearId: c.yearId, dateOfBirth: b.dateOfBirth ? new Date(b.dateOfBirth) : null, admissionDate: b.admissionDate ? new Date(b.admissionDate) : null } });
      await this.event(tx, schoolId, user.id, c.yearId, 'admission', `${b.name}: application received for ${c.name}.`);
      return admission;
    });
  }
  @Post('admissions/:admissionId/decision') async decide(@Req() req: Request, @Param('schoolId') schoolId: string, @Param('admissionId') admissionId: string, @Body() body: unknown) {
    const { user } = await this.access(req, schoolId, true); parse(uuid, admissionId);
    const b = parse(z.object({ decision: z.enum(['accepted', 'rejected']), classroomId: uuid.optional(), admissionNumber: profile.admissionNumber.optional(), subjectIds: subjectIds.default([]), note: z.string().trim().max(500).default('') }).strict(), body);
    return this.svc.idempotent(`${user.id}:registry-decide:${schoolId}:${admissionId}`, key(req), b, async tx => {
      const a = await tx.admission.findFirst({ where: { id: admissionId, schoolId, status: 'pending' } });
      if (!a) throw new ConflictException('This application has already been reviewed or is unavailable.');
      if (!await tx.academicYear.findFirst({ where: { id: a.yearId, schoolId } })) throw new BadRequestException('Academic year not found.');
      let studentId: string | undefined;
      if (b.decision === 'accepted') {
        if (!b.classroomId || !b.admissionNumber) throw new BadRequestException('Enter a student number and choose a class.');
        const c = await this.openClass(tx, schoolId, b.classroomId);
        if (c.yearId !== a.yearId) throw new BadRequestException('Choose a class in the application year.');
        const s = await tx.student.create({ data: { schoolId, name: a.name, admissionNumber: b.admissionNumber, gender: a.gender, dateOfBirth: a.dateOfBirth, admissionDate: a.admissionDate, ownPhone: a.ownPhone, guardianName: a.guardianName, guardianPhone: a.guardianPhone, address: a.address } });
        studentId = s.id;
        const enrollment = await tx.enrollment.create({ data: { schoolId, studentId, classroomId: c.id } });
        await setSubjects(tx, schoolId, enrollment.id, c.id, await defaultSubjectIds(tx, schoolId, c.id, b.subjectIds));
      } else if (b.note.length < 5) throw new BadRequestException('Record a reason for rejecting the application.');
      await tx.admission.update({ where: { id: a.id }, data: { status: b.decision, note: b.note, studentId, decidedAt: new Date() } });
      await this.event(tx, schoolId, user.id, a.yearId, 'admission', `${a.name}: application ${b.decision}. ${b.note}`, studentId);
      return { message: 'Admission decision saved.', studentId };
    });
  }
  @Post('progression') async progress(@Req() req: Request, @Param('schoolId') schoolId: string, @Body() body: unknown) {
    const { user } = await this.access(req, schoolId, true);
    const b = parse(z.object({ studentIds: z.array(uuid).min(1).max(100).refine(ids => new Set(ids).size === ids.length), sourceYearId: uuid, classroomId: uuid, subjectIds: subjectIds.default([]) }).strict(), body);
    return this.svc.idempotent(`${user.id}:registry-progress:${schoolId}`, key(req), b, async tx => {
      const target = await this.openClass(tx, schoolId, b.classroomId);
      const source = await tx.academicYear.findFirst({ where: { id: b.sourceYearId, schoolId } });
      if (!source || target.year.startsAt <= source.startsAt) throw new BadRequestException('Choose a later, open academic year.');
      const enrollments = await tx.enrollment.findMany({ where: { schoolId, studentId: { in: b.studentIds }, status: 'active', classroom: { yearId: source.id } }, include: { student: true } });
      if (new Set(enrollments.map(e => e.studentId)).size !== b.studentIds.length) throw new ConflictException('Every selected student must have an active source-year enrollment.');
      if (await tx.enrollment.findFirst({ where: { schoolId, studentId: { in: b.studentIds }, classroom: { yearId: target.yearId } } })) throw new ConflictException('One or more selected students already have an enrollment in the target year. No records were changed.');
      for (const studentId of b.studentIds) {
        const e = enrollments.find(e => e.studentId === studentId)!;
        const next = await tx.enrollment.create({ data: { schoolId, studentId, classroomId: target.id } });
        await setSubjects(tx, schoolId, next.id, target.id, await defaultSubjectIds(tx, schoolId, target.id, b.subjectIds));
        await this.event(tx, schoolId, user.id, target.yearId, 'progression', `${e.student.name} progressed from ${source.name} to ${target.name}.`, studentId, e.classroomId, target.id);
      }
      return { count: b.studentIds.length };
    });
  }
  @Get('events') async events(@Req() req: Request, @Param('schoolId') schoolId: string, @Query() query: unknown) {
    await this.access(req, schoolId, true);
    const b = parse(z.object({ ...paging, yearId: uuid, kind: z.enum(['movement']).optional() }).strict(), query);
    const where = { schoolId, yearId: b.yearId, ...(b.kind ? { kind: b.kind } : {}), ...(b.q ? { message: { contains: b.q, mode: 'insensitive' as const } } : {}) };
    const [total, items] = await this.svc.db.$transaction([this.svc.db.registryEvent.count({ where }), this.svc.db.registryEvent.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (b.page - 1) * b.pageSize, take: b.pageSize })]);
    return { items, total };
  }
}
