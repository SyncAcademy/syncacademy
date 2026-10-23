import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Put, Query, Req, Res, UnauthorizedException } from '@nestjs/common';
import { CommunicationChannel, Prisma, User } from '@prisma/client';
import { Request, Response } from 'express';
import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { PlatformService } from './platform.service';
import { CommunicationService } from './communication/communication.service';
import { digest, passwordHash, passwordMatches, randomToken } from './security';
import { config } from './config';
import { queueParentInvitation } from './parent-invitations';
import { objectRequest, validateAnnouncementPng } from './announcement-media';

const uuid = z.string().uuid();
const credential = z.string().regex(/^[A-Za-z0-9_-]{20,64}$/);
const password = z.string().min(12).max(128);
const parse = <S extends z.ZodTypeAny>(schema: S, value: unknown): z.output<S> => {
  const result = schema.safeParse(value);
  if (!result.success) throw new BadRequestException(result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; '));
  return result.data;
};
const genericInvitationError = () => new BadRequestException('Invitation is invalid or unavailable.');
const invitationInput = z.object({ guardianId: uuid, channel: z.enum(['SMS', 'WHATSAPP', 'EMAIL']).default('SMS') }).strict();
const announcementInput = z.object({ yearId: uuid, classId: uuid.nullish(), title: z.string().trim().min(3).max(160), body: z.string().trim().min(3).max(5000) }).strict();
const mediaSelect = { id: true, mimeType: true, byteSize: true, width: true, height: true } as const;

@Controller('api/v1')
export class ParentController {
  private readonly dummyHash = passwordHash(randomToken());
  constructor(private readonly svc: PlatformService, private readonly comms: CommunicationService) {}

  private async parent(req: Request) {
    const match = /^Bearer ([A-Za-z0-9_-]{40,100})$/.exec(req.get('Authorization') || '');
    if (!match) throw new UnauthorizedException('Parent sign-in is required.');
    const session = await this.svc.db.parentMobileSession.findUnique({
      where: { tokenHash: digest(match[1]) },
      select: { id: true, userId: true, version: true, expiresAt: true, revokedAt: true,
        user: { select: { id: true, name: true, email: true, enabled: true, sessionVersion: true, mustChangePassword: true, platformAdmin: true, parentAccount: { select: { verifiedAt: true, loginPhone: true } } } } },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.enabled || !session.user.parentAccount || session.user.mustChangePassword || session.version !== session.user.sessionVersion) throw new UnauthorizedException('Parent session expired. Sign in again.');
    return { session, user: session.user };
  }

  private staffCsrf(req: Request) {
    if (!req.session.parentActionCsrf || req.get('x-csrf-token') !== req.session.parentActionCsrf) throw new ForbiddenException('CSRF token is required.');
  }

  @Get('schools/:schoolId/parent-actions/csrf')
  async parentActionCsrf(@Req() req: Request, @Param('schoolId') schoolId: string) {
    await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER', 'ACADEMIC', 'REGISTRAR']);
    req.session.parentActionCsrf = randomToken();
    await new Promise<void>((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
    return { csrfToken: req.session.parentActionCsrf };
  }

  private async child(req: Request, studentId: string) {
    parse(uuid, studentId);
    const { user } = await this.parent(req);
    const link = await this.svc.db.studentGuardian.findFirst({
      where: { studentId, active: true, guardian: { userId: user.id }, school: { active: true }, student: { school: { active: true } } },
      select: { schoolId: true, studentId: true, guardianId: true, canReceiveReports: true, canReceiveFinanceAlert: true, canReceiveAttendanceAlert: true,
        student: { select: { id: true, name: true, admissionNumber: true, gender: true, school: { select: { id: true, name: true } } } } },
    });
    if (!link) throw new NotFoundException('Child record unavailable.');
    return { user, link };
  }

  private async notificationScope(userId: string): Promise<Prisma.ParentNotificationWhereInput> {
    const links = await this.svc.db.studentGuardian.findMany({ where: { active: true, guardian: { userId }, school: { active: true } }, take: 100, select: { schoolId: true, studentId: true } });
    if (!links.length) return { id: { in: [] } };
    return { OR: links.flatMap(link => [{ schoolId: link.schoolId, studentId: link.studentId }, { schoolId: link.schoolId, studentId: null }]) };
  }

  private async announcementScope(userId: string): Promise<Prisma.ParentAnnouncementWhereInput> {
    const links = await this.svc.db.studentGuardian.findMany({ where: { active: true, guardian: { userId }, school: { active: true } }, take: 100, select: { schoolId: true, student: { select: { enrollments: { where: { status: 'active' }, select: { classroomId: true, classroom: { select: { yearId: true } } } } } } } });
    const scopes = links.flatMap(link => link.student.enrollments.flatMap(enrollment => [
      { schoolId: link.schoolId, yearId: enrollment.classroom.yearId, classId: null },
      { schoolId: link.schoolId, yearId: enrollment.classroom.yearId, classId: enrollment.classroomId },
    ]));
    return scopes.length ? { OR: scopes } : { id: { in: [] } };
  }

  private invitationLookup(tokenOrCode: string): Prisma.ParentInvitationWhereInput {
    return { OR: [{ tokenHash: digest(tokenOrCode) }, { codeHash: digest(tokenOrCode.toUpperCase()) }] };
  }

  private async activeInvitation(tokenOrCode: string) {
    const invitation = await this.svc.db.parentInvitation.findFirst({ where: this.invitationLookup(tokenOrCode),
      include: { school: { select: { active: true } }, guardian: { select: { id: true, schoolId: true, userId: true, phone: true, whatsappPhone: true, email: true } } } });
    if (!invitation || invitation.consumedAt || invitation.revokedAt || invitation.expiresAt <= new Date() || !invitation.school.active || invitation.attempts >= 5) throw genericInvitationError();
    const destination = invitation.channel === 'EMAIL' ? invitation.guardian.email : invitation.channel === 'WHATSAPP' ? invitation.guardian.whatsappPhone : invitation.guardian.phone;
    if (destination !== invitation.destination) throw genericInvitationError();
    const link = await this.svc.db.studentGuardian.findFirst({ where: { schoolId: invitation.schoolId, guardianId: invitation.guardianId, active: true }, select: { id: true } });
    if (!link) throw genericInvitationError();
    return invitation;
  }

  private async issueInvitation(schoolId: string, guardianId: string, channel: CommunicationChannel, actorId: string) {
    return this.svc.atomic(tx => queueParentInvitation(tx, this.comms, schoolId, guardianId, channel, actorId));
  }

  @Post('schools/:schoolId/parent-invitations')
  async invite(@Req() req: Request, @Param('schoolId') schoolId: string, @Body() body: unknown) {
    const { user } = await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER', 'ACADEMIC', 'REGISTRAR']);
    this.staffCsrf(req);
    const input = parse(invitationInput, body);
    await this.svc.rate(`parent-invite:${user.id}`, 100, 3600);
    return this.issueInvitation(schoolId, input.guardianId, input.channel, user.id);
  }

  @Post('schools/:schoolId/parent-invitation-batches')
  async createBatch(@Req() req: Request, @Param('schoolId') schoolId: string, @Body() body: unknown) {
    const { user } = await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER', 'ACADEMIC', 'REGISTRAR']);
    this.staffCsrf(req);
    const b = parse(z.object({ yearId: uuid, classId: uuid.optional(), studentIds: z.array(uuid).min(1).max(100).optional(), channel: z.enum(['SMS', 'WHATSAPP', 'EMAIL']).default('SMS') }).strict(), body);
    await this.svc.rate(`parent-batch:${user.id}`, 10, 3600);
    if (b.studentIds && new Set(b.studentIds).size !== b.studentIds.length) throw new BadRequestException('Select each student once.');
    const year = await this.svc.db.academicYear.findFirst({ where: { id: b.yearId, schoolId }, select: { id: true } });
    if (!year) throw new NotFoundException('Academic year unavailable.');
    if (b.classId && !await this.svc.db.classroom.findFirst({ where: { id: b.classId, schoolId, yearId: b.yearId }, select: { id: true } })) throw new NotFoundException('Class unavailable.');
    if (b.studentIds) {
      const rows = await this.svc.db.enrollment.findMany({ where: { schoolId, status: 'active', classroom: { yearId: b.yearId }, ...(b.classId ? { classroomId: b.classId } : {}), studentId: { in: b.studentIds } }, distinct: ['studentId'], select: { studentId: true } });
      if (rows.length !== b.studentIds.length) throw new BadRequestException('Every selected student must be actively enrolled in the selected scope.');
    }
    const batch = await this.svc.db.parentInvitationBatch.create({ data: { schoolId, yearId: b.yearId, classId: b.classId, selectedStudentIds: b.studentIds ?? Prisma.JsonNull, channel: b.channel, requestedBy: user.id }, select: { id: true, status: true, createdAt: true } });
    await this.svc.db.auditEvent.create({ data: { schoolId, actorId: user.id, action: 'PARENT_INVITATION_BATCH_CREATED', target: batch.id } });
    return { jobId: batch.id, status: batch.status, createdAt: batch.createdAt };
  }

  @Get('schools/:schoolId/parent-invitation-batches/:batchId')
  async batchStatus(@Req() req: Request, @Param('schoolId') schoolId: string, @Param('batchId') batchId: string) {
    await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER', 'ACADEMIC', 'REGISTRAR']);
    parse(uuid, batchId);
    const batch = await this.svc.db.parentInvitationBatch.findFirst({ where: { id: batchId, schoolId }, select: { id: true, status: true, scanned: true, queued: true, skipped: true, failed: true, createdAt: true, completedAt: true } });
    if (!batch) throw new NotFoundException('Invitation batch unavailable.');
    return batch;
  }

  @Post('schools/:schoolId/parent-announcements')
  async publishAnnouncement(@Req() req: Request, @Param('schoolId') schoolId: string, @Body() body: unknown) {
    const { user } = await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER', 'ACADEMIC']);
    this.staffCsrf(req);
    const b = parse(announcementInput.extend({ draft: z.boolean().optional() }), body);
    if (!await this.svc.db.academicYear.findFirst({ where: { id: b.yearId, schoolId }, select: { id: true } })) throw new NotFoundException('Academic year unavailable.');
    if (b.classId && !await this.svc.db.classroom.findFirst({ where: { id: b.classId, schoolId, yearId: b.yearId }, select: { id: true } })) throw new NotFoundException('Class unavailable.');
    return this.svc.atomic(async tx => {
      const announcement = await tx.parentAnnouncement.create({ data: { schoolId, yearId: b.yearId, classId: b.classId, title: b.title, body: b.body, createdBy: user.id, ...(b.draft ? { publishedAt: null } : {}) }, select: { id: true, title: true, publishedAt: true } });
      await tx.auditEvent.create({ data: { schoolId, actorId: user.id, action: b.draft ? 'PARENT_ANNOUNCEMENT_DRAFTED' : 'PARENT_ANNOUNCEMENT_PUBLISHED', target: announcement.id } });
      return announcement;
    });
  }

  @Get('schools/:schoolId/parent-announcements')
  async staffAnnouncements(@Req() req: Request, @Param('schoolId') schoolId: string, @Query() query: unknown) {
    await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER', 'ACADEMIC']);
    const q = parse(z.object({ cursor: uuid.optional(), limit: z.coerce.number().int().min(1).max(50).default(25) }).strict(), query);
    const items = await this.svc.db.parentAnnouncement.findMany({ where: { schoolId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: q.limit + 1, ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}), select: { id: true, schoolId: true, yearId: true, classId: true, title: true, body: true, publishedAt: true, unpublishedAt: true, createdAt: true, media: { select: mediaSelect } } });
    return { items: items.slice(0, q.limit), nextCursor: items.length > q.limit ? items[q.limit - 1].id : null };
  }

  @Get('schools/:schoolId/parent-announcements/:announcementId')
  async staffAnnouncement(@Req() req: Request, @Param('schoolId') schoolId: string, @Param('announcementId') announcementId: string) {
    await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER', 'ACADEMIC']);
    const item = await this.svc.db.parentAnnouncement.findFirst({ where: { id: parse(uuid, announcementId), schoolId }, select: { id: true, schoolId: true, yearId: true, classId: true, title: true, body: true, publishedAt: true, unpublishedAt: true, createdAt: true, media: { select: mediaSelect } } });
    if (!item) throw new NotFoundException('Announcement unavailable.');
    return item;
  }

  @Patch('schools/:schoolId/parent-announcements/:announcementId')
  async editAnnouncement(@Req() req: Request, @Param('schoolId') schoolId: string, @Param('announcementId') announcementId: string, @Body() body: unknown) {
    const { user } = await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER', 'ACADEMIC']);
    this.staffCsrf(req);
    const b = parse(announcementInput.pick({ title: true, body: true }).partial().refine(v => Object.keys(v).length > 0), body);
    return this.svc.atomic(async tx => {
      const row = await tx.parentAnnouncement.findFirst({ where: { id: parse(uuid, announcementId), schoolId, unpublishedAt: null }, select: { id: true } });
      if (!row) throw new NotFoundException('Announcement unavailable.');
      const changed = await tx.parentAnnouncement.update({ where: { id: row.id }, data: b, select: { id: true, title: true, body: true, publishedAt: true } });
      await tx.auditEvent.create({ data: { schoolId, actorId: user.id, action: 'PARENT_ANNOUNCEMENT_EDITED', target: row.id } });
      return changed;
    });
  }

  @Post('schools/:schoolId/parent-announcements/:announcementId/publish')
  async publishDraft(@Req() req: Request, @Param('schoolId') schoolId: string, @Param('announcementId') announcementId: string) {
    const { user } = await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER', 'ACADEMIC']);
    this.staffCsrf(req);
    return this.svc.atomic(async tx => {
      const changed = await tx.parentAnnouncement.updateMany({ where: { id: parse(uuid, announcementId), schoolId, publishedAt: null, unpublishedAt: null }, data: { publishedAt: new Date() } });
      if (!changed.count) throw new ConflictException('Draft is unavailable.');
      await tx.auditEvent.create({ data: { schoolId, actorId: user.id, action: 'PARENT_ANNOUNCEMENT_PUBLISHED', target: announcementId } });
      return { published: true };
    });
  }

  @Post('schools/:schoolId/parent-announcements/:announcementId/unpublish')
  async unpublishAnnouncement(@Req() req: Request, @Param('schoolId') schoolId: string, @Param('announcementId') announcementId: string) {
    const { user } = await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER', 'ACADEMIC']);
    this.staffCsrf(req);
    return this.svc.atomic(async tx => {
      const changed = await tx.parentAnnouncement.updateMany({ where: { id: parse(uuid, announcementId), schoolId, unpublishedAt: null }, data: { unpublishedAt: new Date(), notificationCompleteAt: new Date() } });
      if (!changed.count) throw new NotFoundException('Announcement unavailable.');
      await tx.auditEvent.create({ data: { schoolId, actorId: user.id, action: 'PARENT_ANNOUNCEMENT_UNPUBLISHED', target: announcementId } });
      return { unpublished: true };
    });
  }

  @Put('schools/:schoolId/parent-announcements/:announcementId/media')
  async uploadAnnouncementMedia(@Req() req: Request, @Param('schoolId') schoolId: string, @Param('announcementId') announcementId: string, @Body() body: unknown) {
    const { user } = await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER', 'ACADEMIC']);
    this.staffCsrf(req);
    await this.svc.rate(`announcement-media:${user.id}`, 20, 3600);
    if (!Buffer.isBuffer(body)) throw new BadRequestException('PNG upload is required.');
    const image = validateAnnouncementPng(body);
    const id = parse(uuid, announcementId);
    const row = await this.svc.db.parentAnnouncement.findFirst({ where: { id, schoolId, publishedAt: null, unpublishedAt: null }, select: { id: true, media: { select: { id: true } } } });
    if (!row || row.media) throw new ConflictException('An unpublished draft without media is required.');
    const key = `announcements/${schoolId}/${randomUUID()}.png`;
    await objectRequest('PUT', key, image.bytes);
    try {
      const media = await this.svc.atomic(async tx => {
        const fresh = await tx.parentAnnouncement.findFirst({ where: { id, schoolId, publishedAt: null, unpublishedAt: null, media: null }, select: { id: true } });
        if (!fresh) throw new ConflictException('Draft changed during upload.');
        const created = await tx.parentAnnouncementMedia.create({ data: { schoolId, announcementId: id, storageKey: key, mimeType: 'image/png', byteSize: image.bytes.length, width: image.width, height: image.height }, select: mediaSelect });
        await tx.auditEvent.create({ data: { schoolId, actorId: user.id, action: 'PARENT_ANNOUNCEMENT_MEDIA_UPLOADED', target: id } });
        return created;
      });
      return media;
    } catch (error) { await objectRequest('DELETE', key).catch(() => undefined); throw error; }
  }

  @Get('schools/:schoolId/parent-invitations')
  async invitationList(@Req() req: Request, @Param('schoolId') schoolId: string, @Query() query: unknown) {
    await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER', 'ACADEMIC', 'REGISTRAR']);
    const q = parse(z.object({ cursor: uuid.optional(), limit: z.coerce.number().int().min(1).max(50).default(25) }).strict(), query);
    const items = await this.svc.db.parentInvitation.findMany({ where: { schoolId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: q.limit + 1, ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}), select: { id: true, guardianId: true, channel: true, createdAt: true, expiresAt: true, consumedAt: true, revokedAt: true } });
    return { items: items.slice(0, q.limit), nextCursor: items.length > q.limit ? items[q.limit - 1].id : null };
  }

  @Post('schools/:schoolId/parent-invitations/:invitationId/revoke')
  async revoke(@Req() req: Request, @Param('schoolId') schoolId: string, @Param('invitationId') invitationId: string) {
    const { user } = await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER', 'ACADEMIC', 'REGISTRAR']);
    this.staffCsrf(req);
    parse(uuid, invitationId);
    return this.svc.atomic(async tx => {
      const changed = await tx.parentInvitation.updateMany({ where: { id: invitationId, schoolId, consumedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
      if (!changed.count) throw new NotFoundException('Pending invitation unavailable.');
      await tx.outbox.updateMany({ where: { idempotencyKey: `parent-invitation:${invitationId}`, sentAt: null, cancelledAt: null }, data: { cancelledAt: new Date(), payload: '' } });
      await tx.auditEvent.create({ data: { schoolId, actorId: user.id, action: 'PARENT_INVITATION_REVOKED', target: invitationId } });
      return { revoked: true };
    });
  }

  @Post('schools/:schoolId/parent-invitations/:invitationId/resend')
  async resend(@Req() req: Request, @Param('schoolId') schoolId: string, @Param('invitationId') invitationId: string) {
    const { user } = await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER', 'ACADEMIC', 'REGISTRAR']);
    this.staffCsrf(req);
    parse(uuid, invitationId);
    await this.svc.rate(`parent-resend:${user.id}`, 30, 3600);
    return this.svc.atomic(async tx => {
      const current = await tx.parentInvitation.findFirst({ where: { id: invitationId, schoolId, consumedAt: null, revokedAt: null }, include: { guardian: { select: { phone: true, whatsappPhone: true, email: true, optOutSms: true, optOutWhatsapp: true } } } });
      if (!current) throw new NotFoundException('Pending invitation unavailable.');
      await tx.$queryRaw`SELECT id FROM "Guardian" WHERE id = ${current.guardianId}::uuid AND "schoolId" = ${schoolId}::uuid FOR UPDATE`;
      const destination = current.channel === 'EMAIL' ? current.guardian.email : current.channel === 'WHATSAPP' ? current.guardian.whatsappPhone : current.guardian.phone;
      if (!destination || (current.channel === 'SMS' && current.guardian.optOutSms) || (current.channel === 'WHATSAPP' && current.guardian.optOutWhatsapp)) throw new BadRequestException('Guardian cannot receive the selected channel.');
      const token = randomToken();
      const code = randomBytes(16).toString('hex').toUpperCase();
      const updated = await tx.parentInvitation.update({ where: { id: invitationId }, data: { tokenHash: digest(token), codeHash: digest(code), destination, expiresAt: new Date(Date.now() + 48 * 3600000), attempts: 0 } });
      await tx.outbox.updateMany({ where: { idempotencyKey: `parent-invitation:${invitationId}`, sentAt: null, cancelledAt: null }, data: { cancelledAt: new Date(), payload: '' } });
      await this.comms.enqueueMessage(tx, { schoolId, guardianId: current.guardianId, channel: current.channel, recipient: destination, subject: 'SyncAcademy parent invitation', body: `SyncAcademy parent invitation. Open the app and enter code ${code}, or use ${config.APP_ORIGIN}/parent/activate?token=${token}. This invitation expires in 48 hours. A separate verification code is required.`, idempotencyKey: `parent-invitation:${invitationId}` });
      await tx.auditEvent.create({ data: { schoolId, actorId: user.id, action: 'PARENT_INVITATION_RESENT', target: invitationId } });
      return { id: updated.id, expiresAt: updated.expiresAt };
    });
  }

  @Post('parent/invitations/challenge')
  async challenge(@Req() req: Request, @Body() body: unknown) {
    const b = parse(z.object({ credential }).strict(), body);
    await this.svc.rate(`parent-challenge-ip:${req.ip}`, 20, 900);
    const invitation = await this.activeInvitation(b.credential);
    await this.svc.rate(`parent-challenge:${invitation.id}`, 5, 900);
    const result = await this.comms.requestVerification(invitation.schoolId, invitation.guardianId, invitation.channel, invitation.invitedBy);
    return { challengeRequired: true, channel: result.channel, maskedDestination: result.destination, expiresAt: invitation.expiresAt };
  }

  @Post('parent/invitations/activate')
  async activate(@Req() req: Request, @Body() body: unknown) {
    const b = parse(z.object({ credential, code: z.string().regex(/^\d{6}$/), password }).strict(), body);
    await this.svc.rate(`parent-activate-ip:${req.ip}`, 20, 900);
    const invitation = await this.activeInvitation(b.credential);
    const existingAccount = invitation.guardian.userId
      ? await this.svc.db.user.findUnique({ where: { id: invitation.guardian.userId }, include: { parentAccount: true } })
      : await this.svc.db.user.findFirst({ where: { parentAccount: { loginPhone: invitation.guardian.phone } }, include: { parentAccount: true } })
        || (invitation.guardian.email ? await this.svc.db.user.findUnique({ where: { email: invitation.guardian.email.toLowerCase() }, include: { parentAccount: true } }) : null);
    if (existingAccount && (!existingAccount.enabled || !existingAccount.parentAccount || !await passwordMatches(existingAccount.passwordHash, b.password))) throw new UnauthorizedException('Account verification failed.');
    const hash = existingAccount ? null : await passwordHash(b.password);
    const account = await this.svc.atomic(async tx => {
      await tx.$queryRaw`SELECT id FROM "ParentInvitation" WHERE id = ${invitation.id}::uuid FOR UPDATE`;
      const fresh = await tx.parentInvitation.findFirst({ where: { id: invitation.id, schoolId: invitation.schoolId, consumedAt: null, revokedAt: null, expiresAt: { gt: new Date() }, attempts: { lt: 5 } } });
      if (!fresh) throw genericInvitationError();
      const challenge = await tx.contactVerification.findFirst({ where: { schoolId: fresh.schoolId, guardianId: fresh.guardianId, channel: fresh.channel, destination: fresh.destination, verifiedAt: null }, orderBy: { createdAt: 'desc' } });
      if (!challenge || challenge.expiresAt <= new Date() || challenge.attempts >= 5) throw new BadRequestException('Verification code expired or unavailable.');
      if (challenge.codeHash !== digest(b.code)) {
        await tx.contactVerification.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
        await tx.parentInvitation.update({ where: { id: fresh.id }, data: { attempts: { increment: 1 } } });
        return null;
      }
      const guardian = await tx.guardian.findFirst({ where: { id: fresh.guardianId, schoolId: fresh.schoolId }, select: { id: true, userId: true, name: true, phone: true, email: true, students: { where: { schoolId: fresh.schoolId, active: true }, take: 1, select: { id: true } } } });
      if (!guardian || !guardian.students.length || guardian.userId && existingAccount?.id !== guardian.userId) throw genericInvitationError();
      let user: User;
      if (existingAccount) {
        user = existingAccount;
      } else {
        const email = guardian.email?.toLowerCase() || `parent-${fresh.id}@accounts.invalid`;
        user = await tx.user.create({ data: { name: guardian.name, email, passwordHash: hash!, enabled: true, parentAccount: { create: { loginPhone: guardian.phone } } } });
      }
      await tx.guardian.update({ where: { id_schoolId: { id: guardian.id, schoolId: fresh.schoolId } }, data: { userId: user.id, ...(fresh.channel === 'EMAIL' ? { emailVerifiedAt: new Date() } : fresh.channel === 'SMS' ? { phoneVerifiedAt: new Date() } : { whatsappVerifiedAt: new Date() }) } });
      await tx.membership.upsert({ where: { userId_schoolId_role: { userId: user.id, schoolId: fresh.schoolId, role: 'PARENT' } }, create: { userId: user.id, schoolId: fresh.schoolId, role: 'PARENT', active: true }, update: { active: true } });
      await tx.contactVerification.update({ where: { id: challenge.id }, data: { verifiedAt: new Date() } });
      await tx.parentInvitation.update({ where: { id: fresh.id }, data: { consumedAt: new Date() } });
      await tx.auditEvent.create({ data: { schoolId: fresh.schoolId, actorId: user.id, action: 'PARENT_INVITATION_ACTIVATED', target: fresh.id } });
      return user;
    });
    if (!account) throw new BadRequestException('Verification code is invalid.');
    return { activated: true, signInRequired: true };
  }

  @Post('parent/auth/login')
  async login(@Req() req: Request, @Body() body: unknown) {
    const b = parse(z.object({ identifier: z.string().trim().min(5).max(254), password: z.string().min(1).max(128) }).strict(), body);
    const identifier = b.identifier.toLowerCase();
    await this.svc.rate(`parent-login-ip:${req.ip}`, 30, 900);
    await this.svc.rate(`parent-login-account:${identifier}`, 10, 900);
    const account = identifier.includes('@') ? await this.svc.db.user.findUnique({ where: { email: identifier }, include: { parentAccount: true } }) : await this.svc.db.user.findFirst({ where: { parentAccount: { loginPhone: identifier } }, include: { parentAccount: true } });
    const matches = await passwordMatches(account?.passwordHash || await this.dummyHash, b.password);
    const valid = account?.parentAccount && account.enabled && !account.mustChangePassword && matches;
    if (!valid) throw new UnauthorizedException('Sign-in failed.');
    const link = await this.svc.db.studentGuardian.findFirst({ where: { active: true, guardian: { userId: account.id }, school: { active: true } }, select: { id: true } });
    if (!link) throw new UnauthorizedException('Sign-in failed.');
    const token = randomToken();
    await this.svc.db.parentMobileSession.create({ data: { userId: account.id, tokenHash: digest(token), version: account.sessionVersion, expiresAt: new Date(Date.now() + 30 * 86400000) } });
    await this.svc.db.auditEvent.create({ data: { actorId: account.id, action: 'PARENT_MOBILE_LOGIN', target: account.id } });
    return { accessToken: token, tokenType: 'Bearer', expiresIn: 30 * 86400 };
  }

  @Post('parent/auth/recovery/request')
  async requestRecovery(@Req() req: Request, @Body() body: unknown) {
    const b = parse(z.object({ identifier: z.string().trim().min(5).max(254) }).strict(), body);
    const identifier = b.identifier.toLowerCase();
    await this.svc.rate(`parent-recovery-ip:${req.ip}`, 10, 900);
    await this.svc.rate(`parent-recovery-account:${identifier}`, 3, 3600);
    const account = identifier.includes('@') ? await this.svc.db.user.findUnique({ where: { email: identifier }, include: { parentAccount: true } }) : await this.svc.db.user.findFirst({ where: { parentAccount: { loginPhone: identifier } }, include: { parentAccount: true } });
    if (account?.enabled && account.parentAccount) {
      const guardian = await this.svc.db.guardian.findFirst({ where: { userId: account.id, school: { active: true }, students: { some: { active: true } }, ...(identifier.includes('@') ? { email: identifier, emailVerifiedAt: { not: null } } : { phone: identifier, phoneVerifiedAt: { not: null } }) }, select: { id: true, schoolId: true } });
      if (guardian) {
        const channel: CommunicationChannel = identifier.includes('@') ? 'EMAIL' : 'SMS';
        const code = String(randomInt(10000000, 100000000));
        await this.svc.atomic(async tx => {
          const previous = await tx.parentRecoveryChallenge.findMany({ where: { userId: account.id, usedAt: null }, select: { id: true } });
          await tx.parentRecoveryChallenge.updateMany({ where: { userId: account.id, usedAt: null }, data: { usedAt: new Date() } });
          if (previous.length) await tx.outbox.updateMany({ where: { idempotencyKey: { in: previous.map(row => `parent-recovery:${row.id}`) }, sentAt: null, cancelledAt: null }, data: { cancelledAt: new Date(), payload: '' } });
          const challenge = await tx.parentRecoveryChallenge.create({ data: { userId: account.id, schoolId: guardian.schoolId, guardianId: guardian.id, channel, destination: identifier, codeHash: digest(code), expiresAt: new Date(Date.now() + 15 * 60000) } });
          await this.comms.enqueueMessage(tx, { schoolId: guardian.schoolId, guardianId: guardian.id, channel, recipient: identifier, subject: 'SyncAcademy parent password recovery', body: `SyncAcademy parent recovery code: ${code}. Valid for 15 minutes. Do not share this code.`, idempotencyKey: `parent-recovery:${challenge.id}` });
          await tx.auditEvent.create({ data: { schoolId: guardian.schoolId, actorId: account.id, action: 'PARENT_RECOVERY_REQUESTED', target: challenge.id } });
        });
      }
    }
    return { message: 'If this parent account has a verified contact, a recovery code will be sent.' };
  }

  @Post('parent/auth/recovery/confirm')
  async confirmRecovery(@Req() req: Request, @Body() body: unknown) {
    const b = parse(z.object({ identifier: z.string().trim().min(5).max(254), code: z.string().regex(/^\d{8}$/), password }).strict(), body);
    const identifier = b.identifier.toLowerCase();
    await this.svc.rate(`parent-recovery-confirm-ip:${req.ip}`, 20, 900);
    await this.svc.rate(`parent-recovery-confirm-account:${identifier}`, 8, 900);
    const account = identifier.includes('@') ? await this.svc.db.user.findUnique({ where: { email: identifier }, include: { parentAccount: true } }) : await this.svc.db.user.findFirst({ where: { parentAccount: { loginPhone: identifier } }, include: { parentAccount: true } });
    if (!account?.enabled || !account.parentAccount) throw new BadRequestException('Recovery code is invalid or expired.');
    const hash = await passwordHash(b.password);
    const changed = await this.svc.atomic(async tx => {
      const challenge = await tx.parentRecoveryChallenge.findFirst({ where: { userId: account.id, destination: identifier, usedAt: null }, orderBy: { createdAt: 'desc' } });
      if (!challenge || challenge.expiresAt <= new Date() || challenge.attempts >= 5) throw new BadRequestException('Recovery code is invalid or expired.');
      await tx.$queryRaw`SELECT id FROM "ParentRecoveryChallenge" WHERE id = ${challenge.id}::uuid FOR UPDATE`;
      const fresh = await tx.parentRecoveryChallenge.findFirst({ where: { id: challenge.id, usedAt: null, expiresAt: { gt: new Date() }, attempts: { lt: 5 } } });
      if (!fresh) throw new BadRequestException('Recovery code is invalid or expired.');
      if (fresh.codeHash !== digest(b.code)) {
        await tx.parentRecoveryChallenge.update({ where: { id: fresh.id }, data: { attempts: { increment: 1 } } });
        return false;
      }
      const guardian = await tx.guardian.findFirst({ where: { id: fresh.guardianId, schoolId: fresh.schoolId, userId: account.id, school: { active: true }, students: { some: { active: true } } }, select: { phone: true, phoneVerifiedAt: true, email: true, emailVerifiedAt: true } });
      const validContact = fresh.channel === 'EMAIL' ? guardian?.email === fresh.destination && !!guardian.emailVerifiedAt : guardian?.phone === fresh.destination && !!guardian.phoneVerifiedAt;
      if (!validContact) throw new BadRequestException('Recovery code is invalid or expired.');
      await tx.parentRecoveryChallenge.updateMany({ where: { userId: account.id, usedAt: null }, data: { usedAt: new Date() } });
      await tx.user.update({ where: { id: account.id }, data: { passwordHash: hash, sessionVersion: { increment: 1 } } });
      await tx.parentMobileSession.updateMany({ where: { userId: account.id, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.auditEvent.create({ data: { schoolId: fresh.schoolId, actorId: account.id, action: 'PARENT_PASSWORD_RECOVERED', target: account.id } });
      return true;
    });
    if (!changed) throw new BadRequestException('Recovery code is invalid or expired.');
    return { changed: true, signInRequired: true };
  }

  @Get('parent/auth/me')
  async me(@Req() req: Request) {
    const { user } = await this.parent(req);
    return { id: user.id, name: user.name, email: user.email.endsWith('@accounts.invalid') ? null : user.email, phone: user.parentAccount?.loginPhone, verified: true };
  }

  @Post('parent/auth/logout')
  async logout(@Req() req: Request) {
    const { session, user } = await this.parent(req);
    await this.svc.db.parentMobileSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    await this.svc.db.auditEvent.create({ data: { actorId: user.id, action: 'PARENT_MOBILE_LOGOUT', target: session.id } });
    return { signedOut: true };
  }

  @Post('parent/auth/renew')
  async renew(@Req() req: Request) {
    const { session } = await this.parent(req);
    const token = randomToken();
    const expiresAt = new Date(Date.now() + 30 * 86400000);
    const changed = await this.svc.db.parentMobileSession.updateMany({ where: { id: session.id, revokedAt: null, expiresAt: { gt: new Date() } }, data: { tokenHash: digest(token), expiresAt } });
    if (!changed.count) throw new UnauthorizedException('Parent session expired. Sign in again.');
    return { accessToken: token, tokenType: 'Bearer', expiresIn: 30 * 86400 };
  }

  @Post('parent/auth/revoke-all')
  async revokeAll(@Req() req: Request, @Body() body: unknown) {
    const { user } = await this.parent(req);
    const b = parse(z.object({ password: z.string().min(1).max(128) }).strict(), body);
    await this.svc.rate(`parent-revoke:${user.id}`, 6, 900);
    const current = await this.svc.db.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
    if (!await passwordMatches(current.passwordHash, b.password)) throw new UnauthorizedException('Account verification failed.');
    await this.svc.atomic(async tx => {
      await tx.user.update({ where: { id: user.id }, data: { sessionVersion: { increment: 1 } } });
      await tx.parentMobileSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.auditEvent.create({ data: { actorId: user.id, action: 'PARENT_SESSIONS_REVOKED', target: user.id } });
    });
    return { revoked: true, signInRequired: true };
  }

  @Patch('parent/profile')
  async updateProfile(@Req() req: Request, @Body() body: unknown) {
    const { user } = await this.parent(req);
    const b = parse(z.object({ name: z.string().trim().min(2).max(150) }).strict(), body);
    const updated = await this.svc.atomic(async tx => {
      const updated = await tx.user.update({ where: { id: user.id }, data: { name: b.name }, select: { id: true, name: true } });
      await tx.auditEvent.create({ data: { actorId: user.id, action: 'PARENT_PROFILE_UPDATED', target: user.id } });
      return updated;
    });
    return updated;
  }

  @Post('parent/auth/change-password')
  async changePassword(@Req() req: Request, @Body() body: unknown) {
    const { user } = await this.parent(req);
    const b = parse(z.object({ currentPassword: z.string().min(1).max(128), password }).strict(), body);
    await this.svc.rate(`parent-password:${user.id}`, 6, 900);
    const current = await this.svc.db.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!await passwordMatches(current.passwordHash, b.currentPassword) || b.currentPassword === b.password) throw new BadRequestException('Password change could not be completed.');
    const hash = await passwordHash(b.password);
    await this.svc.atomic(async tx => {
      await tx.user.update({ where: { id: user.id }, data: { passwordHash: hash, sessionVersion: { increment: 1 } } });
      await tx.parentMobileSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.auditEvent.create({ data: { actorId: user.id, action: 'PARENT_PASSWORD_CHANGED', target: user.id } });
    });
    return { changed: true, signInRequired: true };
  }

  @Get('parent/children')
  async children(@Req() req: Request) {
    const { user } = await this.parent(req);
    const links = await this.svc.db.studentGuardian.findMany({ where: { active: true, guardian: { userId: user.id }, school: { active: true } }, take: 100,
      select: { schoolId: true, studentId: true, relationship: true, student: { select: { name: true, admissionNumber: true, school: { select: { name: true } }, enrollments: { where: { status: 'active' }, orderBy: { createdAt: 'desc' }, take: 1, select: { classroom: { select: { id: true, name: true, year: { select: { id: true, name: true } } } } } } } } } });
    return { items: links.map(link => ({ id: link.studentId, name: link.student.name, admissionNumber: link.student.admissionNumber, relationship: link.relationship, school: { id: link.schoolId, name: link.student.school.name }, classroom: link.student.enrollments[0]?.classroom ?? null })) };
  }

  @Get('parent/children/:studentId')
  async childDetails(@Req() req: Request, @Param('studentId') studentId: string) {
    const { link } = await this.child(req, studentId);
    const enrollment = await this.svc.db.enrollment.findFirst({ where: { schoolId: link.schoolId, studentId, status: 'active' }, orderBy: { createdAt: 'desc' }, select: { classroom: { select: { id: true, name: true, year: { select: { id: true, name: true } } } } } });
    return { ...link.student, classroom: enrollment?.classroom ?? null };
  }

  @Get('parent/children/:studentId/home')
  async home(@Req() req: Request, @Param('studentId') studentId: string) {
    const { user, link } = await this.child(req, studentId);
    const enrollment = await this.svc.db.enrollment.findFirst({ where: { schoolId: link.schoolId, studentId, status: 'active' }, orderBy: { createdAt: 'desc' }, select: { classroomId: true, classroom: { select: { name: true, yearId: true, year: { select: { name: true } } } } } });
    const [charges, payments, adjustments, resultCount, unread, announcements] = await Promise.all([
      link.canReceiveFinanceAlert ? this.svc.db.studentCharge.aggregate({ where: { schoolId: link.schoolId, studentId }, _sum: { amount: true } }) : null,
      link.canReceiveFinanceAlert ? this.svc.db.payment.aggregate({ where: { schoolId: link.schoolId, studentId, voidAt: null }, _sum: { amount: true } }) : null,
      link.canReceiveFinanceAlert ? this.svc.db.adjustment.aggregate({ where: { schoolId: link.schoolId, studentId }, _sum: { amount: true } }) : null,
      link.canReceiveReports ? this.svc.db.reportAccessLink.count({ where: { schoolId: link.schoolId, studentId, guardianId: link.guardianId, revokedAt: null, expiresAt: { gt: new Date() } } }) : 0,
      this.svc.db.parentNotification.count({ where: { userId: user.id, readAt: null, ...await this.notificationScope(user.id) } }),
      enrollment ? this.svc.db.parentAnnouncement.findMany({ where: { schoolId: link.schoolId, yearId: enrollment.classroom.yearId, OR: [{ classId: null }, { classId: enrollment.classroomId }], publishedAt: { lte: new Date() }, AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }] }, orderBy: { publishedAt: 'desc' }, take: 3, select: { id: true, title: true, publishedAt: true } }) : [],
    ]);
    const billed = charges?._sum.amount ?? 0;
    const paid = payments?._sum.amount ?? 0;
    const adjusted = adjustments?._sum.amount ?? 0;
    const attendance = enrollment && link.canReceiveAttendanceAlert ? await this.svc.db.$queryRaw<Array<{ date: string; status: string }>>`SELECT attendance->>'date' AS date, entry->>'status' AS status FROM "AcademicWorkspace" aw CROSS JOIN LATERAL jsonb_array_elements(COALESCE(aw.data->'attendance', '[]'::jsonb)) attendance CROSS JOIN LATERAL jsonb_array_elements(COALESCE(attendance->'entries', '[]'::jsonb)) entry WHERE aw."schoolId" = ${link.schoolId}::uuid AND aw."yearId" = ${enrollment.classroom.yearId}::uuid AND attendance->>'classId' = ${enrollment.classroomId} AND entry->>'studentId' = ${studentId} ORDER BY attendance->>'date' DESC, (attendance->>'revision')::int DESC LIMIT 1` : [];
    return { child: { ...link.student, classroom: enrollment?.classroom ?? null }, results: { publishedCount: resultCount }, fees: link.canReceiveFinanceAlert ? { billed, paid, adjusted, balance: billed + adjusted - paid } : null, attendance: { latest: attendance[0] ?? null }, announcements, unreadNotificationCount: unread };
  }

  @Get('parent/children/:studentId/fees')
  async fees(@Req() req: Request, @Param('studentId') studentId: string, @Query() query: unknown) {
    const { link } = await this.child(req, studentId);
    if (!link.canReceiveFinanceAlert) throw new ForbiddenException('Fee access is unavailable.');
    const q = parse(z.object({ yearId: uuid.optional(), chargeCursor: uuid.optional(), paymentCursor: uuid.optional(), adjustmentCursor: uuid.optional(), limit: z.coerce.number().int().min(1).max(50).default(25) }).strict(), query);
    const where = { schoolId: link.schoolId, studentId, ...(q.yearId ? { yearId: q.yearId } : {}) };
    const [chargeTotals, paymentTotals, adjustmentTotals, charges, payments, adjustments] = await Promise.all([
      this.svc.db.studentCharge.aggregate({ where, _sum: { amount: true } }),
      this.svc.db.payment.aggregate({ where: { ...where, voidAt: null }, _sum: { amount: true } }),
      this.svc.db.adjustment.aggregate({ where, _sum: { amount: true } }),
      this.svc.db.studentCharge.findMany({ where, take: q.limit + 1, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], ...(q.chargeCursor ? { cursor: { id: q.chargeCursor }, skip: 1 } : {}), select: { id: true, yearId: true, term: true, name: true, amount: true, dueDate: true } }),
      this.svc.db.payment.findMany({ where: { ...where, voidAt: null }, take: q.limit + 1, orderBy: [{ date: 'desc' }, { id: 'desc' }], ...(q.paymentCursor ? { cursor: { id: q.paymentCursor }, skip: 1 } : {}), select: { id: true, chargeId: true, amount: true, date: true, receipt: true, method: true, term: true } }),
      this.svc.db.adjustment.findMany({ where, take: q.limit + 1, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], ...(q.adjustmentCursor ? { cursor: { id: q.adjustmentCursor }, skip: 1 } : {}), select: { id: true, amount: true, kind: true, term: true, reason: true } }),
    ]);
    const billed = chargeTotals._sum.amount ?? 0;
    const paid = paymentTotals._sum.amount ?? 0;
    const adjusted = adjustmentTotals._sum.amount ?? 0;
    return { summary: { billed, paid, adjusted, balance: billed + adjusted - paid }, charges: charges.slice(0, q.limit), payments: payments.slice(0, q.limit), adjustments: adjustments.slice(0, q.limit), nextCursors: { charges: charges.length > q.limit ? charges[q.limit - 1].id : null, payments: payments.length > q.limit ? payments[q.limit - 1].id : null, adjustments: adjustments.length > q.limit ? adjustments[q.limit - 1].id : null } };
  }

  @Get('parent/children/:studentId/results')
  async results(@Req() req: Request, @Param('studentId') studentId: string, @Query() query: unknown) {
    const { link } = await this.child(req, studentId);
    if (!link.canReceiveReports) throw new ForbiddenException('Results are unavailable.');
    const q = parse(z.object({ cursor: uuid.optional(), limit: z.coerce.number().int().min(1).max(50).default(25) }).strict(), query);
    const rows = await this.svc.db.reportAccessLink.findMany({ where: { schoolId: link.schoolId, studentId, guardianId: link.guardianId, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: q.limit + 1, ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}), select: { id: true, reportCardId: true, createdAt: true } });
    return { items: rows.slice(0, q.limit).map(row => ({ id: row.id, publishedAt: row.createdAt, assessmentId: row.reportCardId.split(':')[0] })), nextCursor: rows.length > q.limit ? rows[q.limit - 1].id : null };
  }

  @Get('parent/children/:studentId/results/:resultId')
  async resultDetails(@Req() req: Request, @Param('studentId') studentId: string, @Param('resultId') resultId: string) {
    const { link } = await this.child(req, studentId);
    if (!link.canReceiveReports) throw new ForbiddenException('Results are unavailable.');
    parse(uuid, resultId);
    const published = await this.svc.db.reportAccessLink.findFirst({ where: { id: resultId, schoolId: link.schoolId, studentId, guardianId: link.guardianId, revokedAt: null, expiresAt: { gt: new Date() } }, select: { reportCardId: true, createdAt: true } });
    if (!published) throw new NotFoundException('Published result unavailable.');
    const classId = published.reportCardId.split(':')[1];
    const classroom = await this.svc.db.classroom.findFirst({ where: { id: classId, schoolId: link.schoolId }, select: { yearId: true, name: true, year: { select: { name: true } } } });
    if (!classroom) throw new NotFoundException('Published result unavailable.');
    const rows = await this.svc.db.$queryRaw<Array<{ report: unknown }>>`SELECT item AS report FROM "AcademicWorkspace" aw CROSS JOIN LATERAL jsonb_array_elements(COALESCE(aw.data->'reports', '[]'::jsonb)) item WHERE aw."schoolId" = ${link.schoolId}::uuid AND aw."yearId" = ${classroom.yearId}::uuid AND item->>'id' = ${published.reportCardId} AND item->>'status' = 'approved' AND item->>'academicApproved' = 'true' LIMIT 1`;
    const report = rows[0]?.report as Record<string, unknown> | undefined;
    if (!report) throw new NotFoundException('Published result unavailable.');
    return { id: resultId, publishedAt: published.createdAt, academicYear: classroom.year.name, className: classroom.name, period: report.period, results: report.results || [], noMarks: report.noMarks || [], summary: report.summary ?? null };
  }

  @Get('parent/children/:studentId/attendance')
  async attendance(@Req() req: Request, @Param('studentId') studentId: string, @Query() query: unknown) {
    const { link } = await this.child(req, studentId);
    if (!link.canReceiveAttendanceAlert) throw new ForbiddenException('Attendance is unavailable.');
    const q = parse(z.object({ yearId: uuid, before: z.string().date().optional(), limit: z.coerce.number().int().min(1).max(100).default(30) }).strict(), query);
    const enrollment = await this.svc.db.enrollment.findFirst({ where: { schoolId: link.schoolId, studentId, classroom: { yearId: q.yearId } }, orderBy: { createdAt: 'desc' }, select: { classroomId: true } });
    if (!enrollment) return { items: [], nextBefore: null };
    const rows = await this.svc.db.$queryRaw<Array<{ date: string; status: string; note: string | null }>>`SELECT DISTINCT ON (entry->>'studentId', attendance->>'date') attendance->>'date' AS date, entry->>'status' AS status, entry->>'note' AS note FROM "AcademicWorkspace" aw CROSS JOIN LATERAL jsonb_array_elements(COALESCE(aw.data->'attendance', '[]'::jsonb)) attendance CROSS JOIN LATERAL jsonb_array_elements(COALESCE(attendance->'entries', '[]'::jsonb)) entry WHERE aw."schoolId" = ${link.schoolId}::uuid AND aw."yearId" = ${q.yearId}::uuid AND attendance->>'classId' = ${enrollment.classroomId} AND entry->>'studentId' = ${studentId} AND (${q.before ?? null}::text IS NULL OR attendance->>'date' < ${q.before ?? null}) ORDER BY entry->>'studentId', attendance->>'date' DESC, (attendance->>'revision')::int DESC LIMIT ${q.limit + 1}`;
    const items = rows.slice(0, q.limit);
    return { items, nextBefore: rows.length > q.limit ? items.at(-1)?.date ?? null : null };
  }

  @Get('parent/children/:studentId/calendar')
  async calendar(@Req() req: Request, @Param('studentId') studentId: string, @Query() query: unknown) {
    const { link } = await this.child(req, studentId);
    const q = parse(z.object({ yearId: uuid }).strict(), query);
    const enrollment = await this.svc.db.enrollment.findFirst({ where: { schoolId: link.schoolId, studentId, classroom: { yearId: q.yearId } }, select: { classroom: { select: { year: { select: { id: true, name: true, startsAt: true, endsAt: true, terms: true } } } } } });
    if (!enrollment) throw new NotFoundException('Academic year unavailable.');
    return { academicYear: enrollment.classroom.year, events: [] };
  }

  @Get('parent/children/:studentId/timetable')
  async timetable(@Req() req: Request, @Param('studentId') studentId: string) {
    await this.child(req, studentId);
    return { available: false, items: [] };
  }

  @Get('parent/announcements')
  async announcements(@Req() req: Request, @Query() query: unknown) {
    const { user } = await this.parent(req);
    const q = parse(z.object({ cursor: uuid.optional(), limit: z.coerce.number().int().min(1).max(50).default(25) }).strict(), query);
    const scope = await this.announcementScope(user.id);
    const items = await this.svc.db.parentAnnouncement.findMany({ where: { AND: [scope, { unpublishedAt: null, publishedAt: { lte: new Date() }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }] }, orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }], take: q.limit + 1, ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}), select: { id: true, schoolId: true, yearId: true, classId: true, title: true, publishedAt: true, media: { select: mediaSelect } } });
    return { items: items.slice(0, q.limit), nextCursor: items.length > q.limit ? items[q.limit - 1].id : null };
  }

  @Get('parent/announcements/:announcementId')
  async announcementDetails(@Req() req: Request, @Param('announcementId') announcementId: string) {
    const { user } = await this.parent(req);
    parse(uuid, announcementId);
    const scope = await this.announcementScope(user.id);
    const item = await this.svc.db.parentAnnouncement.findFirst({ where: { id: announcementId, AND: [scope, { unpublishedAt: null, publishedAt: { lte: new Date() }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }] }, select: { id: true, schoolId: true, yearId: true, classId: true, title: true, body: true, publishedAt: true, media: { select: mediaSelect } } });
    if (!item) throw new NotFoundException('Announcement unavailable.');
    return item;
  }

  @Get('parent/announcements/:announcementId/media')
  async parentAnnouncementMedia(@Req() req: Request, @Param('announcementId') announcementId: string, @Res() res: Response) {
    const { user } = await this.parent(req);
    const scope = await this.announcementScope(user.id);
    const item = await this.svc.db.parentAnnouncement.findFirst({ where: { id: parse(uuid, announcementId), AND: [scope, { unpublishedAt: null, publishedAt: { lte: new Date() }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }] }, select: { media: { select: { storageKey: true } } } });
    if (!item?.media) throw new NotFoundException('Announcement media unavailable.');
    const bytes = await objectRequest('GET', item.media.storageKey);
    res.setHeader('Content-Type', 'image/png'); res.setHeader('Content-Disposition', 'inline'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Cache-Control', 'private, no-store');
    res.end(bytes);
  }

  @Get('schools/:schoolId/parent-announcements/:announcementId/media')
  async staffAnnouncementMedia(@Req() req: Request, @Param('schoolId') schoolId: string, @Param('announcementId') announcementId: string, @Res() res: Response) {
    await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER', 'ACADEMIC']);
    const item = await this.svc.db.parentAnnouncement.findFirst({ where: { id: parse(uuid, announcementId), schoolId }, select: { media: { select: { storageKey: true } } } });
    if (!item?.media) throw new NotFoundException('Announcement media unavailable.');
    const bytes = await objectRequest('GET', item.media.storageKey);
    res.setHeader('Content-Type', 'image/png'); res.setHeader('Content-Disposition', 'inline'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Cache-Control', 'private, no-store');
    res.end(bytes);
  }

  @Get('parent/notifications')
  async notifications(@Req() req: Request, @Query() query: unknown) {
    const { user } = await this.parent(req);
    const q = parse(z.object({ cursor: uuid.optional(), limit: z.coerce.number().int().min(1).max(50).default(25) }).strict(), query);
    const items = await this.svc.db.parentNotification.findMany({ where: { userId: user.id, ...await this.notificationScope(user.id) }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: q.limit + 1, ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}), select: { id: true, schoolId: true, studentId: true, kind: true, title: true, body: true, targetId: true, createdAt: true, readAt: true } });
    return { items: items.slice(0, q.limit), nextCursor: items.length > q.limit ? items[q.limit - 1].id : null };
  }

  @Get('parent/notifications/unread-count')
  async unreadCount(@Req() req: Request) {
    const { user } = await this.parent(req);
    return { count: await this.svc.db.parentNotification.count({ where: { userId: user.id, readAt: null, ...await this.notificationScope(user.id) } }) };
  }

  @Patch('parent/notifications/:notificationId/read')
  async readNotification(@Req() req: Request, @Param('notificationId') notificationId: string) {
    const { user } = await this.parent(req);
    parse(uuid, notificationId);
    const changed = await this.svc.db.parentNotification.updateMany({ where: { id: notificationId, userId: user.id, readAt: null, ...await this.notificationScope(user.id) }, data: { readAt: new Date() } });
    return { updated: changed.count > 0 };
  }

  @Post('parent/notifications/read-all')
  async readAll(@Req() req: Request) {
    const { user } = await this.parent(req);
    const changed = await this.svc.db.parentNotification.updateMany({ where: { userId: user.id, readAt: null, ...await this.notificationScope(user.id) }, data: { readAt: new Date() } });
    return { updated: changed.count };
  }
}
