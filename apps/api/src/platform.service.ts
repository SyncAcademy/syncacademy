import { BadRequestException, ConflictException, ForbiddenException, HttpException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import { Request } from 'express';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { Database } from './database/database.service';
import { AuditLogService } from './audit-log.service';
import { RealtimeBus } from './realtime-bus';
import { config } from './config';
import { decrypt, digest, encrypt, passwordHash, passwordMatches, randomToken } from './security';
import { buildInvitationEmail, buildPasswordResetEmail } from './communication/email/email-templates';

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
  constructor(readonly db: Database, private readonly auditLog: AuditLogService, private readonly realtime: RealtimeBus) {}
  async atomic<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try { return await this.db.$transaction(work, { isolationLevel: 'Serializable', timeout: 15000 }); }
      catch (error) {
        const rawSerialization = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2010' && error.meta?.code === '40001';
        if ((rawSerialization || error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') && attempt < 3) continue;
        if (rawSerialization) throw new ConflictException('Records changed during saving. Refresh and try again.');
        throw error;
      }
    }
  }
  async rate(key: string, max: number, seconds: number) {
    const expires = new Date(Date.now() + seconds * 1000);
    const rows = await this.db.$queryRaw<{ count: number }[]>`INSERT INTO "RateBucket" (key, count, "expiresAt") VALUES (${digest(key)}, 1, ${expires}) ON CONFLICT (key) DO UPDATE SET count = CASE WHEN "RateBucket"."expiresAt" < NOW() THEN 1 ELSE "RateBucket".count + 1 END, "expiresAt" = CASE WHEN "RateBucket"."expiresAt" < NOW() THEN EXCLUDED."expiresAt" ELSE "RateBucket"."expiresAt" END RETURNING count`;
    if (rows[0].count > max) throw new HttpException('Too many attempts. Try again later.', 429);
  }
  private async checkFailures(key: string, max: number) {
    const rows = await this.db.$queryRaw<{ count: number }[]>`SELECT count FROM "RateBucket" WHERE key = ${digest(key)} AND "expiresAt" > NOW()`;
    if ((rows[0]?.count ?? 0) >= max) throw new HttpException('Too many attempts. Try again later.', 429);
  }
  private async recordFailure(key: string, max = 5) { await this.rate(key, max, 900); }
  async user(req: Request, ready = true): Promise<User> {
    const id = req.session.userId;
    const platformSession = req.session.selectedRole === 'SUPER_ADMIN';
    const now = Date.now();
    if (!id || !req.session.selectedRole || !req.session.issuedAt || now - req.session.issuedAt > (platformSession ? 8 : 168) * 3600000) throw new UnauthorizedException('Please sign in again and choose a role.');
    const user = await this.db.user.findUnique({ where: { id } });
    if (user?.enabled !== true || user.sessionVersion !== req.session.version) throw new UnauthorizedException('Your session has ended. Please sign in again.');
    if (platformSession && (!user.platformAdmin || req.session.platformMfaAssured !== true || !req.session.mfaVerified)) throw new UnauthorizedException('Please sign in again and verify your authenticator.');
    if (platformSession && now - (req.session.lastActivityAt ?? req.session.issuedAt) > 15 * 60000) throw new UnauthorizedException('Your administrator session expired due to inactivity. Sign in again.');
    if (ready && (user.mustChangePassword || (platformSession && !user.mfaSecret))) throw new ForbiddenException('Complete your account security setup before continuing.');
    if (platformSession && typeof req.path === 'string' && req.headers['x-platform-activity'] === '1' && !req.path.startsWith('/api/v1/system-health')) {
      req.session.lastActivityAt = now;
      await new Promise<void>((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
    }
    return user;
  }
  async session(req: Request, user: User, mfaVerified: boolean, remember = false, selectedRole = req.session.selectedRole, platformMfaAssured = false) {
    await new Promise<void>((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
    const issuedAt = Date.now();
    req.session.userId = user.id; req.session.version = user.sessionVersion; req.session.selectedRole = selectedRole; req.session.mfaVerified = mfaVerified; req.session.platformMfaAssured = platformMfaAssured; req.session.platformMfaAt = platformMfaAssured ? issuedAt : undefined; req.session.lastActivityAt = platformMfaAssured ? issuedAt : undefined; req.session.issuedAt = issuedAt;
    req.session.cookie.maxAge = remember ? 7 * 86400000 : 8 * 3600000;
    await new Promise<void>((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
  }
  async me(req: Request) {
    const user = await this.user(req, false);
    const selectedRole = req.session.selectedRole!;
    const platformSession = selectedRole === 'SUPER_ADMIN';
    const needsMfa = platformSession && !!user.mfaSecret && !req.session.platformMfaAssured;
    const memberships = needsMfa || platformSession ? [] : await this.db.membership.findMany({ where: { userId: user.id, role: selectedRole as Role, active: true, school: { active: true } }, include: { school: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } });
    return { id: user.id, name: user.name, email: user.email, selectedRole, platformAdmin: user.platformAdmin && platformSession && req.session.platformMfaAssured === true, mustChangePassword: user.mustChangePassword, needsMfa, needsMfaSetup: platformSession && user.platformAdmin && !user.mfaSecret, mfaEnabled: !!user.mfaSecret, memberships: memberships.map(m => ({ id: m.id, role: m.role, school: m.school })) };
  }
  async login(req: Request, data: { email: string; password: string; role: Role | 'SUPER_ADMIN'; rememberMe: boolean }) {
    if (data.role === 'SUPER_ADMIN') throw new UnauthorizedException('Sign-in failed. Check your email, password, or access for the selected role.');
    await this.rate('login-ip:' + req.ip, 30, 900); await this.rate('login-email:' + data.email, 10, 900);
    const user = await this.db.user.findUnique({ where: { email: data.email } });
    const valid = await passwordMatches(user?.passwordHash || await this.dummyHash, data.password);
    const hasRole = user && !!await this.db.membership.findFirst({ where: { userId: user.id, role: data.role as Role, active: true, school: { active: true } }, select: { id: true } });
    if (!user?.enabled || !valid || !hasRole) {
      await this.auditLog.recordSecurityEvent({
        actorId: user?.id,
        category: 'AUTHENTICATION',
        eventType: 'LOGIN_FAILED',
        severity: 'MEDIUM',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')?.slice(0, 500),
        details: { requestedRole: data.role, reason: 'credentials_or_role_invalid' },
      });
      throw new UnauthorizedException('Sign-in failed. Check your email, password, or access for the selected role.');
    }
    await this.session(req, user, false, data.rememberMe, data.role, false);
    await this.db.auditEvent.create({ data: { actorId: user.id, action: 'PASSWORD_VERIFIED', target: user.id } });
    return this.me(req);
  }
  private async platformAuthEvent(req: Request, eventType: string, actorId?: string | null, severity = 'MEDIUM', details: Record<string, unknown> = {}) {
    await this.auditLog.recordSecurityEvent({ actorId, category: 'AUTHENTICATION', eventType, severity, ipAddress: req.ip, userAgent: req.get('user-agent')?.slice(0, 500), details });
  }
  private async queuePlatformNotice(tx: Prisma.TransactionClient, email: string, subject: string, message: string) {
    await tx.outbox.create({ data: { payload: encrypt(JSON.stringify({ to: email, subject, text: message, html: `<p>${message}</p>` })) } });
  }
  private async saveSession(req: Request) {
    await new Promise<void>((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
  }
  private async beginPlatformChallenge(req: Request, user: User) {
    await new Promise<void>((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
    const challenge: NonNullable<Request['session']['platformChallenge']> = {
      id: randomToken(), userId: user.id, version: user.sessionVersion,
      stage: user.mustChangePassword ? 'password-change' : user.mfaSecret ? 'totp' : 'enrollment',
      expiresAt: Date.now() + 5 * 60000, attempts: 0,
      ...(!user.mustChangePassword && !user.mfaSecret ? { encryptedSecret: encrypt(authenticator.generateSecret()) } : {}),
    };
    req.session.platformChallenge = challenge;
    req.session.cookie.maxAge = 5 * 60000;
    await this.saveSession(req);
    return this.platformChallengeResponse(challenge, user.email);
  }
  private async platformChallengeResponse(challenge: NonNullable<Request['session']['platformChallenge']>, email: string) {
    if (challenge.stage !== 'enrollment' || !challenge.encryptedSecret) return { stage: challenge.stage };
    const secret = decrypt(challenge.encryptedSecret);
    const uri = authenticator.keyuri(email, 'SyncAcademy', secret);
    return { stage: challenge.stage, secret, qr: await QRCode.toDataURL(uri) };
  }
  async platformLogin(req: Request, data: { email: string; password: string }) {
    const normalizedEmail = data.email.trim().toLowerCase();
    await this.checkFailures('platform-login-fail-ip:' + req.ip, 30);
    await this.checkFailures('platform-login-fail-account:' + normalizedEmail, 5);
    const user = await this.db.user.findUnique({ where: { email: normalizedEmail } });
    const valid = await passwordMatches(user?.passwordHash || await this.dummyHash, data.password);
    if (user?.enabled !== true || user.platformAdmin !== true || !valid) {
      await this.recordFailure('platform-login-fail-ip:' + req.ip, 30);
      await this.recordFailure('platform-login-fail-account:' + normalizedEmail);
      await this.platformAuthEvent(req, 'PLATFORM_ADMIN_LOGIN_FAILED', user?.id, 'MEDIUM', { reason: 'credentials_or_status_invalid' });
      throw new UnauthorizedException('Sign-in failed. Check your credentials or account access.');
    }
    const challenge = await this.beginPlatformChallenge(req, user);
    await this.platformAuthEvent(req, 'PLATFORM_ADMIN_PASSWORD_VERIFIED', user.id, 'LOW', { challengeStage: challenge.stage });
    return challenge;
  }
  private async platformChallenge(req: Request, stages: NonNullable<Request['session']['platformChallenge']>['stage'][] = []) {
    const challenge = req.session.platformChallenge;
    if (!challenge || challenge.expiresAt <= Date.now() || stages.length && !stages.includes(challenge.stage)) {
      delete req.session.platformChallenge;
      await this.saveSession(req);
      throw new UnauthorizedException('This sign-in challenge is invalid or expired. Start again.');
    }
    const user = await this.db.user.findUnique({ where: { id: challenge.userId } });
    if (user?.enabled !== true || user.platformAdmin !== true || user.sessionVersion !== challenge.version) {
      delete req.session.platformChallenge;
      await this.saveSession(req);
      throw new UnauthorizedException('This sign-in challenge is invalid or expired. Start again.');
    }
    return { challenge, user };
  }
  private async ratePlatformChallenge(req: Request, challenge: NonNullable<Request['session']['platformChallenge']>) {
    await this.checkFailures('platform-challenge-fail-ip:' + req.ip, 30);
    await this.checkFailures('platform-challenge-fail-account:' + challenge.userId, 5);
    await this.rate('platform-challenge-id:' + challenge.id, 10, 900);
  }
  private async failPlatformChallenge(req: Request, challenge: NonNullable<Request['session']['platformChallenge']>, userId: string, eventType: string) {
    challenge.attempts += 1;
    if (challenge.attempts >= 5) delete req.session.platformChallenge;
    await this.saveSession(req);
    await this.recordFailure('platform-challenge-fail-ip:' + req.ip, 30);
    await this.recordFailure('platform-challenge-fail-account:' + challenge.userId);
    await this.platformAuthEvent(req, eventType, userId, 'MEDIUM', { failedAttempts: challenge.attempts });
    throw new UnauthorizedException('Verification failed. Start again or use another valid factor.');
  }
  async platformChallengeStatus(req: Request) {
    const { challenge, user } = await this.platformChallenge(req);
    return this.platformChallengeResponse(challenge, user.email);
  }
  async changePlatformPassword(req: Request, password: string) {
    const { challenge, user } = await this.platformChallenge(req, ['password-change']);
    await this.ratePlatformChallenge(req, challenge);
    const hash = await passwordHash(password);
    const updated = await this.atomic(async tx => {
      const changed = await tx.user.updateMany({
        where: { id: user.id, platformAdmin: true, enabled: true, mustChangePassword: true, sessionVersion: challenge.version },
        data: { passwordHash: hash, mustChangePassword: false, sessionVersion: { increment: 1 } },
      });
      if (!changed.count) throw new UnauthorizedException('This sign-in challenge is invalid or expired. Start again.');
      await tx.passwordReset.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } });
      await tx.auditEvent.create({ data: { actorId: user.id, action: 'PASSWORD_CHANGED', target: user.id } });
      await tx.auditEvent.create({ data: { actorId: user.id, action: 'PLATFORM_ADMIN_SESSIONS_REVOKED', target: `${user.id}:account-wide-password-change` } });
      return tx.user.findUniqueOrThrow({ where: { id: user.id } });
    });
    challenge.version = updated.sessionVersion;
    challenge.stage = updated.mfaSecret ? 'totp' : 'enrollment';
    challenge.encryptedSecret = updated.mfaSecret ? undefined : encrypt(authenticator.generateSecret());
    await this.saveSession(req);
    await this.platformAuthEvent(req, 'PLATFORM_ADMIN_PASSWORD_CHANGED', user.id, 'MEDIUM', { sessionsRevoked: true, accountWide: true });
    return this.platformChallengeResponse(challenge, updated.email);
  }
  async verifyPlatformMfa(req: Request, code: string) {
    const { challenge, user } = await this.platformChallenge(req, ['enrollment', 'totp']);
    await this.ratePlatformChallenge(req, challenge);
    const setup = challenge.stage === 'enrollment';
    const stored = setup ? challenge.encryptedSecret : user.mfaSecret;
    if (!stored || setup && user.mfaSecret) throw new UnauthorizedException('This sign-in challenge is invalid or expired. Start again.');
    const checker = authenticator.clone();
    checker.options = { window: 1 };
    const delta = checker.checkDelta(code, decrypt(stored));
    if (delta === null) return this.failPlatformChallenge(req, challenge, user.id, 'PLATFORM_ADMIN_MFA_FAILED');
    const step = Math.floor(Date.now() / 30000) + delta;
    if (setup) {
      const recoveryCodes = Array.from({ length: 8 }, () => randomToken().slice(0, 20));
      const updated = await this.atomic(async tx => {
        const result = await tx.user.updateMany({
          where: { id: user.id, platformAdmin: true, enabled: true, sessionVersion: challenge.version, mfaSecret: null, mfaLastStep: { lt: BigInt(step) } },
          data: { mfaSecret: stored, mfaLastStep: BigInt(step), mfaRecovery: recoveryCodes.map(digest), sessionVersion: { increment: 1 } },
        });
        if (!result.count) return null;
        const fresh = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
        await tx.auditEvent.create({ data: { actorId: user.id, action: 'PLATFORM_ADMIN_MFA_ENROLLED', target: user.id } });
        await tx.auditEvent.create({ data: { actorId: user.id, action: 'PLATFORM_ADMIN_SESSIONS_REVOKED', target: `${user.id}:account-wide-mfa-enrollment` } });
        return fresh;
      });
      if (!updated) return this.failPlatformChallenge(req, challenge, user.id, 'PLATFORM_ADMIN_MFA_FAILED');
      challenge.version = updated.sessionVersion;
      challenge.stage = 'recovery-ack';
      delete challenge.encryptedSecret;
      await this.saveSession(req);
      await this.platformAuthEvent(req, 'PLATFORM_ADMIN_MFA_ENROLLED', user.id, 'HIGH', { sessionsRevoked: true, accountWide: true });
      return { stage: challenge.stage, recoveryCodes };
    }
    const updated = await this.atomic(async tx => {
      const changed = await tx.user.updateMany({
        where: { id: user.id, platformAdmin: true, enabled: true, sessionVersion: challenge.version, mfaSecret: user.mfaSecret, mfaLastStep: { lt: BigInt(step) } },
        data: { mfaLastStep: BigInt(step) },
      });
      if (!changed.count) return null;
      const fresh = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      await tx.auditEvent.create({ data: { actorId: user.id, action: 'PLATFORM_ADMIN_LOGIN', target: user.id } });
      return fresh;
    });
    if (!updated) return this.failPlatformChallenge(req, challenge, user.id, 'PLATFORM_ADMIN_MFA_FAILED');
    await this.platformAuthEvent(req, 'PLATFORM_ADMIN_LOGIN_SUCCEEDED', user.id, 'LOW', { factor: 'totp' });
    await this.session(req, updated, true, false, 'SUPER_ADMIN', true);
    return this.me(req);
  }
  async recoverPlatformLogin(req: Request, code: string) {
    const { challenge, user } = await this.platformChallenge(req, ['totp']);
    await this.ratePlatformChallenge(req, challenge);
    const hash = digest(code);
    const updated = await this.atomic(async tx => {
      const fresh = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      if (fresh.enabled !== true || fresh.platformAdmin !== true || fresh.sessionVersion !== challenge.version || !fresh.mfaSecret || !fresh.mfaRecovery.includes(hash)) return null;
      const changed = await tx.user.updateMany({
        where: { id: fresh.id, platformAdmin: true, enabled: true, sessionVersion: challenge.version, mfaRecovery: { has: hash } },
        data: { mfaRecovery: { set: fresh.mfaRecovery.filter(value => value !== hash) } },
      });
      if (!changed.count) return null;
      await tx.auditEvent.create({ data: { actorId: fresh.id, action: 'PLATFORM_ADMIN_RECOVERY_CODE_USED', target: fresh.id } });
      await this.queuePlatformNotice(tx, fresh.email, 'SyncAcademy administrator recovery code used', 'A recovery code was used to sign in to your SyncAcademy platform administrator account. If this was not you, contact another active platform administrator.');
      return tx.user.findUniqueOrThrow({ where: { id: fresh.id } });
    });
    if (!updated) return this.failPlatformChallenge(req, challenge, user.id, 'PLATFORM_ADMIN_RECOVERY_FAILED');
    await this.platformAuthEvent(req, 'PLATFORM_ADMIN_RECOVERY_CODE_USED', user.id, 'HIGH', { notified: true });
    await this.session(req, updated, true, false, 'SUPER_ADMIN', true);
    return this.me(req);
  }
  async acknowledgePlatformRecovery(req: Request) {
    const { challenge, user } = await this.platformChallenge(req, ['recovery-ack']);
    await this.ratePlatformChallenge(req, challenge);
    const fresh = await this.db.user.findFirst({ where: { id: user.id, platformAdmin: true, enabled: true, sessionVersion: challenge.version, mfaSecret: { not: null } } });
    if (!fresh) throw new UnauthorizedException('This sign-in challenge is invalid or expired. Start again.');
    await this.session(req, fresh, true, false, 'SUPER_ADMIN', true);
    await this.db.auditEvent.create({ data: { actorId: fresh.id, action: 'PLATFORM_ADMIN_LOGIN', target: fresh.id } });
    await this.platformAuthEvent(req, 'PLATFORM_ADMIN_LOGIN_SUCCEEDED', fresh.id, 'LOW', { factor: 'enrollment' });
    return this.me(req);
  }
  private async replacementChallenge(req: Request, stage: NonNullable<Request['session']['platformReplacement']>['stage'][] = []) {
    const challenge = req.session.platformReplacement;
    const now = Date.now();
    if (!challenge || challenge.expiresAt <= now || stage.length && !stage.includes(challenge.stage)) {
      delete req.session.platformReplacement;
      await this.saveSession(req);
      throw new UnauthorizedException('Authenticator replacement is invalid or expired. Start again.');
    }
    const user = await this.db.user.findUnique({ where: { id: challenge.userId } });
    if (user?.enabled !== true || user.platformAdmin !== true || user.sessionVersion !== challenge.version || req.session.userId !== user.id || req.session.platformMfaAssured !== true) {
      delete req.session.platformReplacement;
      await this.saveSession(req);
      throw new UnauthorizedException('Authenticator replacement is invalid or expired. Start again.');
    }
    return { challenge, user };
  }
  private async ratePlatformReplacement(req: Request, challenge: NonNullable<Request['session']['platformReplacement']>) {
    await this.checkFailures('platform-replacement-fail-ip:' + req.ip, 30);
    await this.checkFailures('platform-replacement-fail-account:' + challenge.userId, 5);
    await this.rate('platform-replacement-id:' + challenge.id, 10, 900);
  }
  async startPlatformAuthenticatorReplacement(req: Request, password: string, factor: string) {
    const user = await this.administrator(req);
    await this.checkFailures('platform-replacement-fail-ip:' + req.ip, 30);
    await this.checkFailures('platform-replacement-fail-account:' + user.id, 5);
    if (!await passwordMatches(user.passwordHash, password)) {
      await this.recordFailure('platform-replacement-fail-ip:' + req.ip, 30);
      await this.recordFailure('platform-replacement-fail-account:' + user.id);
      await this.platformAuthEvent(req, 'PLATFORM_ADMIN_REPLACEMENT_AUTH_FAILED', user.id, 'HIGH', { reason: 'password_invalid' });
      throw new UnauthorizedException('Verification failed. Check your password and current authenticator or recovery code.');
    }
    let recoveryUsed = false;
    let step: number | undefined;
    if (/^\d{6}$/.test(factor) && user.mfaSecret) {
      const checker = authenticator.clone();
      checker.options = { window: 1 };
      const delta = checker.checkDelta(factor, decrypt(user.mfaSecret));
      if (delta !== null) step = Math.floor(Date.now() / 30000) + delta;
    } else if (/^[A-Za-z0-9_-]{20}$/.test(factor)) {
      recoveryUsed = true;
    }
    if (step === undefined && !recoveryUsed) {
      await this.recordFailure('platform-replacement-fail-ip:' + req.ip, 30);
      await this.recordFailure('platform-replacement-fail-account:' + user.id);
      await this.platformAuthEvent(req, 'PLATFORM_ADMIN_REPLACEMENT_AUTH_FAILED', user.id, 'HIGH', { reason: 'factor_invalid' });
      throw new UnauthorizedException('Verification failed. Check your password and current authenticator or recovery code.');
    }
    const confirmed = await this.atomic(async tx => {
      const fresh = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      if (fresh.enabled !== true || fresh.platformAdmin !== true || fresh.sessionVersion !== req.session.version || !fresh.mfaSecret) return false;
      if (step !== undefined) {
        const changed = await tx.user.updateMany({
          where: { id: user.id, platformAdmin: true, enabled: true, sessionVersion: user.sessionVersion, mfaLastStep: { lt: BigInt(step) } },
          data: { mfaLastStep: BigInt(step) },
        });
        if (!changed.count) return false;
      } else {
        const hash = digest(factor);
        if (!fresh.mfaRecovery.includes(hash)) return false;
        const changed = await tx.user.updateMany({
          where: { id: user.id, platformAdmin: true, enabled: true, sessionVersion: user.sessionVersion, mfaRecovery: { has: hash } },
          data: { mfaRecovery: { set: fresh.mfaRecovery.filter(value => value !== hash) } },
        });
        if (!changed.count) return false;
        await tx.auditEvent.create({ data: { actorId: user.id, action: 'PLATFORM_ADMIN_RECOVERY_CODE_USED', target: user.id } });
        await this.queuePlatformNotice(tx, fresh.email, 'SyncAcademy administrator recovery code used', 'A recovery code was used to authenticate an authenticator replacement for your SyncAcademy administrator account. If this was not you, contact another active platform administrator.');
      }
      await tx.auditEvent.create({ data: { actorId: user.id, action: 'PLATFORM_ADMIN_REPLACEMENT_STARTED', target: user.id } });
      return true;
    });
    if (!confirmed) {
      await this.recordFailure('platform-replacement-fail-ip:' + req.ip, 30);
      await this.recordFailure('platform-replacement-fail-account:' + user.id);
      await this.platformAuthEvent(req, 'PLATFORM_ADMIN_REPLACEMENT_AUTH_FAILED', user.id, 'HIGH', { reason: 'factor_invalid_or_replayed' });
      throw new UnauthorizedException('Verification failed. Check your password and current authenticator or recovery code.');
    }
    const secret = authenticator.generateSecret();
    const replacement: NonNullable<Request['session']['platformReplacement']> = {
      id: randomToken(), userId: user.id, version: user.sessionVersion, stage: 'verify',
      issuedAt: Date.now(), expiresAt: Date.now() + 5 * 60000, attempts: 0, encryptedSecret: encrypt(secret),
    };
    req.session.platformReplacement = replacement;
    await this.saveSession(req);
    await this.platformAuthEvent(req, recoveryUsed ? 'PLATFORM_ADMIN_RECOVERY_CODE_USED' : 'PLATFORM_ADMIN_REPLACEMENT_STARTED', user.id, 'HIGH', { factor: recoveryUsed ? 'recovery_code' : 'totp', notified: recoveryUsed });
    return { secret, qr: await QRCode.toDataURL(authenticator.keyuri(user.email, 'SyncAcademy', secret)) };
  }
  async verifyPlatformAuthenticatorReplacement(req: Request, code: string) {
    const { challenge, user } = await this.replacementChallenge(req, ['verify']);
    await this.ratePlatformReplacement(req, challenge);
    const checker = authenticator.clone();
    checker.options = { window: 1 };
    const delta = checker.checkDelta(code, decrypt(challenge.encryptedSecret));
    if (delta === null) {
      challenge.attempts += 1;
      if (challenge.attempts >= 5) delete req.session.platformReplacement;
      await this.saveSession(req);
      await this.recordFailure('platform-replacement-fail-ip:' + req.ip, 30);
      await this.recordFailure('platform-replacement-fail-account:' + user.id);
      await this.platformAuthEvent(req, 'PLATFORM_ADMIN_REPLACEMENT_VERIFY_FAILED', user.id, 'MEDIUM', { failedAttempts: challenge.attempts });
      throw new UnauthorizedException('Replacement verification failed. Start again or use another valid code.');
    }
    const step = Math.floor(Date.now() / 30000) + delta;
    const changed = await this.atomic(async tx => {
      const fresh = await tx.user.findFirst({
        where: { id: user.id, platformAdmin: true, enabled: true, sessionVersion: challenge.version, mfaSecret: { not: null } },
      });
      if (!fresh) return false;
      await tx.auditEvent.create({ data: { actorId: user.id, action: 'PLATFORM_ADMIN_REPLACEMENT_VERIFIED', target: user.id } });
      return true;
    });
    if (!changed) {
      challenge.attempts += 1;
      if (challenge.attempts >= 5) delete req.session.platformReplacement;
      await this.saveSession(req);
      await this.recordFailure('platform-replacement-fail-ip:' + req.ip, 30);
      await this.recordFailure('platform-replacement-fail-account:' + user.id);
      await this.platformAuthEvent(req, 'PLATFORM_ADMIN_REPLACEMENT_VERIFY_FAILED', user.id, 'MEDIUM', { reason: 'code_replayed' });
      throw new UnauthorizedException('Replacement verification failed. Wait for a new code and try again.');
    }
    const recoveryCodes = Array.from({ length: 8 }, () => randomToken().slice(0, 20));
    challenge.stage = 'recovery-ack';
    challenge.verifiedStep = step;
    challenge.recoveryHashes = recoveryCodes.map(digest);
    await this.saveSession(req);
    await this.platformAuthEvent(req, 'PLATFORM_ADMIN_REPLACEMENT_VERIFIED', user.id, 'HIGH', { recoveryCodesIssued: true });
    return { recoveryCodes };
  }
  async acknowledgePlatformAuthenticatorReplacement(req: Request) {
    const { challenge, user } = await this.replacementChallenge(req, ['recovery-ack']);
    await this.ratePlatformReplacement(req, challenge);
    if (!challenge.recoveryHashes?.length || challenge.verifiedStep === undefined) throw new UnauthorizedException('Authenticator replacement is invalid or expired. Start again.');
    const verifiedStep = challenge.verifiedStep;
    const recoveryHashes = challenge.recoveryHashes;
    await this.atomic(async tx => {
      const changed = await tx.user.updateMany({
        where: { id: user.id, platformAdmin: true, enabled: true, sessionVersion: challenge.version, mfaSecret: { not: null } },
        data: { mfaSecret: challenge.encryptedSecret, mfaRecovery: recoveryHashes, mfaLastStep: BigInt(verifiedStep), sessionVersion: { increment: 1 } },
      });
      if (!changed.count) throw new UnauthorizedException('Authenticator replacement is invalid or expired. Start again.');
      await tx.auditEvent.create({ data: { actorId: user.id, action: 'PLATFORM_ADMIN_AUTHENTICATOR_REPLACED', target: user.id } });
      await tx.auditEvent.create({ data: { actorId: user.id, action: 'PLATFORM_ADMIN_SESSIONS_REVOKED', target: `${user.id}:account-wide-authenticator-replacement` } });
      await this.queuePlatformNotice(tx, user.email, 'SyncAcademy administrator authenticator replaced', 'The authenticator for your SyncAcademy platform administrator account was replaced and all active account sessions were revoked. Sign in again with your password and new authenticator.');
    });
    await this.realtime.publish({ scope: 'platform', userId: user.id });
    delete req.session.platformReplacement;
    await this.platformAuthEvent(req, 'PLATFORM_ADMIN_AUTHENTICATOR_REPLACED', user.id, 'HIGH', { sessionsRevoked: true, accountWide: true, notified: true });
    await new Promise<void>((resolve, reject) => req.session.destroy(error => error ? reject(error) : resolve()));
    return { message: 'Authenticator replaced. Sign in again with your new authenticator.' };
  }
  async setPlatformAdminEnabled(req: Request, userId: string, enabled: boolean) {
    const actor = await this.administrator(req);
    if (actor.id === userId) throw new ForbiddenException('You cannot change your own Super Admin access.');
    await this.rate('platform-admin-status:' + actor.id, 20, 3600);
    const result = await this.atomic(async tx => {
      const target = await tx.user.findFirst({ where: { id: userId, platformAdmin: true } });
      if (!target) throw new BadRequestException('Super Admin account not found.');
      if (target.enabled === enabled) return { changed: false, email: target.email };
      if (!enabled && await tx.user.count({ where: { platformAdmin: true, enabled: true } }) <= 1) throw new ConflictException('At least one active Super Admin must remain.');
      const updated = await tx.user.updateMany({
        where: { id: target.id, platformAdmin: true, enabled: target.enabled, sessionVersion: target.sessionVersion },
        data: { enabled, sessionVersion: { increment: 1 } },
      });
      if (!updated.count) throw new ConflictException('This administrator account changed. Refresh and try again.');
      const action = enabled ? 'PLATFORM_ADMIN_ENABLED' : 'PLATFORM_ADMIN_DISABLED';
      await tx.auditEvent.create({ data: { actorId: actor.id, action, target: target.id } });
      await tx.auditEvent.create({ data: { actorId: actor.id, action: 'PLATFORM_ADMIN_SESSIONS_REVOKED', target: `${target.id}:account-wide-access-change` } });
      await this.queuePlatformNotice(tx, target.email, enabled ? 'SyncAcademy administrator access enabled' : 'SyncAcademy administrator access disabled', enabled
        ? 'Platform administrator access was enabled for your account. Sign in again with your password and authenticator to access the platform.'
        : 'Platform administrator access was disabled for your account. All account sessions were revoked, including any school-role sessions. Contact another active platform administrator if this was not expected.');
      return { changed: true, email: target.email };
    });
    if (result.changed) {
      await this.realtime.publish({ scope: 'platform', userId });
      await this.platformAuthEvent(req, enabled ? 'PLATFORM_ADMIN_ENABLED' : 'PLATFORM_ADMIN_DISABLED', actor.id, 'HIGH', { targetUserId: userId, sessionsRevoked: true, accountWide: true, notified: true });
      await this.platformAuthEvent(req, 'PLATFORM_ADMIN_SESSIONS_REVOKED', actor.id, 'HIGH', { targetUserId: userId, scope: 'account-wide' });
    }
    return { message: enabled ? 'Super Admin account enabled. Fresh password and MFA sign-in are required.' : 'Super Admin account disabled. All sessions and school-role access for this account are revoked.' };
  }
  async logout(req: Request) {
    if (req.session.selectedRole === 'SUPER_ADMIN' && req.session.platformMfaAssured) {
      await this.db.auditEvent.create({ data: { actorId: req.session.userId, action: 'PLATFORM_ADMIN_LOGOUT', target: req.session.userId || '' } });
      await this.auditLog.recordSecurityEvent({ actorId: req.session.userId, category: 'AUTHENTICATION', eventType: 'PLATFORM_ADMIN_LOGOUT', severity: 'LOW', ipAddress: req.ip, userAgent: req.get('user-agent')?.slice(0, 500), details: { targetUserId: req.session.userId } });
    }
    await new Promise<void>((resolve, reject) => req.session.destroy(error => error ? reject(error) : resolve())); return { message: 'Signed out.' };
  }
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
    await this.session(req, updated, !!user.mfaSecret, false, req.session.selectedRole, req.session.platformMfaAssured === true); return this.me(req);
  }
  async setupMfa(req: Request) {
    const user = await this.user(req, false);
    if (user.platformAdmin) throw new ForbiddenException('Platform administrators must enroll through the dedicated sign-in challenge.');
    if (user.mustChangePassword || user.mfaSecret) throw new ForbiddenException('MFA setup is not available. Complete the password change first.');
    await this.rate('mfa-setup:' + user.id, 10, 900);
    const secret = authenticator.generateSecret(); req.session.setupSecret = encrypt(secret); req.session.setupExpires = Date.now() + 10 * 60000;
    const uri = authenticator.keyuri(user.email, 'SyncAcademy', secret);
    return { secret, qr: await QRCode.toDataURL(uri) };
  }
  async verifyMfa(req: Request, code: string, setup = false) {
    const user = await this.user(req, false); await this.rate('mfa:' + user.id, 8, 300);
    if (user.platformAdmin) throw new ForbiddenException('Platform administrators must verify through the dedicated sign-in challenge.');
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
    if (user.platformAdmin) throw new ForbiddenException('Platform administrators must recover through the dedicated sign-in challenge.');
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
        const previousResets = await tx.passwordReset.findMany({ where: { userId: user.id, usedAt: null }, select: { id: true } });
        await tx.passwordReset.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } });
        if (previousResets.length) await tx.outbox.updateMany({ where: { resetId: { in: previousResets.map(reset => reset.id) }, sentAt: null, cancelledAt: null }, data: { cancelledAt: new Date(), payload: '' } });
        const reset = await tx.passwordReset.create({ data: { userId: user.id, tokenHash: digest(token), expiresAt: new Date(Date.now() + 30 * 60000) } });
        const mail = buildPasswordResetEmail({ recipientEmail: email, token, appOrigin: config.APP_ORIGIN });
        await tx.outbox.create({ data: { resetId: reset.id, payload: encrypt(JSON.stringify({ to: email, subject: mail.subject, text: mail.text, html: mail.html })) } });
      });
    }
    return { message: 'If this address has an active account, a reset link will be sent.' };
  }
  async validateReset(req: Request, token: string) {
    await this.rate('reset-validate:' + req.ip, 20, 900);
    const reset = await this.db.passwordReset.findUnique({ where: { tokenHash: digest(token) }, select: { usedAt: true, expiresAt: true, user: { select: { enabled: true } } } });
    if (!reset || reset.usedAt || reset.expiresAt < new Date() || !reset.user.enabled) throw new BadRequestException('This reset link is invalid or expired. Request a new link.');
    return { valid: true };
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
  async createInvitation(tx: Prisma.TransactionClient, actorId: string, schoolId: string, data: { name: string; email: string; role: Role; studentId?: string; expiresInMinutes?: number; welcomeSchool?: boolean }) {
    if (await tx.membership.findFirst({ where: { schoolId, role: data.role, active: true, user: { email: data.email } } })) throw new ConflictException('This person already has this active school role. Manage their existing access instead.');
    if (await tx.invitation.findFirst({ where: { schoolId, email: data.email, role: data.role, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } } })) throw new ConflictException('A pending invitation already exists. Resend it instead.');
    await tx.invitation.updateMany({ where: { schoolId, email: data.email, role: data.role, acceptedAt: null, revokedAt: null, expiresAt: { lte: new Date() } }, data: { revokedAt: new Date() } });
    const token = randomToken();
    const expiresInMinutes = data.expiresInMinutes ?? 2880;
    const { welcomeSchool, ...invitationData } = data;
    const invitation = await tx.invitation.create({ data: { ...invitationData, expiresInMinutes, schoolId, invitedBy: actorId, tokenHash: digest(token), expiresAt: new Date(Date.now() + expiresInMinutes * 60000) } });
    await this.invitationMail(tx, invitation, token, welcomeSchool);
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
  async invitationMail(tx: Prisma.TransactionClient, invitation: { id: string; schoolId: string | null; platformAdmin: boolean; email: string; generation: number; expiresInMinutes: number; name?: string; role?: string }, token: string, welcomeSchool = false) {
    const school = invitation.schoolId ? await tx.school.findUniqueOrThrow({ where: { id: invitation.schoolId } }) : null;
    const expiryLabel = invitationExpiryLabel(invitation.expiresInMinutes);
    const organization = invitation.platformAdmin ? 'the SyncAcademy platform' : school!.name;
    const roleDescription = invitation.platformAdmin ? 'as a Super Admin' : `to ${school!.name}`;
    const roleLabel = invitation.platformAdmin ? 'Platform Administrator (SUPER_ADMIN)' : (invitation.role || 'Staff Member');
    const mail = buildInvitationEmail({
      recipientName: invitation.name,
      recipientEmail: invitation.email,
      organizationName: organization,
      roleDescription,
      roleLabel,
      expiryLabel,
      token,
      appOrigin: config.APP_ORIGIN,
    });
    await tx.outbox.create({ data: { invitationId: invitation.id, invitationGeneration: invitation.generation, payload: encrypt(JSON.stringify({ to: invitation.email, subject: welcomeSchool ? 'Welcome to SyncAcademy - Activate Your School Account' : mail.subject, text: mail.text, html: mail.html })) } });
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
      if (!i.platformAdmin) {
        const existingMembership = await tx.membership.findFirst({ where: { userId: user.id, schoolId: i.schoolId!, role: i.role } });
        if (existingMembership?.active) throw new ConflictException('This role is already active.');
        if (existingMembership) await tx.membership.update({ where: { id: existingMembership.id }, data: { active: true } });
        else await tx.membership.create({ data: { userId: user.id, schoolId: i.schoolId!, role: i.role } });
        await tx.user.update({ where: { id: user.id }, data: { sessionVersion: { increment: 1 } } });
      }
      if (i.studentId && i.schoolId) {
        const changed = await tx.student.updateMany({ where: { id: i.studentId, schoolId: i.schoolId, userId: null }, data: { userId: user.id } });
        if (!changed.count) throw new ConflictException('Student account is already linked.');
      }
      await tx.invitation.update({ where: { id: i.id }, data: { acceptedAt: new Date() } });
      await tx.auditEvent.create({ data: { actorId: user.id, schoolId: i.schoolId, action: i.platformAdmin ? 'PLATFORM_ADMIN_INVITATION_ACCEPTED' : 'INVITATION_ACCEPTED', target: i.id } });
      await tx.auditEvent.createMany({ data: [
        { actorId: user.id, schoolId: i.schoolId, action: 'TERMS_ACCEPTED', target: `${i.id}:2026-10-12` },
        { actorId: user.id, schoolId: i.schoolId, action: 'PRIVACY_NOTICE_ACKNOWLEDGED', target: `${i.id}:2026-10-12` },
      ] });
    });
    return { message: 'Invitation accepted. Sign in to access your account.' };
  }
}
