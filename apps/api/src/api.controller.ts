import { teacherEnrollmentScope, validateSubjects } from './registry-support';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma, Role } from '@prisma/client';
import { z } from 'zod';
import { PlatformService } from './platform.service';
import { PublicFormProtectionService } from './public-form-protection.service';
import { buildContactInquiryEmail, escapeHtml } from './communication/email/email-templates';
import { encrypt } from './security';
import { config } from './config';
import { AuditCategory, AuditLogService, AuditSource, auditCategories } from './audit-log.service';
import { termsForYear, termsInput, validateTerms } from './academic-terms';

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
const leadFields = z.object({ schoolName: name, contactName: name, contactEmail: email,
  contactPhone: z.string().trim().max(40).default(''), location: name,
  source: z.enum(['website', 'website-demo-request', 'referral', 'social', 'event', 'cold-outreach', 'friend-relative', 'other']),
  status: z.enum(['new', 'contacted', 'demo-scheduled', 'demo-done', 'negotiation', 'won', 'lost']),
  studentCount: z.coerce.number().int().min(0).max(1000000),
  notes: z.string().trim().max(2000).default(''), owner: z.string().trim().max(150).default(''),
  followUp: z.union([date, z.literal('')]).default(''),
  region: z.string().trim().max(150).default(''), schoolType: z.string().trim().max(40).default(''), schoolWebsite: z.string().trim().max(300).default(''), applicantPosition: z.string().trim().max(150).default(''),
  headmasterName: z.string().trim().max(150).default(''), headmasterEmail: z.union([email, z.literal('')]).default(''), headmasterPhone: z.string().trim().max(40).default(''),
  preferredDemoMethod: z.string().trim().max(40).default(''), requestMessage: z.string().trim().max(2000).default('') }).strict();
const demoFields = z.object({ schoolName: name, schoolType: z.enum(['Primary', 'Secondary', 'Combined']), location: name, region: name,
  studentCount: z.number().int().min(0).max(1000000).optional(), schoolWebsite: z.union([z.literal(''), z.string().trim().url().max(300).refine(value => /^https?:\/\//i.test(value), 'Use an http or https website address.')]).default(''),
  contactName: name, applicantPosition: name, contactEmail: email, contactPhone: z.string().trim().min(7).max(40).regex(/^\+?[0-9() .-]+$/),
  headmasterName: name, headmasterEmail: email, headmasterPhone: z.union([z.literal(''), z.string().trim().min(7).max(40).regex(/^\+?[0-9() .-]+$/)]).default(''),
  preferredDemoMethod: z.enum(['', 'Online Demo', 'On-Site Demo']).default(''), requestMessage: z.string().trim().max(2000).default(''),
  consent: z.literal(true), websiteField: z.literal('').default('') }).strict();
const listPage = z.coerce.number().int().min(1).max(100000).default(1);
const listSize = z.coerce.number().int().min(1).max(100).default(25);
const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().refine(value => [10, 20, 50, 100].includes(value), 'Choose a page size of 10, 20, 50, or 100.').default(20),
  q: z.string().trim().max(200).default(''),
  actor: z.string().trim().max(200).default(''),
  schoolId: uuid.optional(),
  category: z.enum(auditCategories).optional(),
  action: z.string().trim().max(100).default(''),
  outcome: z.enum(['SUCCESS', 'FAILED', 'DENIED', 'UNAVAILABLE']).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  from: date.optional(),
  to: date.optional(),
}).strict().refine(value => !value.from || !value.to || value.from <= value.to, {
  message: 'The end date must be on or after the start date.',
  path: ['to'],
});
@Controller('api/v1')
export class ApiController {
  constructor(private readonly svc: PlatformService, private readonly auditLog: AuditLogService, private readonly publicForms: PublicFormProtectionService) {}
  @Get('health/live') live() { return { status: 'ok' }; }
  @Get('health/ready') async ready() { await this.svc.db.$queryRaw`SELECT 1`; return { status: 'ready' }; }
  @Get('platform/summary') async platformSummary(@Req() req: Request) {
    await this.svc.administrator(req);
    const [schools, activeSchools, students, staff, pendingInvitations, admins, newLeads] = await this.svc.db.$transaction([
      this.svc.db.school.count(), this.svc.db.school.count({ where: { active: true } }), this.svc.db.student.count(),
      this.svc.db.membership.count({ where: { active: true, role: { notIn: ['STUDENT', 'PARENT'] } } }),
      this.svc.db.invitation.count({ where: { acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } } }),
      this.svc.db.user.findMany({ where: { platformAdmin: true }, select: { id: true, name: true, email: true, enabled: true }, orderBy: { createdAt: 'asc' } }),
      this.svc.db.platformLead.count({ where: { status: 'new' } }),
    ]);
    return { schools, activeSchools, students, staff, pendingInvitations, admins, newLeads };
  }
  @Get('platform/leads') async platformLeads(@Req() req: Request, @Query() query: unknown) {
    await this.svc.administrator(req);
    const q = parse(z.object({ page: listPage, pageSize: listSize, q: z.string().trim().max(200).default(''), status: z.string().max(40).default(''), source: z.string().max(40).default(''), from: date.optional(), to: date.optional() }).strict(), query);
    const where: Prisma.PlatformLeadWhereInput = { ...(q.q ? { OR: [{ schoolName: { contains: q.q, mode: 'insensitive' } }, { contactName: { contains: q.q, mode: 'insensitive' } }, { contactEmail: { contains: q.q, mode: 'insensitive' } }, { location: { contains: q.q, mode: 'insensitive' } }] } : {}), ...(q.status ? { status: q.status } : {}), ...(q.source ? { source: q.source } : {}), ...(q.from || q.to ? { createdAt: { ...(q.from ? { gte: new Date(q.from) } : {}), ...(q.to ? { lt: new Date(Date.parse(q.to) + 86400000) } : {}) } } : {}) };
    const [items, total, groups] = await this.svc.db.$transaction([
      this.svc.db.platformLead.findMany({ where, include: { activities: { orderBy: { createdAt: 'desc' }, take: 20 } }, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
      this.svc.db.platformLead.count({ where }),
      this.svc.db.platformLead.groupBy({ by: ['status'], _count: true, orderBy: { status: 'asc' } }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize, stages: Object.fromEntries(groups.map(group => [group.status, group._count])) };
  }
  @Post('platform/leads') async createPlatformLead(@Req() req: Request, @Body() body: unknown) {
    const actor = await this.svc.administrator(req); const b = parse(leadFields, body);
    return this.svc.idempotent(actor.id + ':platform-lead', key(req), b, async tx => {
      const lead = await tx.platformLead.create({ data: b });
      await tx.platformLeadActivity.create({ data: { leadId: lead.id, actorId: actor.id, kind: 'created' } });
      await tx.auditEvent.create({ data: { actorId: actor.id, action: 'PLATFORM_LEAD_CREATED', target: lead.id } });
      return lead;
    });
  }
  @Patch('platform/leads/:leadId') async updatePlatformLead(@Req() req: Request, @Param('leadId') leadId: string, @Body() body: unknown) {
    const actor = await this.svc.administrator(req); parse(uuid, leadId); const b = parse(leadFields, body);
    return this.svc.atomic(async tx => {
      const prior = await tx.platformLead.findUnique({ where: { id: leadId } });
      if (!prior) throw new BadRequestException('Lead not found.');
      if (prior.convertedSchoolId && (b.status !== 'won' || b.schoolName !== prior.schoolName || b.contactEmail !== prior.contactEmail)) throw new ConflictException('A converted lead cannot change its school, contact email or stage.');
      const lead = await tx.platformLead.update({ where: { id: leadId }, data: b });
      await tx.platformLeadActivity.create({ data: { leadId, actorId: actor.id, kind: prior.status === b.status ? 'updated' : 'stage-changed', note: prior.status === b.status ? '' : `${prior.status} to ${b.status}` } });
      await tx.auditEvent.create({ data: { actorId: actor.id, action: 'PLATFORM_LEAD_UPDATED', target: lead.id } });
      return lead;
    });
  }
  @Post('platform/leads/:leadId/convert') async convertPlatformLead(@Req() req: Request, @Param('leadId') leadId: string, @Body() body: unknown) {
    const actor = await this.svc.administrator(req); parse(uuid, leadId);
    const b = parse(z.object({ code: z.string().trim().regex(/^[A-Za-z0-9-]{2,30}$/).transform(v => v.toUpperCase()), expiresInMinutes: invitationExpiry.default(2880) }).strict(), body);
    return this.svc.idempotent(actor.id + ':convert-lead:' + leadId, key(req), b, async tx => {
      const lead = await tx.platformLead.findUnique({ where: { id: leadId } });
      if (!lead || lead.status !== 'won' || lead.convertedSchoolId) throw new ConflictException('Only an unconverted won lead can become a school.');
      if (await tx.school.findUnique({ where: { code: b.code } })) throw new ConflictException('School code is already in use.');
      if (await tx.school.findFirst({ where: { name: { equals: lead.schoolName, mode: 'insensitive' }, region: { equals: lead.region || lead.location, mode: 'insensitive' } } })) throw new ConflictException('A school with this name and region already exists. Review the school directory before converting.');
      const school = await tx.school.create({ data: { name: lead.schoolName, code: b.code, region: lead.region || lead.location, schoolType: lead.schoolType || null, address: lead.location, website: lead.schoolWebsite || null, phone: lead.contactPhone, email: lead.contactEmail } });
      const invitation = await this.svc.createInvitation(tx, actor.id, school.id, { name: lead.headmasterName || lead.contactName, email: lead.headmasterEmail || lead.contactEmail, role: 'HEADMASTER', expiresInMinutes: b.expiresInMinutes, welcomeSchool: true });
      await tx.platformLead.update({ where: { id: leadId }, data: { convertedSchoolId: school.id } });
      await tx.platformLeadActivity.create({ data: { leadId, actorId: actor.id, kind: 'converted', note: `School ${school.code} created` } });
      await tx.auditEvent.create({ data: { actorId: actor.id, schoolId: school.id, action: 'PLATFORM_LEAD_CONVERTED', target: leadId } });
      return { school, invitation };
    });
  }
  @Post('platform/leads/:leadId/activities') async addLeadActivity(@Req() req: Request, @Param('leadId') leadId: string, @Body() body: unknown) {
    const actor = await this.svc.administrator(req); parse(uuid, leadId);
    const b = parse(z.object({ kind: z.enum(['note', 'contacted', 'demo-scheduled', 'demo-completed']), note: z.string().trim().min(2).max(2000), scheduledAt: z.string().datetime().optional() }).strict(), body);
    return this.svc.atomic(async tx => {
      const lead = await tx.platformLead.findUnique({ where: { id: leadId } });
      if (!lead) throw new BadRequestException('Lead not found.');
      const activity = await tx.platformLeadActivity.create({ data: { leadId, actorId: actor.id, kind: b.kind, note: b.note, scheduledAt: b.scheduledAt ? new Date(b.scheduledAt) : null } });
      const stage = b.kind === 'contacted' ? 'contacted' : b.kind === 'demo-scheduled' ? 'demo-scheduled' : b.kind === 'demo-completed' ? 'demo-done' : undefined;
      if (stage && !lead.convertedSchoolId && lead.status !== stage) await tx.platformLead.update({ where: { id: leadId }, data: { status: stage } });
      await tx.auditEvent.create({ data: { actorId: actor.id, action: 'PLATFORM_LEAD_ACTIVITY_ADDED', target: leadId } });
      return activity;
    });
  }
  @Get('platform/settings') async platformSettings(@Req() req: Request) {
    await this.svc.administrator(req);
    return (await this.svc.db.platformSetting.findUnique({ where: { id: 1 } })) ?? { platformName: 'SyncAcademy', supportEmail: '', maintenanceMessage: '' };
  }
  @Get('platform/health') async platformHealth(@Req() req: Request) {
    await this.svc.administrator(req);
    await this.svc.db.$queryRaw`SELECT 1`;
    const [queued, failed, sent] = await this.svc.db.$transaction([
      this.svc.db.outbox.count({ where: { sentAt: null, failedAt: null, cancelledAt: null } }),
      this.svc.db.outbox.count({ where: { failedAt: { not: null }, cancelledAt: null } }),
      this.svc.db.outbox.count({ where: { sentAt: { not: null } } }),
    ]);
    return { status: 'ready', checkedAt: new Date(), mail: { queued, failed, sent } };
  }
  @Get('platform/search') async platformSearch(@Req() req: Request, @Query('q') query?: string) {
    await this.svc.administrator(req);
    const q = parse(z.string().trim().min(2).max(100), query);
    const [schools, leads] = await this.svc.db.$transaction([
      this.svc.db.school.findMany({ where: { OR: [{ name: { contains: q, mode: 'insensitive' } }, { code: { contains: q, mode: 'insensitive' } }] }, select: { id: true, name: true }, take: 5, orderBy: { name: 'asc' } }),
      this.svc.db.platformLead.findMany({ where: { OR: [{ schoolName: { contains: q, mode: 'insensitive' } }, { contactName: { contains: q, mode: 'insensitive' } }] }, select: { id: true, schoolName: true }, take: 5, orderBy: { schoolName: 'asc' } }),
    ]);
    return { schools, leads };
  }
  @Patch('platform/settings') async updatePlatformSettings(@Req() req: Request, @Body() body: unknown) {
    const actor = await this.svc.administrator(req);
    const b = parse(z.object({ platformName: name, supportEmail: z.union([email, z.literal('')]), maintenanceMessage: z.string().trim().max(500) }).strict(), body);
    return this.svc.atomic(async tx => {
      const settings = await tx.platformSetting.upsert({ where: { id: 1 }, create: { id: 1, ...b }, update: b });
      await tx.auditEvent.create({ data: { actorId: actor.id, action: 'PLATFORM_SETTINGS_UPDATED', target: 'platform' } });
      return settings;
    });
  }
  @Get('platform/invitations') async platformInvitations(@Req() req: Request, @Query() query: unknown) {
    await this.svc.administrator(req);
    const q = parse(z.object({ page: listPage, pageSize: listSize, q: z.string().trim().max(200).default('') }).strict(), query);
    const where: Prisma.InvitationWhereInput = { platformAdmin: true, schoolId: null, ...(q.q ? { OR: [{ name: { contains: q.q, mode: 'insensitive' } }, { email: { contains: q.q, mode: 'insensitive' } }] } : {}) };
    const [invitations, total] = await this.svc.db.$transaction([
      this.svc.db.invitation.findMany({ where, select: { id: true, name: true, email: true, expiresInMinutes: true, createdAt: true, expiresAt: true, acceptedAt: true, revokedAt: true }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
      this.svc.db.invitation.count({ where }),
    ]);
    return { items: invitations.map(invitation => ({ ...invitation, role: 'SUPER_ADMIN' })), total, page: q.page, pageSize: q.pageSize };
  }
  @Post('platform/invitations') async invitePlatformAdmin(@Req() req: Request, @Body() body: unknown) {
    const actor = await this.svc.administrator(req);
    await this.svc.rate('platform-invite-create:' + actor.id, 20, 3600);
    const invitation = parse(z.object({ name, email, expiresInMinutes: invitationExpiry.default(2880) }).strict(), body);
    return this.svc.idempotent(actor.id + ':platform-invitation', key(req), invitation, tx => this.svc.createPlatformInvitation(tx, actor.id, invitation));
  }
  @Patch('platform/admins/:userId') async platformAdminRole(@Req() req: Request, @Param('userId') userId: string, @Body() body: unknown) {
    const actor = await this.svc.administrator(req); parse(uuid, userId); const { enabled } = parse(z.object({ enabled: z.boolean() }).strict(), body);
    if (actor.id === userId) throw new ForbiddenException('You cannot suspend your own Super Admin access.');
    return this.svc.atomic(async tx => {
      const target = await tx.user.findFirst({ where: { id: userId, platformAdmin: true } });
      if (!target) throw new BadRequestException('Super Admin account not found.');
      if (!enabled && await tx.user.count({ where: { platformAdmin: true, enabled: true } }) <= 1) throw new ConflictException('At least one active Super Admin must remain.');
      await tx.user.update({ where: { id: userId }, data: { platformAdmin: enabled, sessionVersion: { increment: 1 } } });
      await tx.auditEvent.create({ data: { actorId: actor.id, action: enabled ? 'PLATFORM_ADMIN_REACTIVATED' : 'PLATFORM_ADMIN_SUSPENDED', target: userId } });
      return { message: enabled ? 'Super Admin access reactivated.' : 'Super Admin access suspended. School roles and records remain.' };
    });
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
  @Post('auth/reset/validate') validateReset(@Req() req: Request, @Body() body: unknown) { return this.svc.validateReset(req, parse(z.object({ token }).strict(), body).token); }
  @Post('auth/reset') reset(@Req() req: Request, @Body() body: unknown) { const b = parse(z.object({ token, password }).strict(), body); return this.svc.reset(req, b.token, b.password); }
  @Post('invitations/preview') preview(@Req() req: Request, @Body() body: unknown) { return this.svc.invitationInfo(req, parse(z.object({ token }).strict(), body).token); }
  @Post('invitations/accept') accept(@Req() req: Request, @Body() body: unknown) { const b = parse(z.object({ token, password: z.string().min(1).max(128).optional(), acceptedTerms: z.literal(true), acknowledgedPrivacy: z.literal(true) }).strict(), body); return this.svc.accept(req, b.token, b.password); }
  @Get('schools') async schools(@Req() req: Request, @Query() query: unknown) {
    await this.svc.administrator(req);
    const q = parse(z.object({ page: listPage, pageSize: listSize, q: z.string().trim().max(200).default(''), status: z.enum(['active', 'suspended']).optional() }).strict(), query);
    const where: Prisma.SchoolWhereInput = { ...(q.status ? { active: q.status === 'active' } : {}), ...(q.q ? { OR: [{ name: { contains: q.q, mode: 'insensitive' } }, { code: { contains: q.q, mode: 'insensitive' } }, { region: { contains: q.q, mode: 'insensitive' } }, { email: { contains: q.q, mode: 'insensitive' } }, { phone: { contains: q.q, mode: 'insensitive' } }] } : {}) };
    const [items, total] = await this.svc.db.$transaction([this.svc.db.school.findMany({ where, skip: (q.page - 1) * q.pageSize, take: q.pageSize, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], include: { _count: { select: { memberships: {where:{role:{notIn:['STUDENT','PARENT']}}}, students: true } } } }), this.svc.db.school.count({ where })]);
    return { items, total, page: q.page, pageSize: q.pageSize };
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
  @Patch('schools/:id/profile') async schoolProfile(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    const { user } = await this.svc.authorize(req, schoolId(id), managers);
    const b = parse(z.object({ name, region: name, schoolType: z.string().trim().max(80), address: z.string().trim().max(500), phone: z.string().trim().max(40), email: z.union([email,z.literal('')]), website: z.string().trim().max(200) }).strict(), body);
    return this.svc.atomic(async tx => {
      const school = await tx.school.update({ where: { id }, data: b });
      await tx.auditEvent.create({ data: { actorId: user.id, schoolId: id, action: 'SCHOOL_PROFILE_UPDATED', target: id } });
      return { id: school.id, name: school.name, code: school.code, region: school.region, schoolType: school.schoolType, address: school.address, phone: school.phone, email: school.email, website: school.website };
    });
  }
  @Get('schools/:id/workspace') async workspace(@Req() req: Request, @Param('id') id: string, @Query() query: unknown) {
    const { page, pageSize, view } = parse(z.object({ page: listPage.optional(), pageSize: listSize.optional(), view: z.literal('summary').optional() }).strict(), query);
    const { user, memberships } = await this.svc.authorize(req, schoolId(id));
    const roles = memberships.map(m => m.role); const staffManager = user.platformAdmin || roles.includes('HEADMASTER');
    const registrar = staffManager || roles.includes('REGISTRAR'); const academic = staffManager || roles.includes('ACADEMIC');
    const bursar = user.platformAdmin || roles.includes('HEADMASTER') || roles.includes('BURSAR');
    const teacher = roles.includes('TEACHER');
    const teacherScope = teacher ? await teacherEnrollmentScope(this.svc.db, id, user.id) : {};
    const visibleEnrollments = !registrar && !academic && !bursar ? teacherScope : {};
    const classroomWhere = { schoolId: id, ...(!registrar && !academic && !bursar ? { OR: [ ...(teacher ? [{ assignments: { some: { membership: { userId: user.id, active: true } } } }] : []), { enrollments: { some: { status: 'active', student: { userId: user.id } } } }] } : {}) };
    const studentWhere = { schoolId: id, ...(!registrar && !academic && !bursar ? { OR: [{ userId: user.id }, ...(teacher ? [{ enrollments: { some: teacherScope } }] : [])] } : {}) };
    const [school, years, classes, studentRows, studentCount, members, invitations, assignments] = await Promise.all([
      this.svc.db.school.findUnique({ where: { id }, select: { id: true, name: true, code: true, region: true, schoolType: true, address: true, phone: true, email: true, website: true } }),
      this.svc.db.academicYear.findMany({ where: { schoolId: id, ...(!registrar && !academic && !bursar ? { classes: { some: classroomWhere } } : {}) }, orderBy: { startsAt: 'desc' } }),
      this.svc.db.classroom.findMany({ where: classroomWhere, include: { year: { select: { name: true, closed: true } }, _count: { select: { enrollments: { where: { status: 'active' } } } } }, orderBy: { name: 'asc' } }),
      view === 'summary' ? [] : this.svc.db.student.findMany({ where: studentWhere, select: { id: true, name: true, admissionNumber: true, dateOfBirth: registrar ? true : false, gender: true, address: registrar ? true : false, userId: true, enrollments: { orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], where: { ...visibleEnrollments, ...(!registrar && !academic && !bursar ? { classroom: classroomWhere } : {}) }, select: { id: true, classroomId: true, createdAt: true, status: true, version: true, classroom: { select: { name: true, yearId: true, year: { select: { name: true } } } } } } }, orderBy: { createdAt: 'desc' }, ...(page ? { skip: (page - 1) * (pageSize ?? 25), take: pageSize ?? 25 } : {}) }),
      this.svc.db.student.count({ where: studentWhere }),
      staffManager || academic ? this.svc.db.membership.findMany({ where: { schoolId: id }, select: { id: true, role: true, active: true, createdAt: true, user: { select: { id: true, name: true, email: true, enabled: true } } }, orderBy: { createdAt: 'desc' } }) : [],
      staffManager || academic ? this.svc.db.invitation.findMany({ where: { schoolId: id, ...(staffManager ? {} : { role: 'TEACHER' }) }, select: { id: true, name: true, email: true, role: true, createdAt: true, expiresAt: true, expiresInMinutes: true, acceptedAt: true, revokedAt: true }, orderBy: { createdAt: 'desc' } }) : [],
      !(view === 'summary' && user.platformAdmin) && (staffManager || academic || teacher) ? this.svc.db.teachingAssignment.findMany({ where: { schoolId: id, ...(!staffManager && !academic ? { membership: { userId: user.id, active: true } } : {}) }, select: { id: true, classroomId: true, membershipId: true, subjectId: true, subject: true, confirmedAt: true, membership: { select: { active: true, user: { select: { id: true, name: true, enabled: true } } } }, classroom: { select: { name: true, yearId: true, year: { select: { name: true } }, _count: { select: { enrollments: { where: { status: 'active' } } } } } } } }) : [],
    ]);
    // Scope the batch to already-authorized enrollments and avoid Prisma's large composite-key IN query.
    const enrollmentIds = studentRows.flatMap(student => student.enrollments.map(enrollment => enrollment.id));
    const enrollmentSubjects = enrollmentIds.length ? await this.svc.db.enrollmentSubject.findMany({
      where: { schoolId: id, enrollmentId: { in: enrollmentIds } },
      select: { enrollmentId: true, subjectId: true },
    }) : [];
    const subjectsByEnrollment = new Map<string, Array<{ subjectId: string }>>();
    for (const subject of enrollmentSubjects) {
      const subjects = subjectsByEnrollment.get(subject.enrollmentId) ?? [];
      subjects.push({ subjectId: subject.subjectId });
      subjectsByEnrollment.set(subject.enrollmentId, subjects);
    }
    const students = studentRows.map(student => ({ ...student, enrollments: student.enrollments.map(enrollment => ({
      ...enrollment, subjects: subjectsByEnrollment.get(enrollment.id) ?? [],
    })) }));
    const registryAdmissions = registrar ? await this.svc.db.admission.findMany({ where: { schoolId: id }, select: { id: true, yearId: true, status: true } }) : [];
    const registryIssues = registrar || academic ? await this.svc.db.rosterIssue.findMany({ where: { schoolId: id, status: 'open' }, select: { id: true, assignment: { select: { classroom: { select: { yearId: true } } } } } }) : [];
    const auditEvents = staffManager ? await this.svc.db.auditEvent.findMany({ where: { schoolId: id }, orderBy: { createdAt: 'desc' }, take: 100 }) : [];
    const auditActorIds = [...new Set(auditEvents.flatMap(event => event.actorId ? [event.actorId] : []))];
    const [auditActors, auditMemberships] = auditActorIds.length
      ? await Promise.all([
        this.svc.db.user.findMany({ where: { id: { in: auditActorIds } }, select: { id: true, name: true } }),
        this.svc.db.membership.findMany({ where: { schoolId: id, userId: { in: auditActorIds } }, select: { userId: true, role: true } }),
      ])
      : [[], []];
    const audit = auditEvents.map(event => ({
      ...event,
      actor: auditActors.find(actor => actor.id === event.actorId) ?? null,
      role: auditMemberships.find(membership => membership.userId === event.actorId)?.role ?? null,
    }));
    const subjects = registrar || academic ? await this.svc.db.subject.findMany({ where: { schoolId: id }, orderBy: { name: 'asc' } }) : [];
    const classSubjects = registrar || academic ? await this.svc.db.classSubject.findMany({ where: { schoolId: id }, include: { subject: true } }) : [];

    let financeSummaryData = null;
    if (bursar) {
      const [{ _count: feesCount }, { _sum: chargedSum }, { _sum: paidSum }, { _sum: adjSum }] = await Promise.all([
        this.svc.db.feeStructure.aggregate({ where: { schoolId: id }, _count: true }),
        this.svc.db.studentCharge.aggregate({ where: { schoolId: id }, _sum: { amount: true } }),
        this.svc.db.payment.aggregate({ where: { schoolId: id, voidAt: null }, _sum: { amount: true } }),
        this.svc.db.adjustment.aggregate({ where: { schoolId: id }, _sum: { amount: true } })
      ]);
      // Aggregate each school ledger once, rather than rescanning it per student.
      const owingStudents = await this.svc.db.$queryRaw<Array<{ count: number }>>`
        WITH charges AS (
          SELECT "studentId",SUM(amount) AS amount FROM "StudentCharge" WHERE "schoolId"=${id}::uuid GROUP BY "studentId"
        ), payments AS (
          SELECT "studentId",SUM(amount) AS amount FROM "Payment" WHERE "schoolId"=${id}::uuid AND "voidAt" IS NULL GROUP BY "studentId"
        ), adjustments AS (
          SELECT "studentId",SUM(amount) AS amount FROM "Adjustment" WHERE "schoolId"=${id}::uuid GROUP BY "studentId"
        )
        SELECT COUNT(*)::int AS count FROM charges c
        LEFT JOIN payments p ON p."studentId"=c."studentId"
        LEFT JOIN adjustments a ON a."studentId"=c."studentId"
        WHERE c.amount+COALESCE(a.amount,0)-COALESCE(p.amount,0)>0
      `;
      financeSummaryData = {
        fees: feesCount || 0,
        charged: chargedSum.amount || 0,
        paid: paidSum.amount || 0,
        adjustments: adjSum.amount || 0,
        studentsOwing: owingStudents[0]?.count ?? 0
      };
    }
    return { view: view ?? 'full', studentsComplete: view !== 'summary' && !page, school, years: years.map(year => ({ ...year, terms: termsForYear(year) })), classes, students, studentCount, registryAdmissions, registryIssues, subjects, classSubjects, members, invitations, assignments, audit, financeSummary: bursar ? financeSummaryData : null, permissions: { staffManager, registrar, academic, bursar } };
  }
  @Get('schools/:id/teacher-assignments') async teacherAssignments(@Req() req: Request, @Param('id') id: string, @Query() query: unknown) {
    const { user, memberships } = await this.svc.authorize(req, schoolId(id), academics);
    if (!user.platformAdmin && !memberships.some(membership => academics.includes(membership.role))) throw new ForbiddenException('Academic management access required.');
    const q = parse(z.object({
      yearId: uuid,
      page: listPage,
      pageSize: z.coerce.number().int().refine(value => [12, 20, 24, 48].includes(value), 'Choose a supported page size.').default(20),
      search: z.string().trim().max(150).default(''),
      classId: uuid.optional(),
      subjectId: uuid.optional(),
      role: z.enum(['all', 'class_teacher', 'subject_teacher']).default('all'),
    }).strict(), query);
    const [year, academicWorkspace] = await Promise.all([
      this.svc.db.academicYear.findFirst({
        where: { id: q.yearId, schoolId: id },
        select: { id: true, name: true, closed: true, classes: { select: { id: true, name: true } } },
      }),
      this.svc.db.academicWorkspace.findFirst({
        where: { schoolId: id, yearId: q.yearId },
        select: { data: true },
      }),
    ]);
    if (!year) throw new BadRequestException('Choose an academic year in this school.');
    const classesById = new Map(year.classes.map(classroom => [classroom.id, classroom.name]));
    if (q.classId && !classesById.has(q.classId)) throw new BadRequestException('Choose a class in this academic year.');
    if (q.subjectId && !await this.svc.db.subject.findFirst({ where: { id: q.subjectId, schoolId: id }, select: { id: true } })) {
      throw new BadRequestException('Choose a subject in this school.');
    }
    const rawClassTeachers = (academicWorkspace?.data as { classTeachers?: unknown[] } | null)?.classTeachers ?? [];
    const classTeacherRecords = rawClassTeachers.filter((record): record is { classId: string; teacherId: string; endedAt?: unknown } => {
      if (!record || typeof record !== 'object' || Array.isArray(record)) return false;
      const item = record as Record<string, unknown>;
      return typeof item.classId === 'string' &&
        typeof item.teacherId === 'string' &&
        !item.endedAt &&
        classesById.has(item.classId);
    });
    const classTeacherClassesByUser = new Map<string, Map<string, string>>();
    for (const record of classTeacherRecords) {
      const className = classesById.get(record.classId);
      if (!className) continue;
      const assignedClasses = classTeacherClassesByUser.get(record.teacherId) ?? new Map<string, string>();
      assignedClasses.set(record.classId, className);
      classTeacherClassesByUser.set(record.teacherId, assignedClasses);
    }
    const classTeacherUserIds = [...new Set(classTeacherRecords.map(record => record.teacherId))];
    const assignmentWhere: Prisma.TeachingAssignmentWhereInput = {
      schoolId: id,
      classroom: { yearId: q.yearId },
    };
    const matchingTeacherSets: Set<string>[] = [];
    if (q.classId) {
      const classAssignments = await this.svc.db.membership.findMany({
        where: {
          schoolId: id,
          role: 'TEACHER',
          assignments: { some: { ...assignmentWhere, classroomId: q.classId } },
        },
        select: { userId: true },
      });
      const classTeacherIds = classTeacherRecords
        .filter(record => record.classId === q.classId)
        .map(record => record.teacherId);
      matchingTeacherSets.push(new Set([...classAssignments.map(membership => membership.userId), ...classTeacherIds]));
    }
    if (q.subjectId || q.role === 'subject_teacher') {
      const subjectAssignments = await this.svc.db.membership.findMany({
        where: {
          schoolId: id,
          role: 'TEACHER',
          assignments: {
            some: {
              ...assignmentWhere,
              subjectId: q.subjectId ?? { not: null },
            },
          },
        },
        select: { userId: true },
      });
      matchingTeacherSets.push(new Set(subjectAssignments.map(membership => membership.userId)));
    }
    if (q.role === 'class_teacher') matchingTeacherSets.push(new Set(classTeacherUserIds));
    let matchingTeacherIds: Set<string> | undefined;
    for (const matches of matchingTeacherSets) {
      if (!matchingTeacherIds) {
        matchingTeacherIds = new Set(matches);
      } else {
        for (const teacherId of matchingTeacherIds) {
          if (!matches.has(teacherId)) matchingTeacherIds.delete(teacherId);
        }
      }
    }
    const where: Prisma.MembershipWhereInput = {
      schoolId: id,
      role: 'TEACHER',
      ...(q.search ? { user: { name: { contains: q.search, mode: 'insensitive' } } } : {}),
      ...(matchingTeacherIds ? { userId: { in: [...matchingTeacherIds] } } : {}),
    };
    const [teacherMemberships, total] = await Promise.all([
      this.svc.db.membership.findMany({
        where,
        orderBy: [{ user: { name: 'asc' } }, { userId: 'asc' }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        select: {
          userId: true,
          active: true,
          user: { select: { id: true, name: true, enabled: true } },
          assignments: {
            where: assignmentWhere,
            select: {
              subjectId: true,
              subject: { select: { id: true, name: true } },
              classroom: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.svc.db.membership.count({ where }),
    ]);
    const items = teacherMemberships.map(membership => {
      const subjectAssignments = new Map<string, { id: string; name: string; classes: Map<string, string> }>();
      const classTeacherClasses = classTeacherClassesByUser.get(membership.userId) ?? new Map<string, string>();
      for (const assignment of membership.assignments) {
        if (!assignment.subjectId || !assignment.subject) continue;
        let subject = subjectAssignments.get(assignment.subjectId);
        if (!subject) {
          subject = { id: assignment.subjectId, name: assignment.subject.name, classes: new Map() };
          subjectAssignments.set(assignment.subjectId, subject);
        }
        subject.classes.set(assignment.classroom.id, assignment.classroom.name);
      }
      return {
        id: membership.userId,
        name: membership.user.name,
        role: 'TEACHER' as const,
        status: membership.active && membership.user.enabled ? 'active' as const : 'inactive' as const,
        classTeacherClasses: [...classTeacherClasses].map(([classId, name]) => ({ id: classId, name })),
        teachingAssignments: [...subjectAssignments.values()].map(subject => ({
          id: subject.id,
          name: subject.name,
          classes: [...subject.classes].map(([classId, name]) => ({ id: classId, name })),
        })).sort((a, b) => a.name.localeCompare(b.name)),
      };
    });
    return { year: { id: year.id, name: year.name, closed: year.closed }, items, total, page: q.page, pageSize: q.pageSize };
  }
  @Post('schools/:id/invitations') async invite(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    const { user, memberships } = await this.svc.authorize(req, schoolId(id));
    const manager = user.platformAdmin || memberships.some(m => m.role === 'HEADMASTER');
    const academic = memberships.some(m => m.role === 'ACADEMIC');
    if (!manager && !academic) throw new ForbiddenException('You cannot invite school users.');
    await this.svc.rate('invite-create:' + user.id, 50, 3600);
    const b = parse(z.object({ name, email, role: schoolRole, expiresInMinutes: invitationExpiry.default(2880) }).strict(), body);
    if (academic && !manager && b.role !== 'TEACHER') throw new ForbiddenException('Academic Masters can invite teachers only.');
    if (b.role === 'HEADMASTER' && !manager) throw new ForbiddenException('Only Headmasters or platform administrators assign Headmasters.');
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
      if (!invitation) throw new ForbiddenException('Invitation is unavailable.');
      await tx.outbox.updateMany({ where: { invitationId, sentAt: null, cancelledAt: null }, data: { cancelledAt: new Date(), payload: '' } });
      const token = randomToken();
      const updated = await tx.invitation.update({ where: { id: invitationId }, data: action === 'revoke' ? { revokedAt: new Date() } : { tokenHash: digest(token), expiresAt: new Date(Date.now() + invitation.expiresInMinutes * 60000), generation: { increment: 1 } } });
      if (action === 'resend') await this.svc.invitationMail(tx, updated, token);
      await tx.auditEvent.create({ data: { actorId: user.id, schoolId: id, action: 'INVITATION_' + action.toUpperCase(), target: invitationId } }); return { message: action === 'resend' ? 'New invitation queued. Previous link is invalid.' : 'Invitation revoked.' };
    });
  }
  @Patch('schools/:id/members/:membershipId') async member(@Req() req: Request, @Param('id') id: string, @Param('membershipId') membershipId: string, @Body() body: unknown) {
    const { user, memberships } = await this.svc.authorize(req, schoolId(id), ['HEADMASTER','ACADEMIC']); parse(uuid, membershipId); const b = parse(z.object({ active: z.boolean() }).strict(), body);
    return this.svc.atomic(async tx => {
      const member = await tx.membership.findFirst({ where: { id: membershipId, schoolId: id } });
      const selectedRole = (req.session as any).selectedRole;
      if (!member || (member.userId === user.id && member.role === selectedRole) || (member.role === 'HEADMASTER' && !user.platformAdmin) || (memberships.some(m => m.role === 'ACADEMIC') && !user.platformAdmin && member.role !== 'TEACHER')) throw new ForbiddenException('You cannot change this membership.');
      await tx.membership.update({ where: { id: member.id }, data: { active: b.active } });
      await tx.user.update({ where: { id: member.userId }, data: { sessionVersion: { increment: 1 } } });
      await tx.auditEvent.create({ data: { actorId: user.id, schoolId: id, action: b.active ? 'MEMBER_REACTIVATED' : 'MEMBER_SUSPENDED', target: member.id } }); return { message: 'Access updated. Existing sessions revoked.' };
    });
  }
  @Delete('schools/:id/members/:membershipId') async removeMemberRole(@Req() req: Request, @Param('id') id: string, @Param('membershipId') membershipId: string) {
    const { user, memberships } = await this.svc.authorize(req, schoolId(id)); parse(uuid, membershipId);
    const canManage = user.platformAdmin || memberships.some(m => m.role === 'HEADMASTER' || m.role === 'ACADEMIC');
    if (!canManage) throw new ForbiddenException('You cannot remove school roles.');
    return this.svc.atomic(async tx => {
      const member = await tx.membership.findFirst({ where: { id: membershipId, schoolId: id } });
      const selectedRole = (req.session as any).selectedRole;
      if (!member || (member.userId === user.id && member.role === selectedRole) || (member.role === 'HEADMASTER' && !user.platformAdmin) || (memberships.some(m => m.role === 'ACADEMIC') && !user.platformAdmin && member.role !== 'TEACHER')) throw new ForbiddenException('You cannot remove this role.');
      if (await tx.teachingAssignment.findFirst({ where: { schoolId: id, membershipId: member.id } })) throw new ConflictException('This role has teaching or class-teacher history. Deactivate it to preserve academic records.');
      await tx.membership.delete({ where: { id: member.id } });
      await tx.user.update({ where: { id: member.userId }, data: { sessionVersion: { increment: 1 } } });
      await tx.auditEvent.create({ data: { actorId: user.id, schoolId: id, action: 'MEMBER_ROLE_REMOVED', target: member.id } });
      return { message: 'School role removed.' };
    });
  }
  @Post('schools/:id/years') async year(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    const { user } = await this.svc.authorize(req, schoolId(id), academics);
    const b = parse(z.object({ name, startsAt: date, endsAt: date, terms: termsInput.optional() }).strict().refine(v => v.endsAt > v.startsAt, 'End date must follow start date.'), body);
    if (b.terms) validateTerms(b.terms, b.startsAt, b.endsAt);
    return this.svc.idempotent(user.id + ':year:' + id, key(req), b, tx => tx.academicYear.create({ data: { schoolId: id, name: b.name, startsAt: new Date(b.startsAt), endsAt: new Date(b.endsAt), terms: b.terms ?? termsForYear({ startsAt: new Date(b.startsAt), endsAt: new Date(b.endsAt) }) } }));
  }
  @Patch('schools/:id/years/:yearId') async updateYear(@Req() req: Request, @Param('id') id: string, @Param('yearId') yearId: string, @Body() body: unknown) {
    const { user } = await this.svc.authorize(req, schoolId(id), academics); parse(uuid, yearId);
    const b = parse(z.union([
      z.object({ name, startsAt: date, endsAt: date, terms: termsInput.optional() }).strict().refine(v => v.endsAt > v.startsAt, 'End date must follow start date.'),
      z.object({ closed: z.boolean() }).strict(),
    ]), body);
    return this.svc.atomic(async tx => {
      const year = await tx.academicYear.findFirst({ where: { id: yearId, schoolId: id } });
      if (!year) throw new BadRequestException('Academic year not found.');
      if ('closed' in b) {
        if (req.session.selectedRole !== 'HEADMASTER') throw new ForbiddenException('Headmaster access required to close or reopen a year.');
        if (year.closed === b.closed) return year;
        if (b.closed) {
          const workspace = await tx.academicWorkspace.findUnique({ where: { yearId } });
          const assessments = ((workspace?.data as any)?.assessments ?? []) as any[];
          const submissions = ((workspace?.data as any)?.submissions ?? []) as any[];
          if (assessments.some(a => a.status !== 'closed')) throw new BadRequestException('Close all assessments before closing the academic year.');
          if (submissions.some(s => s.assessmentProgress?.status !== 'approved')) throw new BadRequestException('Review all assessment submissions before closing the year.');
        }
      } else {
        const terms = b.terms ?? termsForYear(year);
        validateTerms(terms, b.startsAt, b.endsAt);
        const removed = termsForYear(year).filter(term => !terms.some(next => next.key === term.key)).map(term => term.key);
        if (removed.length) {
          const workspace = await tx.academicWorkspace.findUnique({ where: { yearId } });
          const assessments = ((workspace?.data as any)?.assessments ?? []) as any[];
          const usedInAssessment = assessments.some(assessment => removed.includes(assessment.term));
          const [fees, charges, payments, adjustments] = await Promise.all([
            tx.feeStructure.count({ where: { yearId, term: { in: removed } } }),
            tx.studentCharge.count({ where: { yearId, term: { in: removed } } }),
            tx.payment.count({ where: { yearId, term: { in: removed } } }),
            tx.adjustment.count({ where: { yearId, term: { in: removed } } }),
          ]);
          if (usedInAssessment || fees || charges || payments || adjustments) throw new BadRequestException('A term with assessments or finance records cannot be removed. Rename it or keep it in this year.');
        }
      }
      const updated = await tx.academicYear.update({ where: { id: yearId }, data: 'closed' in b ? { closed: b.closed } : { name: b.name, startsAt: new Date(b.startsAt), endsAt: new Date(b.endsAt), terms: b.terms ?? termsForYear(year) } });
      await tx.auditEvent.create({ data: { actorId: user.id, schoolId: id, action: 'closed' in b ? (b.closed ? 'ACADEMIC_YEAR_CLOSED' : 'ACADEMIC_YEAR_REOPENED') : 'ACADEMIC_YEAR_UPDATED', target: yearId } });
      return updated;
    });
  }
  @Post('schools/:id/classes') async classroom(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    const { user } = await this.svc.authorize(req, schoolId(id), academics); const b = parse(z.object({ name, yearId: uuid }).strict(), body);
    return this.svc.idempotent(user.id + ':class:' + id, key(req), b, async tx => {
      if (!await tx.academicYear.findFirst({ where: { id: b.yearId, schoolId: id } })) throw new BadRequestException('Select an academic year.');
      return tx.classroom.create({ data: { ...b, schoolId: id } });
    });
  }
  @Post('schools/:id/assignments') async assignment(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    const { user } = await this.svc.authorize(req, schoolId(id), academics); const b = parse(z.object({ membershipId: uuid, classroomId: uuid, subjectId: uuid }).strict(), body);
    return this.svc.idempotent(user.id + ':assignment:' + id, key(req), b, async tx => {
      if (!await tx.membership.findFirst({ where: { id: b.membershipId, schoolId: id, role: 'TEACHER', active: true, user: { enabled: true } } }) || !await tx.classroom.findFirst({ where: { id: b.classroomId, schoolId: id } })) throw new BadRequestException('Choose an active teacher and a class in this school.');
      if (b.subjectId) await validateSubjects(tx, id, b.classroomId, [b.subjectId]);
      if (await tx.teachingAssignment.findFirst({ where: { schoolId: id, ...b } })) throw new ConflictException('This teacher assignment already exists.');
      const assignment = await tx.teachingAssignment.create({ data: { ...b, schoolId: id } });
      await tx.auditEvent.create({ data: { actorId: user.id, schoolId: id, action: 'TEACHER_ASSIGNED', target: assignment.id } }); return assignment;
    });
  }
  @Patch('schools/:id/assignments/:assignmentId') async reassignTeacher(@Req() req: Request, @Param('id') id: string, @Param('assignmentId') assignmentId: string, @Body() body: unknown) {
    const { user } = await this.svc.authorize(req, schoolId(id), academics);
    parse(uuid, assignmentId);
    const b = parse(z.object({ membershipId: uuid, previousMembershipId: uuid }).strict(), body);
    return this.svc.idempotent(`${user.id}:reassign-teacher:${id}`, key(req), { assignmentId, ...b }, async tx => {
      const assignment = await tx.teachingAssignment.findFirst({ where: { id: assignmentId, schoolId: id } });
      if (!assignment?.subjectId) throw new BadRequestException('Choose a subject assignment. Manage class teachers separately.');
      if (assignment.membershipId !== b.previousMembershipId) throw new ConflictException('This assignment changed. Reload and choose the teacher again.');
      if (!await tx.membership.findFirst({ where: { id: b.membershipId, schoolId: id, role: 'TEACHER', active: true, user: { enabled: true } } })) throw new BadRequestException('Choose an active teacher in this school.');
      if (b.membershipId === assignment.membershipId) return assignment;
      if (await tx.teachingAssignment.findFirst({ where: { schoolId: id, classroomId: assignment.classroomId, subjectId: assignment.subjectId, membershipId: b.membershipId } })) throw new ConflictException('This teacher already teaches this subject in this class.');
      // Keep the assignment ID: syllabus and roster history remain attached, and marks keep their recorded author.
      const updated = await tx.teachingAssignment.update({ where: { id: assignment.id }, data: { membershipId: b.membershipId, confirmedAt: null } });
      await tx.auditEvent.create({ data: { schoolId: id, actorId: user.id, action: 'TEACHER_REASSIGNED', target: `${assignment.id}: ${assignment.membershipId} -> ${b.membershipId}` } });
      return updated;
    });
  }
  @Post('schools/:id/students') async student(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    const { user } = await this.svc.authorize(req, schoolId(id), registrars);
    const b = parse(z.object({ name, admissionNumber: z.string().trim().min(1).max(40), classroomId: uuid, dateOfBirth: date.optional(), gender: z.enum(['M','F']).optional(), address: z.string().trim().max(500).optional() }).strict().refine(v => !v.dateOfBirth || v.dateOfBirth <= new Date().toISOString().slice(0,10), 'Date of birth cannot be in the future.'), body);
    return this.svc.idempotent(user.id + ':student:' + id, key(req), b, async tx => {
      if (!await tx.classroom.findFirst({ where: { id: b.classroomId, schoolId: id } })) throw new BadRequestException('Select a class in an open academic year.');
      const student = await tx.student.create({ data: { schoolId: id, name: b.name, admissionNumber: b.admissionNumber, gender: b.gender, address: b.address, dateOfBirth: b.dateOfBirth ? new Date(b.dateOfBirth) : undefined } });
      await tx.enrollment.create({ data: { schoolId: id, studentId: student.id, classroomId: b.classroomId } });
      await tx.auditEvent.create({ data: { actorId: user.id, schoolId: id, action: 'STUDENT_ENROLLED', target: student.id } }); return student;
    });
  }
  @Get('audit/summary') async auditSummary(@Req() req: Request, @Query() query: unknown) {
    const q = parse(z.object({
      periodDays: z.coerce.number().int().refine(value => [7, 30, 90, 365].includes(value)).default(30),
      schoolId: uuid.optional(),
    }).strict(), query);
    if (q.schoolId) await this.svc.authorize(req, q.schoolId, managers);
    else await this.svc.administrator(req);
    return this.auditLog.summary(q.periodDays, q.schoolId);
  }
  @Get('audit/filter-options') async auditFilterOptions(@Req() req: Request, @Query() query: unknown) {
    await this.svc.administrator(req);
    const q = parse(z.object({
      schoolSearch: z.string().trim().max(100).default(''),
      schoolId: uuid.optional(),
    }).strict(), query);
    return this.auditLog.filterOptions(q.schoolSearch, q.schoolId);
  }
  @Get('audit/export') async exportAudit(@Req() req: Request, @Query() query: unknown, @Res() res: Response) {
    const q = parse(auditQuerySchema, query);
    const actor = q.schoolId ? (await this.svc.authorize(req, q.schoolId, managers)).user : await this.svc.administrator(req);
    const csv = await this.auditLog.export(q, actor.id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="platform-audit.csv"');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(csv);
  }
  @Get('audit/:source/:eventId') async auditDetail(
    @Req() req: Request,
    @Param('source') source: string,
    @Param('eventId') eventId: string,
    @Query() query: unknown,
  ) {
    const q = parse(z.object({ schoolId: uuid.optional() }).strict(), query);
    const eventSource = parse(z.enum(['AUDIT', 'SECURITY']), source) as AuditSource;
    const id = parse(uuid, eventId);
    if (q.schoolId) await this.svc.authorize(req, q.schoolId, managers);
    else await this.svc.administrator(req);
    return this.auditLog.detail(eventSource, id, q.schoolId);
  }
  @Get('audit') async audit(@Req() req: Request, @Query() query: unknown) {
    const q = parse(auditQuerySchema, query);
    if (q.schoolId) await this.svc.authorize(req, q.schoolId, managers);
    else await this.svc.administrator(req);
    return this.auditLog.list({
      ...q,
      category: q.category as AuditCategory | undefined,
    });
  }
  @Post('contact') async contactForm(@Req() req: Request, @Body() body: unknown) {
    const b = parse(z.object({
      fullName: z.string().trim().min(2).max(100),
      emailAddress: email,
      phoneNumber: z.union([z.literal(''), z.string().trim().min(7).max(30).regex(/^\+?[0-9() .-]+$/)]).optional(),
      subject: z.string().trim().max(100),
      message: z.string().trim().min(10).max(2000),
      websiteField: z.literal('').default('')
    }).strict(), body);
    const mail = buildContactInquiryEmail({
      fullName: b.fullName,
      emailAddress: b.emailAddress,
      phoneNumber: b.phoneNumber,
      subject: b.subject,
      message: b.message,
    });
    const settings = await this.svc.db.platformSetting.findUnique({ where: { id: 1 }, select: { supportEmail: true } });
    const recipient = config.CONTACT_NOTIFICATION_EMAIL || settings?.supportEmail?.trim() || config.MAIL_FROM;
    await this.publicForms.submit('contact', b.emailAddress, req.ip ?? req.socket.remoteAddress ?? 'unknown', async tx => {
      await tx.outbox.create({ data: { payload: encrypt(JSON.stringify({ to: recipient, subject: mail.subject, text: mail.text, html: mail.html })) } });
    });
    return { message: 'Thank you for reaching out! Your message has been sent successfully.' };
  }

  @Post('demo-requests') async demoRequest(@Req() req: Request, @Body() body: unknown) {
    const b = parse(demoFields, body);
    const settings = await this.svc.db.platformSetting.findUnique({ where: { id: 1 }, select: { supportEmail: true } });
    const recipient = config.CONTACT_NOTIFICATION_EMAIL || settings?.supportEmail?.trim() || config.MAIL_FROM;
    await this.publicForms.submit('demo', b.contactEmail, req.ip ?? req.socket.remoteAddress ?? 'unknown', async tx => {
      const duplicate = await tx.platformLead.findFirst({ where: { source: 'website-demo-request', contactEmail: b.contactEmail, schoolName: { equals: b.schoolName, mode: 'insensitive' }, createdAt: { gte: new Date(Date.now() - 86400000) } } });
      if (duplicate) return;
      const lead = await tx.platformLead.create({ data: { schoolName: b.schoolName, schoolType: b.schoolType, location: b.location, region: b.region, studentCount: b.studentCount ?? 0,
        schoolWebsite: b.schoolWebsite, contactName: b.contactName, applicantPosition: b.applicantPosition, contactEmail: b.contactEmail, contactPhone: b.contactPhone,
        headmasterName: b.headmasterName, headmasterEmail: b.headmasterEmail, headmasterPhone: b.headmasterPhone,
        preferredDemoMethod: b.preferredDemoMethod, requestMessage: b.requestMessage, source: 'website-demo-request', status: 'new' } });
      await tx.platformLeadActivity.create({ data: { leadId: lead.id, kind: 'website-submitted' } });
      const text = `Hello ${b.contactName},\n\nYour demo request for ${b.schoolName} has been received. The SyncAcademy team will review it and contact you.\n\nSyncAcademy`;
      await tx.outbox.create({ data: { payload: encrypt(JSON.stringify({ to: b.contactEmail, subject: 'SyncAcademy demo request received', text,
        html: `<p>Hello ${escapeHtml(b.contactName)},</p><p>Your demo request for <strong>${escapeHtml(b.schoolName)}</strong> has been received. Our team will review it and contact you.</p><p>SyncAcademy</p>` })) } });
      const internal = buildContactInquiryEmail({ fullName: b.contactName, emailAddress: b.contactEmail, phoneNumber: b.contactPhone, subject: `Demo request: ${b.schoolName}`, message: `School: ${b.schoolName}\nRegion: ${b.region}\nHeadmaster: ${b.headmasterName} (${b.headmasterEmail})\n${b.requestMessage}` });
      await tx.outbox.create({ data: { payload: encrypt(JSON.stringify({ to: recipient, subject: internal.subject, text: internal.text, html: internal.html })) } });
    });
    return { message: 'Your demo request has been received. Our team will contact you.' };
  }
}
