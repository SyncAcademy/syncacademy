import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import { config } from './config';
import { decrypt } from './security';
const db = new PrismaClient();
const transport = nodemailer.createTransport({ host: config.SMTP_HOST, port: config.SMTP_PORT, secure: config.SMTP_SECURE === 'true', auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASSWORD } : undefined, connectionTimeout: 10000, socketTimeout: 20000, ...(config.NODE_ENV === 'production' && config.SMTP_SECURE !== 'true' ? { requireTLS: true } : {}) });
let stopping = false; process.on('SIGTERM', () => stopping = true); process.on('SIGINT', () => stopping = true);
async function main() {
  if (config.SMTP_USER && !config.SMTP_PASSWORD) {
    console.error('SMTP_PASSWORD is required when SMTP_USER is configured. Add a Gmail App Password to .env.');
    process.exitCode = 1;
    return;
  }
  await db.$connect(); let cycles = 0;
  while (!stopping) {
    const lease = randomUUID();
    try {
      const jobs = await db.$queryRaw<{ id: string }[]>`UPDATE "Outbox" SET "leaseUntil" = NOW() + INTERVAL '60 seconds', "leaseId" = ${lease}, attempts = attempts + 1 WHERE id = (SELECT id FROM "Outbox" WHERE "sentAt" IS NULL AND "failedAt" IS NULL AND "cancelledAt" IS NULL AND "availableAt" <= NOW() AND ("leaseUntil" IS NULL OR "leaseUntil" < NOW()) ORDER BY "createdAt" FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING id`;
      if (jobs.length) {
        const job = await db.outbox.findUniqueOrThrow({ where: { id: jobs[0].id } });
        try {
          let valid = true;
          if (job.invitationId) {
            const i = await db.invitation.findUnique({ where: { id: job.invitationId }, include: { school: true } });
            valid = !!i && (i.platformAdmin ? !i.schoolId : !!i.school?.active) && !i.acceptedAt && !i.revokedAt && i.expiresAt > new Date() && i.generation === job.invitationGeneration;
          }
          if (job.resetId) { const r = await db.passwordReset.findUnique({ where: { id: job.resetId }, include: { user: true } }); valid = !!r && r.user.enabled && !r.usedAt && r.expiresAt > new Date(); }
          if (!valid) await db.outbox.updateMany({ where: { id: job.id, leaseId: lease }, data: { cancelledAt: new Date(), payload: '', leaseUntil: null } });
          else {
            const mail = JSON.parse(decrypt(job.payload));
            await transport.sendMail({ from: config.MAIL_FROM, to: mail.to, subject: mail.subject, text: mail.text, messageId: `<${job.id}@syncacademy.local>` });
            await db.outbox.updateMany({ where: { id: job.id, leaseId: lease }, data: { sentAt: new Date(), payload: '', leaseUntil: null } });
          }
        } catch (error) {
          await db.outbox.updateMany({ where: { id: job.id, leaseId: lease }, data: { leaseUntil: null, availableAt: new Date(Date.now() + Math.min(3600000, 2 ** job.attempts * 10000)), failedAt: job.attempts >= 8 ? new Date() : null } });
          const smtpError = error as { code?: string; responseCode?: number; command?: string };
          console.error(JSON.stringify({ event: 'email_delivery_failed', jobId: job.id, attempt: job.attempts, code: smtpError.code, responseCode: smtpError.responseCode, command: smtpError.command }));
        }
      } else await new Promise(resolve => setTimeout(resolve, 1000));
      if (++cycles % 300 === 0) await db.rateBucket.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    } catch { console.error('Outbox database unavailable; retrying'); await new Promise(resolve => setTimeout(resolve, 5000)); }
  }
  transport.close(); await db.$disconnect();
}
main().catch(() => { console.error('Worker failed to start'); process.exit(1); });
