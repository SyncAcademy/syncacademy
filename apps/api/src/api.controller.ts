import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { PlatformService } from './platform.service';

const email = z.string().trim().email().max(254).transform(v => v.toLowerCase());
const name = z.string().trim().min(2).max(150);
const password = z.string().min(15).max(128);
const token = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const loginRole = z.enum(['SUPER_ADMIN', 'HEADMASTER', 'REGISTRAR', 'ACADEMIC', 'TEACHER', 'BURSAR']);
const schoolRole = z.enum(['HEADMASTER', 'REGISTRAR', 'ACADEMIC', 'TEACHER', 'BURSAR']);
const invitationExpiryOptions = [5, 15, 30, 60, 240, 720, 1440, 2880, 10080] as const;
const invitationExpiry = z.coerce.number().int().refine(value => invitationExpiryOptions.some(option => option === value), 'Choose a supported invitation expiry.');
const uuid = z.string().uuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v);
const parse = <S extends z.ZodTypeAny>(schema: S, input: unknown): z.output<S> => { const r = schema.safeParse(input); if (!r.success) throw new BadRequestException(r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')); return r.data; };
const key = (req: Request) => parse(uuid, req.header('Idempotency-Key'));
const schoolId = (id: string) => parse(uuid, id);
const managers: Role[] = ['HEADMASTER'];
const registrars: Role[] = ['HEADMASTER', 'REGISTRAR'];
const academics: Role[] = ['HEADMASTER', 'ACADEMIC'];
@Controller('api/v1')
export class ApiController {
  constructor(private readonly svc: PlatformService) {}
  @Get('health/live') live() { return { status: 'ok' }; }
  @Get('health/ready') async ready() { await this.svc.db.$queryRaw`SELECT 1`; return { status: 'ready' }; }
  @Get('platform/summary') async platformSummary(@Req() req: Request) {
    await this.svc.administrator(req);
    const [schools, activeSchools, students, staff, pendingInvitations, admins] = await this.svc.db.$transaction([
      this.svc.db.school.count(), this.svc.db.school.count({ where: { active: true } }), this.svc.db.student.count(),
      this.svc.db.membership.count({ where: { active: true, role: { notIn: ['STUDENT', 'PARENT'] } } }),
      this.svc.db.invitation.count({ where: { acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } } }),
      this.svc.db.user.findMany({ where: { platformAdmin: true }, select: { id: true, name: true, email: true, enabled: true }, orderBy: { createdAt: 'asc' } }),
    ]);
    return { schools, activeSchools, students, staff, pendingInvitations, admins };
  }
  @Get('platform/invitations') async platformInvitations(@Req() req: Request) {
    await this.svc.administrator(req);
    const invitations = await this.svc.db.invitation.findMany({ where: { platformAdmin: true, schoolId: null }, select: { id: true, name: true, email: true, expiresInMinutes: true, createdAt: true, expiresAt: true, acceptedAt: true, revokedAt: true }, orderBy: { createdAt: 'desc' }, take: 100 });
    return invitations.map(invitation => ({ ...invitation, role: 'SUPER_ADMIN' }));
  }
  @Post('platform/invitations') async invitePlatformAdmin(@Req() req: Request, @Body() body: unknown) {
    const actor = await this.svc.administrator(req);
    await this.svc.rate('platform-invite-create:' + actor.id, 20, 3600);
    const invitation = parse(z.object({ name, email, expiresInMinutes: invitationExpiry.default(2880) }).strict(), body);
    return this.svc.idempotent(actor.id + ':platform-invitation', key(req), invitation, tx => this.svc.createPlatformInvitation(tx, actor.id, invitation));
  }
  @Post('platform/invitations/:invitationId/:action') async managePlatformInvitation(@Req() req: Request, @Param('invitationId') invitationId: string, @Param('action') action: string) {
    const actor = await this.svc.administrator(req); parse(uuid, invitationId); parse(z.enum(['resend', 'revoke']), action);
    await this.svc.rate('platform-invite-manage:' + actor.id, 30, 3600);
    const { randomToken, digest } = await import('./security');
    return this.svc.atomic(async tx => {
      const invitation = await tx.invitation.findFirst({ where: { id: invitationId, platformAdmin: true, schoolId: null, acceptedAt: null, revokedAt: null } });
      if (!invitation) throw new ForbiddenException('Platform invitation is unavailable.');
      await tx.outbox.updateMany({ where: { invitationId, sentAt: null, cancelledAt: null }, data: { cancelledAt: new Date(), payload: '' } });
      const token = randomToken();
      const updated = await tx.invitation.update({ where: { id: invitationId }, data: action === 'revoke' ? { revokedAt: new Date() } : { tokenHash: digest(token), expiresAt: new Date(Date.now() + invitation.expiresInMinutes * 60000), generation: { increment: 1 } } });
      if (action === 'resend') await this.svc.invitationMail(tx, updated, token);
      await tx.auditEvent.create({ data: { actorId: actor.id, action: 'PLATFORM_INVITATION_' + action.toUpperCase(), target: invitationId } });
      return { message: action === 'resend' ? 'New platform invitation queued. Previous link is invalid.' : 'Platform invitation revoked.' };
    });
  }
  @Post('auth/login') login(@Req() req: Request, @Body() body: unknown) { return this.svc.login(req, parse(z.object({ email, password: z.string().min(1).max(128), role: loginRole, rememberMe: z.boolean().default(false) }).strict(), body)); }
  @Get('auth/me') me(@Req() req: Request) { return this.svc.me(req); }
  @Post('auth/logout') async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) { const result = await this.svc.logout(req); res.clearCookie('sa.sid', { path: '/' }); return result; }
  @Post('auth/change-password') change(@Req() req: Request, @Body() body: unknown) { const b = parse(z.object({ currentPassword: z.string().min(1).max(128), password }).strict(), body); return this.svc.changePassword(req, b.currentPassword, b.password); }
  @Post('auth/mfa/setup') setup(@Req() req: Request) { return this.svc.setupMfa(req); }
  @Post('auth/mfa/verify') mfa(@Req() req: Request, @Body() body: unknown) { const b = parse(z.object({ code: z.string().regex(/^\d{6}$/), setup: z.boolean().default(false) }).strict(), body); return this.svc.verifyMfa(req, b.code, b.setup); }
  @Post('auth/mfa/recovery') recoveryCode(@Req() req: Request, @Body() body: unknown) { return this.svc.recoverMfa(req, parse(z.object({ code: z.string().min(20).max(20) }).strict(), body).code); }
  @Post('auth/recover') recover(@Req() req: Request, @Body() body: unknown) { return this.svc.recover(req, parse(z.object({ email }).strict(), body).email); }
  @Post('auth/reset') reset(@Req() req: Request, @Body() body: unknown) { const b = parse(z.object({ token, password }).strict(), body); return this.svc.reset(req, b.token, b.password); }
  @Post('invitations/preview') preview(@Req() req: Request, @Body() body: unknown) { return this.svc.invitationInfo(req, parse(z.object({ token }).strict(), body).token); }
  @Post('invitations/accept') accept(@Req() req: Request, @Body() body: unknown) { const b = parse(z.object({ token, password: z.string().min(1).max(128).optional() }).strict(), body); return this.svc.accept(req, b.token, b.password); }
  @Get('schools') async schools(@Req() req: Request, @Query('page') page?: string) {
    await this.svc.administrator(req); const skip = (parse(z.coerce.number().int().min(1).max(100000).default(1), page) - 1) * 25;
    const [items, total] = await this.svc.db.$transaction([this.svc.db.school.findMany({ skip, take: 25, orderBy: { createdAt: 'desc' }, include: { _count: { select: { memberships: {where:{role:{notIn:['STUDENT','PARENT']}}}, students: true } } } }), this.svc.db.school.count()]);
    return { items, total };
  }
  @Post('schools') async createSchool(@Req() req: Request, @Body() body: unknown) {
    const actor = await this.svc.administrator(req);
    const b = parse(z.object({ name, code: z.string().trim().regex(/^[A-Za-z0-9-]{2,30}$/).transform(v => v.toUpperCase()), region: name, headmasterName: name, headmasterEmail: email, headmasterExpiresInMinutes: invitationExpiry.default(2880) }).strict(), body);
    return this.svc.idempotent(actor.id + ':school', key(req), b, async tx => {
      const school = await tx.school.create({ data: { name: b.name, code: b.code, region: b.region } });
      const invitation = await this.svc.createInvitation(tx, actor.id, school.id, { name: b.headmasterName, email: b.headmasterEmail, role: 'HEADMASTER', expiresInMinutes: b.headmasterExpiresInMinutes });
      await tx.auditEvent.create({ data: { actorId: actor.id, schoolId: school.id, action: 'SCHOOL_CREATED', target: school.id } });
      return { school, invitation };
    });
  }
  @Patch('schools/:id') async schoolStatus(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    const actor = await this.svc.administrator(req); schoolId(id); const b = parse(z.object({ active: z.boolean(), reason: z.string().trim().min(5).max(500) }).strict(), body);
    return this.svc.atomic(async tx => {
      const school = await tx.school.update({ where: { id }, data: { active: b.active } });
      await tx.auditEvent.create({ data: { actorId: actor.id, schoolId: id, action: b.active ? 'SCHOOL_REACTIVATED' : 'SCHOOL_SUSPENDED', target: id + ': ' + b.reason } }); return school;
    });
  }
  @Get('schools/:id/workspace') async workspace(@Req() req: Request, @Param('id') id: string) {
    const { user, memberships } = await this.svc.authorize(req, schoolId(id));
    const roles = memberships.map(m => m.role); const staffManager = user.platformAdmin || roles.includes('HEADMASTER');
    const registrar = staffManager || roles.includes('REGISTRAR'); const academic = staffManager || roles.includes('ACADEMIC');
    const teacher = roles.includes('TEACHER');
    const classroomWhere = { schoolId: id, ...(!registrar && !academic ? { OR: [ ...(teacher ? [{ assignments: { some: { membership: { userId: user.id, active: true } } } }] : []), { enrollments: { some: { student: { userId: user.id } } } }] } : {}) };
    const studentWhere = { schoolId: id, ...(!registrar && !academic ? { OR: [{ userId: user.id }, ...(teacher ? [{ enrollments: { some: { classroom: { assignments: { some: { membership: { userId: user.id, active: true } } } } } } }] : [])] } : {}) };
    const [school, years, classes, students, studentCount, members, invitations, assignments] = await Promise.all([
      this.svc.db.school.findUnique({ where: { id }, select: { id: true, name: true, code: true, region: true } }),
      this.svc.db.academicYear.findMany({ where: { schoolId: id, ...(!registrar && !academic ? { classes: { some: classroomWhere } } : {}) }, orderBy: { startsAt: 'desc' }, take: 100 }),
      this.svc.db.classroom.findMany({ where: classroomWhere, include: { year: { select: { name: true, closed: true } }, _count: { select: { enrollments: true } } }, orderBy: { name: 'asc' }, take: 100 }),
      this.svc.db.student.findMany({ where: studentWhere, select: { id: true, name: true, admissionNumber: true, dateOfBirth: registrar ? true : false, gender: true, address: registrar ? true : false, userId: true, enrollments: { select: { id: true, classroomId: true, createdAt: true, classroom: { select: { name: true, yearId: true, year: { select: { name: true } } } } } } }, orderBy: { createdAt: 'desc' }, take: 100 }),
      this.svc.db.student.count({ where: studentWhere }),
      staffManager || academic ? this.svc.db.membership.findMany({ where: { schoolId: id }, select: { id: true, role: true, active: true, createdAt: true, user: { select: { id: true, name: true, email: true } } }, take: 100, orderBy: { createdAt: 'desc' } }) : [],
      staffManager || academic ? this.svc.db.invitation.findMany({ where: { schoolId: id, ...(staffManager ? {} : { role: 'TEACHER' }) }, select: { id: true, name: true, email: true, role: true, createdAt: true, expiresAt: true, expiresInMinutes: true, acceptedAt: true, revokedAt: true }, orderBy: { createdAt: 'desc' }, take: 100 }) : [],
      staffManager || academic || teacher ? this.svc.db.teachingAssignment.findMany({ where: { schoolId: id, ...(!staffManager && !academic ? { membership: { userId: user.id, active: true } } : {}) }, select: { id: true, classroomId: true, membershipId: true, membership: { select: { active: true, user: { select: { id: true, name: true } } } }, classroom: { select: { name: true, yearId: true, year: { select: { name: true } }, _count: { select: { enrollments: true } } } } }, take: 100 }) : [],
    ]);
    const audit = staffManager ? await this.svc.db.auditEvent.findMany({ where: {schoolId:id}, orderBy:{createdAt:'desc'},take:100 }) : [];
    return { school, years, classes, students, studentCount, members, invitations, assignments, audit, permissions: { staffManager, registrar, academic } };
  }
  @Post('schools/:id/invitations') async invite(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    const { user, memberships } = await this.svc.authorize(req, schoolId(id));
    const manager = user.platformAdmin || memberships.some(m => m.role === 'HEADMASTER');
    const academic = memberships.some(m => m.role === 'ACADEMIC');
    if (!manager && !academic) throw new ForbiddenException('You cannot invite school users.');
    await this.svc.rate('invite-create:' + user.id, 50, 3600);
    const b = parse(z.object({ name, email, role: schoolRole, expiresInMinutes: invitationExpiry.default(2880) }).strict(), body);
    if (academic && !manager && b.role !== 'TEACHER') throw new ForbiddenException('Academic Masters can invite teachers only.');
    if (b.role === 'HEADMASTER' && !user.platformAdmin) throw new ForbiddenException('Only platform administrators assign Headmasters.');
    return this.svc.idempotent(user.id + ':invite:' + id, key(req), b, async tx => {
      return this.svc.createInvitation(tx, user.id, id, b);
    });
  }
  @Post('schools/:id/invitations/:invitationId/:action') async manageInvite(@Req() req: Request, @Param('id') id: string, @Param('invitationId') invitationId: string, @Param('action') action: string) {
    const { user } = await this.svc.authorize(req, schoolId(id), managers); parse(uuid, invitationId); parse(z.enum(['resend','revoke']), action);
    await this.svc.rate('invite-manage:' + user.id, 20, 3600);
    const { randomToken, digest } = await import('./security');
    return this.svc.atomic(async tx => {
      const invitation = await tx.invitation.findFirst({ where: { id: invitationId, schoolId: id, acceptedAt: null, revokedAt: null } });
      if (!invitation || (invitation.role === 'HEADMASTER' && !user.platformAdmin)) throw new ForbiddenException('Invitation is unavailable.');
      await tx.outbox.updateMany({ where: { invitationId, sentAt: null, cancelledAt: null }, data: { cancelledAt: new Date(), payload: '' } });
      const token = randomToken();
      const updated = await tx.invitation.update({ where: { id: invitationId }, data: action === 'revoke' ? { revokedAt: new Date() } : { tokenHash: digest(token), expiresAt: new Date(Date.now() + invitation.expiresInMinutes * 60000), generation: { increment: 1 } } });
      if (action === 'resend') await this.svc.invitationMail(tx, updated, token);
      await tx.auditEvent.create({ data: { actorId: user.id, schoolId: id, action: 'INVITATION_' + action.toUpperCase(), target: invitationId } }); return { message: action === 'resend' ? 'New invitation queued. Previous link is invalid.' : 'Invitation revoked.' };
    });
  }
  @Patch('schools/:id/members/:membershipId') async member(@Req() req: Request, @Param('id') id: string, @Param('membershipId') membershipId: string, @Body() body: unknown) {
    const { user } = await this.svc.authorize(req, schoolId(id), managers); parse(uuid, membershipId); const b = parse(z.object({ active: z.boolean() }).strict(), body);
    return this.svc.atomic(async tx => {
      const member = await tx.membership.findFirst({ where: { id: membershipId, schoolId: id } });
      if (!member || member.userId === user.id || (member.role === 'HEADMASTER' && !user.platformAdmin)) throw new ForbiddenException('You cannot change this membership.');
      await tx.membership.update({ where: { id: member.id }, data: { active: b.active } });
      await tx.user.update({ where: { id: member.userId }, data: { sessionVersion: { increment: 1 } } });
      await tx.auditEvent.create({ data: { actorId: user.id, schoolId: id, action: b.active ? 'MEMBER_REACTIVATED' : 'MEMBER_SUSPENDED', target: member.id } }); return { message: 'Access updated. Existing sessions revoked.' };
    });
  }
  @Post('schools/:id/years') async year(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    const { user } = await this.svc.authorize(req, schoolId(id), academics);
    const b = parse(z.object({ name, startsAt: date, endsAt: date }).strict().refine(v => v.endsAt > v.startsAt, 'End date must follow start date.'), body);
    return this.svc.idempotent(user.id + ':year:' + id, key(req), b, tx => tx.academicYear.create({ data: { schoolId: id, name: b.name, startsAt: new Date(b.startsAt), endsAt: new Date(b.endsAt) } }));
  }
  @Post('schools/:id/classes') async classroom(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    const { user } = await this.svc.authorize(req, schoolId(id), academics); const b = parse(z.object({ name, yearId: uuid }).strict(), body);
    return this.svc.idempotent(user.id + ':class:' + id, key(req), b, async tx => {
      if (!await tx.academicYear.findFirst({ where: { id: b.yearId, schoolId: id, closed: false } })) throw new BadRequestException('Select an open academic year.');
      return tx.classroom.create({ data: { ...b, schoolId: id } });
    });
  }
  @Post('schools/:id/assignments') async assignment(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    const { user } = await this.svc.authorize(req, schoolId(id), academics); const b = parse(z.object({ membershipId: uuid, classroomId: uuid }).strict(), body);
    return this.svc.idempotent(user.id + ':assignment:' + id, key(req), b, async tx => {
      if (!await tx.membership.findFirst({ where: { id: b.membershipId, schoolId: id, role: 'TEACHER', active: true } }) || !await tx.classroom.findFirst({ where: { id: b.classroomId, schoolId: id, year: { closed: false } } })) throw new BadRequestException('Choose an active teacher and an open class in this school.');
      const assignment = await tx.teachingAssignment.create({ data: { ...b, schoolId: id } });
      await tx.auditEvent.create({ data: { actorId: user.id, schoolId: id, action: 'TEACHER_ASSIGNED', target: assignment.id } }); return assignment;
    });
  }
  @Post('schools/:id/students') async student(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    const { user } = await this.svc.authorize(req, schoolId(id), registrars);
    const b = parse(z.object({ name, admissionNumber: z.string().trim().min(1).max(40), classroomId: uuid, dateOfBirth: date.optional(), gender: z.enum(['M','F']).optional(), address: z.string().trim().max(500).optional() }).strict().refine(v => !v.dateOfBirth || v.dateOfBirth <= new Date().toISOString().slice(0,10), 'Date of birth cannot be in the future.'), body);
    return this.svc.idempotent(user.id + ':student:' + id, key(req), b, async tx => {
      if (!await tx.classroom.findFirst({ where: { id: b.classroomId, schoolId: id, year: { closed: false } } })) throw new BadRequestException('Select a class in an open academic year.');
      const student = await tx.student.create({ data: { schoolId: id, name: b.name, admissionNumber: b.admissionNumber, gender: b.gender, address: b.address, dateOfBirth: b.dateOfBirth ? new Date(b.dateOfBirth) : undefined } });
      await tx.enrollment.create({ data: { schoolId: id, studentId: student.id, classroomId: b.classroomId } });
      await tx.auditEvent.create({ data: { actorId: user.id, schoolId: id, action: 'STUDENT_ENROLLED', target: student.id } }); return student;
    });
  }
  @Get('audit') async audit(@Req() req: Request, @Query('schoolId') id?: string) {
    if (id) await this.svc.authorize(req, schoolId(id), managers); else await this.svc.administrator(req);
    return this.svc.db.auditEvent.findMany({ where: id ? { schoolId: id } : {}, orderBy: { createdAt: 'desc' }, take: 100 });
  }
}
