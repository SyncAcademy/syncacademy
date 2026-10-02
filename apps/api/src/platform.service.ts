import { BadRequestException, ConflictException, ForbiddenException, HttpException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import { Request } from 'express';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { Database } from './database/database.service';
import { config } from './config';
import { decrypt, digest, encrypt, passwordHash, passwordMatches, randomToken } from './security';

const invitationExpiryLabel = (minutes: number) => {
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  if (minutes % 1440 === 0) {
    const days = minutes / 1440;
    return `${days} ${days === 1 ? 'day' : 'days'}`;
  }
  const hours = minutes / 60;
  return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
};

@Injectable()
export class PlatformService {
  private dummyHash = passwordHash(randomToken());
  constructor(readonly db: Database) {}
  async atomic<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try { return await this.db.$transaction(work, { isolationLevel: 'Serializable', timeout: 15000 }); }
      catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034' && attempt < 3) continue; throw error; }
    }
  }
  async rate(key: string, max: number, seconds: number) {
    const expires = new Date(Date.now() + seconds * 1000);
    const rows = await this.db.$queryRaw<{ count: number }[]>`INSERT INTO "RateBucket" (key, count, "expiresAt") VALUES (${digest(key)}, 1, ${expires}) ON CONFLICT (key) DO UPDATE SET count = CASE WHEN "RateBucket"."expiresAt" < NOW() THEN 1 ELSE "RateBucket".count + 1 END, "expiresAt" = CASE WHEN "RateBucket"."expiresAt" < NOW() THEN EXCLUDED."expiresAt" ELSE "RateBucket"."expiresAt" END RETURNING count`;
    if (rows[0].count > max) throw new HttpException('Too many attempts. Try again later.', 429);
  }
  async user(req: Request, ready = true): Promise<User> {
    const id = req.session.userId;
    if (!id || !req.session.selectedRole || !req.session.issuedAt || Date.now() - req.session.issuedAt > 7 * 86400000) throw new UnauthorizedException('Please sign in again and choose a role.');
    const user = await this.db.user.findUnique({ where: { id } });
    if (!user?.enabled || user.sessionVersion !== req.session.version) throw new UnauthorizedException('Your session has ended. Please sign in again.');
    if (ready && (user.mustChangePassword || (user.platformAdmin && !user.mfaSecret) || (user.mfaSecret && !req.session.mfaVerified))) throw new ForbiddenException('Complete your account security setup before continuing.');
    return user;
  }
  async session(req: Request, user: User, mfaVerified: boolean, remember = false, selectedRole = req.session.selectedRole) {
    await new Promise<void>((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
    req.session.userId = user.id; req.session.version = user.sessionVersion; req.session.selectedRole = selectedRole; req.session.mfaVerified = mfaVerified; req.session.issuedAt = Date.now();
    req.session.cookie.maxAge = remember ? 7 * 86400000 : 8 * 3600000;
    await new Promise<void>((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
  }
  async me(req: Request) {
    const user = await this.user(req, false);
    const selectedRole = req.session.selectedRole!;
    const needsMfa = !!user.mfaSecret && !req.session.mfaVerified;
    const memberships = needsMfa || selectedRole === 'SUPER_ADMIN' ? [] : await this.db.membership.findMany({ where: { userId: user.id, role: selectedRole as Role, active: true, school: { active: true } }, include: { school: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } });
    return { id: user.id, name: user.name, email: user.email, selectedRole, platformAdmin: user.platformAdmin && selectedRole === 'SUPER_ADMIN', mustChangePassword: user.mustChangePassword, needsMfa, needsMfaSetup: user.platformAdmin && !user.mfaSecret, mfaEnabled: !!user.mfaSecret, memberships: memberships.map(m => ({ id: m.id, role: m.role, school: m.school })) };
  }
  async login(req: Request, data: { email: string; password: string; role: Role | 'SUPER_ADMIN'; rememberMe: boolean }) {
    await this.rate('login-ip:' + req.ip, 30, 900); await this.rate('login-email:' + data.email, 10, 900);
    const user = await this.db.user.findUnique({ where: { email: data.email } });
    const valid = await passwordMatches(user?.passwordHash || await this.dummyHash, data.password);
    const hasRole = user && data.role === 'SUPER_ADMIN'
      ? user.platformAdmin
      : user && !!await this.db.membership.findFirst({ where: { userId: user.id, role: data.role as Role, active: true, school: { active: true } }, select: { id: true } });
    if (!user?.enabled || !valid || !hasRole) throw new UnauthorizedException('Sign-in failed. Check your email, password, or access for the selected role.');
    await this.session(req, user, false, data.rememberMe, data.role);
    await this.db.auditEvent.create({ data: { actorId: user.id, action: 'PASSWORD_VERIFIED', target: user.id } });
    return this.me(req);
  }
  async logout(req: Request) { await new Promise<void>((resolve, reject) => req.session.destroy(error => error ? reject(error) : resolve())); return { message: 'Signed out.' }; }
  async changePassword(req: Request, current: string, next: string) {
    const user = await this.user(req, false);
    if (user.mfaSecret && !req.session.mfaVerified) throw new ForbiddenException('Verify your authenticator code first.');
    await this.rate('password:' + user.id, 6, 900);
    if (!await passwordMatches(user.passwordHash, current)) throw new BadRequestException('Current password is incorrect.');
    if (current === next) throw new BadRequestException('Choose a different password.');
    const hash = await passwordHash(next);
    const updated = await this.atomic(async tx => {
      const changed = await tx.user.updateMany({ where: { id: user.id, sessionVersion: user.sessionVersion }, data: { passwordHash: hash, mustChangePassword: false, sessionVersion: { increment: 1 } } });
      if (!changed.count) throw new ConflictException('Your account changed. Sign in again.');
      await tx.passwordReset.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } });
      await tx.auditEvent.create({ data: { actorId: user.id, action: 'PASSWORD_CHANGED', target: user.id } });
      return tx.user.findUniqueOrThrow({ where: { id: user.id } });
    });
    await this.session(req, updated, !!user.mfaSecret); return this.me(req);
  }
  async setupMfa(req: Request) {
    const user = await this.user(req, false);
    if (user.mustChangePassword || user.mfaSecret) throw new ForbiddenException('MFA setup is not available. Complete the password change first.');
    await this.rate('mfa-setup:' + user.id, 10, 900);
    const secret = authenticator.generateSecret(); req.session.setupSecret = encrypt(secret); req.session.setupExpires = Date.now() + 10 * 60000;
    const uri = authenticator.keyuri(user.email, 'SyncAcademy', secret);
    return { secret, qr: await QRCode.toDataURL(uri) };
  }
  async verifyMfa(req: Request, code: string, setup = false) {
    const user = await this.user(req, false); await this.rate('mfa:' + user.id, 8, 300);
    const stored = setup ? req.session.setupSecret : user.mfaSecret;
    if (!stored || (setup && (user.mfaSecret || !req.session.setupExpires || req.session.setupExpires < Date.now()))) throw new BadRequestException('Start authenticator setup again.');
    const secret = decrypt(stored); const checker = authenticator.clone(); checker.options = { window: 1 };
    const delta = checker.checkDelta(code, secret);
    if (delta === null) throw new UnauthorizedException('Invalid authenticator code.');
    const step = BigInt(Math.floor(Date.now() / 30000) + delta);
    const recoveryCodes = setup ? Array.from({ length: 8 }, () => randomToken().slice(0, 20)) : [];
    const updated = await this.atomic(async tx => {
      const result = await tx.user.updateMany({ where: { id: user.id, sessionVersion: user.sessionVersion, mfaLastStep: { lt: step }, ...(setup ? { mfaSecret: null } : {}) }, data: { mfaLastStep: step, ...(setup ? { mfaSecret: encrypt(secret), mfaRecovery: recoveryCodes.map(digest), sessionVersion: { increment: 1 } } : {}) } });
      if (!result.count) throw new UnauthorizedException('Code already used or account changed. Wait for a new code.');
      await tx.auditEvent.create({ data: { actorId: user.id, action: setup ? 'MFA_ENABLED' : 'SIGNED_IN', target: user.id } });
      return tx.user.findUniqueOrThrow({ where: { id: user.id } });
    });
    await this.session(req, updated, true); return { ...await this.me(req), ...(setup ? { recoveryCodes } : {}) };
  }
  async recoverMfa(req: Request, code: string) {
    const user = await this.user(req, false); await this.rate('mfa:' + user.id, 8, 300);
    const hash = digest(code);
    const updated = await this.atomic(async tx => {
      const fresh = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      if (!fresh.mfaSecret || !fresh.mfaRecovery.includes(hash) || fresh.sessionVersion !== req.session.version) throw new UnauthorizedException('Invalid recovery code.');
      const result = await tx.user.update({ where: { id: fresh.id }, data: { mfaRecovery: fresh.mfaRecovery.filter(c => c !== hash) } });
      await tx.auditEvent.create({ data: { actorId: user.id, action: 'MFA_RECOVERY_USED', target: user.id } }); return result;
    });
    await this.session(req, updated, true); return this.me(req);
  }
  async recover(req: Request, email: string) {
    await this.rate('recover-ip:' + req.ip, 10, 900); await this.rate('recover-email:' + email, 3, 3600);
    const user = await this.db.user.findUnique({ where: { email } });
    if (user?.enabled) {
      const token = randomToken();
      await this.atomic(async tx => {
        await tx.passwordReset.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } });
        const reset = await tx.passwordReset.create({ data: { userId: user.id, tokenHash: digest(token), expiresAt: new Date(Date.now() + 30 * 60000) } });
        await tx.outbox.create({ data: { resetId: reset.id, payload: encrypt(JSON.stringify({ to: email, subject: 'Reset your SyncAcademy password', text: `Reset your password within 30 minutes: ${config.APP_ORIGIN}/auth/reset#token=${token}\nIf you did not request this, ignore this message.` })) } });
      });
    }
    return { message: 'If this address has an active account, a reset link will be sent.' };
  }
  async reset(req: Request, token: string, password: string) {
    await this.rate('reset-ip:' + req.ip, 10, 900); const hash = await passwordHash(password);
    await this.atomic(async tx => {
      const reset = await tx.passwordReset.findUnique({ where: { tokenHash: digest(token) }, include: { user: true } });
      if (!reset || reset.usedAt || reset.expiresAt < new Date() || !reset.user.enabled) throw new BadRequestException('This reset link is invalid or expired.');
      await tx.passwordReset.updateMany({ where: { userId: reset.userId, usedAt: null }, data: { usedAt: new Date() } });
      await tx.user.update({ where: { id: reset.userId }, data: { passwordHash: hash, mustChangePassword: false, sessionVersion: { increment: 1 } } });
      await tx.auditEvent.create({ data: { actorId: reset.userId, action: 'PASSWORD_RESET', target: reset.userId } });
    });
    return { message: 'Password updated. Sign in with your new password and authenticator if enabled.' };
  }
  async authorize(req: Request, schoolId: string, roles?: Role[]) {
    const user = await this.user(req);
    const selectedRole = req.session.selectedRole!;
    const platformSession = user.platformAdmin && selectedRole === 'SUPER_ADMIN';
    const school = await this.db.school.findFirst({ where: { id: schoolId, active: true } });
    if (!school) throw new ForbiddenException('School access is unavailable.');
    const scopedRoles = platformSession ? roles : roles ? roles.filter(role => role === selectedRole) : [selectedRole as Role];
    const memberships = await this.db.membership.findMany({ where: { userId: user.id, schoolId, active: true, ...(scopedRoles ? { role: { in: scopedRoles } } : {}) } });
    if (!platformSession && !memberships.length) throw new ForbiddenException('You do not have permission for this school.');
    return { user: { ...user, platformAdmin: platformSession }, memberships };
  }
  async administrator(req: Request) { const user = await this.user(req); if (!user.platformAdmin || req.session.selectedRole !== 'SUPER_ADMIN') throw new ForbiddenException(); return user; }
  async idempotent<T>(scope: string, key: string, input: unknown, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    const fingerprint = digest(JSON.stringify(input));
    return this.atomic(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${scope + ':' + key}, 0))`;
      const existing = await tx.idempotency.findUnique({ where: { scope_key: { scope, key } } });
      if (existing) { if (existing.fingerprint !== fingerprint) throw new ConflictException('Idempotency key already used for a different request.'); return existing.result as T; }
      const result = await work(tx);
      await tx.idempotency.create({ data: { scope, key, fingerprint, result: JSON.parse(JSON.stringify(result)) } });
      return result;
    });
  }
  async createInvitation(tx: Prisma.TransactionClient, actorId: string, schoolId: string, data: { name: string; email: string; role: Role; studentId?: string; expiresInMinutes?: number }) {
    if (await tx.membership.findFirst({ where: { schoolId, role: data.role, user: { email: data.email } } })) throw new ConflictException('This person already has this school role. Manage their existing access instead.');
    if (await tx.invitation.findFirst({ where: { schoolId, email: data.email, role: data.role, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } } })) throw new ConflictException('A pending invitation already exists. Resend it instead.');
    await tx.invitation.updateMany({ where: { schoolId, email: data.email, role: data.role, acceptedAt: null, revokedAt: null, expiresAt: { lte: new Date() } }, data: { revokedAt: new Date() } });
    const token = randomToken();
    const expiresInMinutes = data.expiresInMinutes ?? 2880;
    const invitation = await tx.invitation.create({ data: { ...data, expiresInMinutes, schoolId, invitedBy: actorId, tokenHash: digest(token), expiresAt: new Date(Date.now() + expiresInMinutes * 60000) } });
    await this.invitationMail(tx, invitation, token);
    await tx.auditEvent.create({ data: { actorId, schoolId, action: 'USER_INVITED', target: invitation.id } });
    return { id: invitation.id, email: invitation.email, role: invitation.role, expiresAt: invitation.expiresAt };
  }
  async createPlatformInvitation(tx: Prisma.TransactionClient, actorId: string, data: { name: string; email: string; expiresInMinutes: number }) {
    if (await tx.user.findFirst({ where: { email: data.email, platformAdmin: true } })) throw new ConflictException('This account is already a platform administrator.');
    const pending = await tx.invitation.findFirst({ where: { schoolId: null, platformAdmin: true, email: data.email, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } } });
    if (pending) throw new ConflictException('A pending platform administrator invitation already exists. Resend it instead.');
    await tx.invitation.updateMany({ where: { schoolId: null, platformAdmin: true, email: data.email, acceptedAt: null, revokedAt: null, expiresAt: { lte: new Date() } }, data: { revokedAt: new Date() } });
    const token = randomToken();
    const invitation = await tx.invitation.create({ data: { ...data, schoolId: null, platformAdmin: true, role: 'HEADMASTER', tokenHash: digest(token), expiresAt: new Date(Date.now() + data.expiresInMinutes * 60000), invitedBy: actorId } });
    await this.invitationMail(tx, invitation, token);
    await tx.auditEvent.create({ data: { actorId, action: 'PLATFORM_ADMIN_INVITED', target: invitation.id } });
    return { id: invitation.id, name: invitation.name, email: invitation.email, role: 'SUPER_ADMIN', expiresInMinutes: invitation.expiresInMinutes, expiresAt: invitation.expiresAt };
  }
  async invitationMail(tx: Prisma.TransactionClient, invitation: { id: string; schoolId: string | null; platformAdmin: boolean; email: string; generation: number; expiresInMinutes: number }, token: string) {
    const school = invitation.schoolId ? await tx.school.findUniqueOrThrow({ where: { id: invitation.schoolId } }) : null;
    const expiryLabel = invitationExpiryLabel(invitation.expiresInMinutes);
    const organization = invitation.platformAdmin ? 'the SyncAcademy platform' : school!.name;
    const roleDescription = invitation.platformAdmin ? 'as a Super Admin' : `to ${school!.name}`;
    await tx.outbox.create({ data: { invitationId: invitation.id, invitationGeneration: invitation.generation, payload: encrypt(JSON.stringify({ to: invitation.email, subject: `Invitation to ${organization}`, text: `You have been invited ${roleDescription} on SyncAcademy. Accept within ${expiryLabel}: ${config.APP_ORIGIN}/auth/invitation#token=${token}\nIf you already have an account, sign in to that account to accept. If unexpected, ignore this email.` })) } });
  }
  async invitationInfo(req: Request, token: string) {
    await this.rate('invitation-read:' + req.ip, 60, 900);
    const i = await this.db.invitation.findUnique({ where: { tokenHash: digest(token) }, include: { school: true } });
    if (!i || i.acceptedAt || i.revokedAt || i.expiresAt < new Date() || (i.platformAdmin ? !!i.schoolId : !i.school?.active) || i.role === 'STUDENT' || i.role === 'PARENT') throw new BadRequestException('Invitation is invalid, expired, or already used.');
    const existing = await this.db.user.findUnique({ where: { email: i.email }, select: { id: true } });
    return { name: i.name, email: i.email, role: i.platformAdmin ? 'SUPER_ADMIN' : i.role, school: i.platformAdmin ? 'SyncAcademy platform' : i.school!.name, existingAccount: !!existing };
  }
  async accept(req: Request, token: string, password?: string) {
    await this.rate('invite-accept:' + req.ip, 15, 900);
    const hash = password && password.length >= 15 ? await passwordHash(password) : undefined;
    const signedIn = req.session.userId ? await this.user(req) : null;
    await this.atomic(async tx => {
      const i = await tx.invitation.findUnique({ where: { tokenHash: digest(token) }, include: { school: true } });
      if (!i || i.acceptedAt || i.revokedAt || i.expiresAt < new Date() || (i.platformAdmin ? !!i.schoolId : !i.school?.active) || i.role === 'STUDENT' || i.role === 'PARENT') throw new BadRequestException('Invitation is invalid, expired, or already used.');
      let user = await tx.user.findUnique({ where: { email: i.email } });
      if (user) {
        if (!user.enabled || (signedIn ? signedIn.id !== user.id : !password || !(await passwordMatches(user.passwordHash, password)))) throw new ForbiddenException('Invitation could not be accepted. Check the invited account credentials.');
      } else {
        if (!password || password.length < 15 || !hash) throw new BadRequestException('Choose a password with at least 15 characters to create your account.');
        user = await tx.user.create({ data: { email: i.email, name: i.name, passwordHash: hash, platformAdmin: i.platformAdmin } });
      }
      if (i.platformAdmin && !user.platformAdmin) user = await tx.user.update({ where: { id: user.id }, data: { platformAdmin: true } });
      if (!i.platformAdmin && await tx.membership.findFirst({ where: { userId: user.id, schoolId: i.schoolId!, role: i.role } })) throw new ConflictException('This role already exists.');
      if (!i.platformAdmin) await tx.membership.create({ data: { userId: user.id, schoolId: i.schoolId!, role: i.role } });
      if (i.studentId && i.schoolId) {
        const changed = await tx.student.updateMany({ where: { id: i.studentId, schoolId: i.schoolId, userId: null }, data: { userId: user.id } });
        if (!changed.count) throw new ConflictException('Student account is already linked.');
      }
      await tx.invitation.update({ where: { id: i.id }, data: { acceptedAt: new Date() } });
      await tx.auditEvent.create({ data: { actorId: user.id, schoolId: i.schoolId, action: i.platformAdmin ? 'PLATFORM_ADMIN_INVITATION_ACCEPTED' : 'INVITATION_ACCEPTED', target: i.id } });
    });
    return { message: 'Invitation accepted. Sign in to access your account.' };
  }
}
