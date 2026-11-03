import { HttpException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Database } from './database/database.service';
import { config } from './config';
import { digest } from './security';

type Form = 'contact' | 'demo';

@Injectable()
export class PublicFormProtectionService {
  private readonly readBuckets = new Map<string, { count: number; expiresAt: number }>();
  constructor(private readonly db: Database) {}

  checkPublicReadRate(ip: string, scope = 'public-branding', max = 120, windowSeconds = 60): void {
    const now = Date.now();
    if (this.readBuckets.size >= 4096) {
      for (const [bucketKey, entry] of this.readBuckets.entries()) {
        if (entry.expiresAt <= now) this.readBuckets.delete(bucketKey);
      }
      if (this.readBuckets.size >= 4096) {
        const oldest = this.readBuckets.keys().next().value;
        if (oldest) this.readBuckets.delete(oldest);
      }
    }
    const key = digest(`${scope}:${ip || 'unknown'}`);
    const existing = this.readBuckets.get(key);
    if (!existing || existing.expiresAt <= now) {
      this.readBuckets.set(key, { count: 1, expiresAt: now + windowSeconds * 1000 });
      return;
    }
    existing.count += 1;
    if (existing.count > max) {
      const retryAfter = Math.max(1, Math.ceil((existing.expiresAt - now) / 1000));
      throw new HttpException({ message: 'Too many requests. Please try again later.', retryAfter }, 429);
    }
  }

  async submit<T>(form: Form, email: string, ip: string, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    const emailHash = digest('public-form-email:' + email.toLowerCase());
    const ipHash = digest('public-form-ip:' + ip);
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 86400000);
    const burstAgo = new Date(now.getTime() - 900000);
    const workTransaction = () => this.db.$transaction(async tx => {
      for (const lock of [ipHash, emailHash].sort()) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lock}))`;
      const block = await tx.publicFormBlock.findUnique({ where: { ipHash } });
      const recent = await tx.publicFormAttempt.findMany({ where: { ipHash, createdAt: { gte: dayAgo } }, select: { form: true, emailHash: true, createdAt: true } });
      const emailAttempts = await tx.publicFormAttempt.findMany({ where: { form, emailHash, createdAt: { gte: dayAgo } }, select: { createdAt: true }, orderBy: { createdAt: 'asc' } });
      const burst = recent.filter(row => row.createdAt >= burstAgo);
      let retryAt: Date | undefined;
      let reason = '';
      if (block && block.expiresAt > now) { retryAt = block.expiresAt; reason = 'blocked'; }
      else if (emailAttempts.length >= config.PUBLIC_FORM_EMAIL_LIMIT) { retryAt = new Date(emailAttempts[0].createdAt.getTime() + 86400000); reason = 'email-limit'; }
      else if (recent.length >= config.PUBLIC_FORM_IP_LIMIT || burst.length >= config.PUBLIC_FORM_BURST_LIMIT) {
        retryAt = new Date(now.getTime() + config.PUBLIC_FORM_BLOCK_HOURS * 3600000); reason = 'ip-limit';
        await tx.publicFormBlock.upsert({ where: { ipHash }, create: { ipHash, expiresAt: retryAt }, update: { expiresAt: retryAt } });
      }
      if (reason) {
        await tx.securityEvent.create({ data: { category: 'PUBLIC_FORM', severity: 'MEDIUM', eventType: 'PUBLIC_FORM_RESTRICTED', ipAddress: ip, details: { form, reason, emailHash: emailHash.slice(0, 12), blockExpiresAt: retryAt?.toISOString() } } });
        return { allowed: false as const, retryAt: retryAt! };
      }
      const value = await work(tx);
      await tx.publicFormAttempt.create({ data: { form, emailHash, ipHash } });
      await tx.securityEvent.create({ data: { category: 'PUBLIC_FORM', eventType: 'PUBLIC_FORM_SUBMITTED', ipAddress: ip, details: { form, emailHash: emailHash.slice(0, 12) } } });
      return { allowed: true as const, value };
    }, { isolationLevel: 'Serializable', timeout: 15000 });
    let result: Awaited<ReturnType<typeof workTransaction>>;
    for (let attempt = 0; ; attempt++) {
      try { result = await workTransaction(); break; }
      catch (error) {
        const retryable = error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2034' || error.code === 'P2010' && error.meta?.code === '40001');
        if (retryable && attempt < 5) continue;
        throw error;
      }
    }
    if (!result.allowed) {
      const retryAfter = Math.max(1, Math.ceil((result.retryAt.getTime() - Date.now()) / 1000));
      throw new HttpException({ message: 'You have reached the request limit. Please try again later.', retryAfter }, 429);
    }
    return result.value;
  }
}
