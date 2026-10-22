import { hostname } from 'node:os';
import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { PrismaClient, CommunicationChannel, DeliveryStatus } from '@prisma/client';
import { config } from './config';
import { decrypt } from './security';
import { SYNCACADEMY_LOGO_CID } from './communication/email/email-templates';
import {
  SmsProvider,
  WhatsAppProvider,
  EmailProvider,
  OutboundMessageResult,
  NextSmsProvider,
  NextWhatsAppProvider,
  SmtpEmailProvider,
  ResendEmailProvider,
  MockCommunicationProvider,
} from './communication';
import { calculateSmsSegments } from './communication/communication.service';

const db = new PrismaClient();

// Initialize communication providers with environment options and fallback to mock
const mockProvider = new MockCommunicationProvider();

const isMock = config.COMMUNICATION_MOCK_DISPATCH === 'true';

const smsProvider: SmsProvider = (isMock || !config.NEXTSMS_USERNAME)
  ? mockProvider
  : new NextSmsProvider({
      baseUrl: config.NEXTSMS_API_URL,
      username: config.NEXTSMS_USERNAME,
      password: config.NEXTSMS_PASSWORD,
      defaultSenderId: config.NEXTSMS_SENDER_ID,
      testMode: false,
    });

const whatsAppProvider: WhatsAppProvider = (isMock || !config.NEXTSMS_USERNAME)
  ? mockProvider
  : new NextWhatsAppProvider({
      baseUrl: config.NEXTSMS_API_URL,
      username: config.NEXTSMS_USERNAME,
      password: config.NEXTSMS_PASSWORD,
      defaultSenderId: config.NEXTSMS_WHATSAPP_ACCOUNT || config.NEXTSMS_SENDER_ID,
      testMode: false,
    });

const emailProvider: EmailProvider = isMock || config.EMAIL_PROVIDER === 'mock'
  ? mockProvider
  : config.EMAIL_PROVIDER === 'resend' && config.RESEND_API_KEY
  ? new ResendEmailProvider({
      apiKey: config.RESEND_API_KEY,
      defaultFrom: config.MAIL_FROM,
      mockMode: false,
    })
  : new SmtpEmailProvider({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE === 'true',
      user: config.SMTP_USER,
      password: config.SMTP_PASSWORD,
      defaultFrom: config.MAIL_FROM,
    });

let stopping = false;
process.on('SIGTERM', () => { stopping = true; });
process.on('SIGINT', () => { stopping = true; });
const workerInstance=(config.MONITOR_INSTANCE_ID || hostname()).slice(0,80);
const workerMetrics={name:'Communication dispatch',successes:0,failures:0,lastExecution:null as string|null,durationMs:null as number|null,cleanupAt:null as string|null};
let heartbeatBusy=false;
async function heartbeat() {
  if (heartbeatBusy) return;
  heartbeatBusy = true;
  try {
    await db.$executeRaw`INSERT INTO "MonitorWorker" (instance, at, data) VALUES (${workerInstance}, now(), ${JSON.stringify(workerMetrics)}::jsonb) ON CONFLICT(instance) DO UPDATE SET at = EXCLUDED.at, data = EXCLUDED.data`;
  } catch {
    console.error(JSON.stringify({ event: 'worker_heartbeat_failed' }));
  } finally {
    heartbeatBusy = false;
  }
}

async function main() {
  if (config.EMAIL_PROVIDER === 'smtp' && config.SMTP_USER && !config.SMTP_PASSWORD && !isMock) {
    console.error('SMTP_PASSWORD is required when SMTP_USER is configured. Add credentials to .env or use COMMUNICATION_MOCK_DISPATCH=true.');
    process.exitCode = 1;
    return;
  }
  await db.$connect();
  let cycles = 0;
  await heartbeat();
  const heartbeatTimer = setInterval(() => void heartbeat(), 15_000);
  heartbeatTimer.unref();
  while (!stopping) {
    const lease = randomUUID();
    try {
      const jobs = await db.$queryRaw<{ id: string }[]>`
        UPDATE "Outbox"
        SET "leaseUntil" = NOW() + INTERVAL '60 seconds',
            "leaseId" = ${lease},
            attempts = attempts + 1
        WHERE id = (
          SELECT id FROM "Outbox"
          WHERE "sentAt" IS NULL
            AND "failedAt" IS NULL
            AND "cancelledAt" IS NULL
            AND "availableAt" <= NOW()
            AND ("leaseUntil" IS NULL OR "leaseUntil" < NOW())
          ORDER BY "createdAt"
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
        RETURNING id
      `;

      if (jobs.length) {
        const executionStarted=performance.now();
        const job = await db.outbox.findUniqueOrThrow({ where: { id: jobs[0].id } });
        try {
          let valid = true;

          // Legacy auth validation for invitations & password resets
          if (job.invitationId) {
            const i = await db.invitation.findUnique({ where: { id: job.invitationId }, include: { school: true } });
            valid = !!i && (i.platformAdmin ? !i.schoolId : !!i.school?.active) && !i.acceptedAt && !i.revokedAt && i.expiresAt > new Date() && i.generation === job.invitationGeneration;
          }
          if (job.resetId) {
            const r = await db.passwordReset.findUnique({ where: { id: job.resetId }, include: { user: true } });
            valid = !!r && r.user.enabled && !r.usedAt && r.expiresAt > new Date();
          }

          if (!valid) {
            await db.outbox.updateMany({
              where: { id: job.id, leaseId: lease },
              data: { cancelledAt: new Date(), payload: '', leaseUntil: null },
            });
            continue;
          }

          const rawPayload = decrypt(job.payload);
          const payload = JSON.parse(rawPayload);
          const channel: CommunicationChannel = job.channel || payload.channel || 'EMAIL';

          // Credit Wallet Reservation for SMS and WhatsApp
          let reservedUnits = 0;
          if (job.schoolId && (channel === 'SMS' || channel === 'WHATSAPP')) {
            reservedUnits = channel === 'SMS' 
              ? calculateSmsSegments(payload.body || payload.text || '') 
              : 1;

            try {
              await db.$transaction(async tx => {
                let wallet = await tx.schoolCreditWallet.findUnique({
                  where: { schoolId: job.schoolId! },
                });
                if (!wallet) {
                  wallet = await tx.schoolCreditWallet.create({
                    data: { schoolId: job.schoolId!, smsBalance: 100, whatsappBalance: 25, currency: 'TZS' },
                  });
                }

                const currentBalance = channel === 'SMS' ? wallet.smsBalance : wallet.whatsappBalance;
                if (currentBalance < reservedUnits) {
                  throw new Error(`INSUFFICIENT_CREDITS: Balance is ${currentBalance}, required ${reservedUnits}`);
                }

                const newBalance = currentBalance - reservedUnits;
                if (channel === 'SMS') {
                  await tx.schoolCreditWallet.update({
                    where: { id: wallet.id },
                    data: { smsBalance: newBalance },
                  });
                } else {
                  await tx.schoolCreditWallet.update({
                    where: { id: wallet.id },
                    data: { whatsappBalance: newBalance },
                  });
                }

                await tx.creditLedger.create({
                  data: {
                    schoolId: job.schoolId!,
                    walletId: wallet.id,
                    channel,
                    type: 'RESERVATION',
                    units: -reservedUnits,
                    balanceBefore: currentBalance,
                    balanceAfter: newBalance,
                    referenceId: job.id,
                    referenceType: 'OUTBOX',
                    description: `Reserved ${reservedUnits} ${channel} credits for outbox dispatch`,
                  },
                });
              });
            } catch (walletErr: any) {
              if (walletErr.message?.includes('INSUFFICIENT_CREDITS')) {
                // Postpone message dispatch until wallet is topped up
                await db.outbox.updateMany({
                  where: { id: job.id, leaseId: lease },
                  data: {
                    leaseUntil: null,
                    availableAt: new Date(Date.now() + 15 * 60 * 1000), // Check again in 15 mins
                  },
                });
                console.warn(`Job ${job.id} postponed: insufficient ${channel} credits for school ${job.schoolId}`);
                continue;
              }
              throw walletErr;
            }
          }

          let result: OutboundMessageResult;

          if (channel === 'SMS') {
            result = await smsProvider.send({
              to: payload.recipient,
              text: payload.body || payload.text,
              reference: job.id,
            });
          } else if (channel === 'WHATSAPP') {
            try {
              result = await whatsAppProvider.sendTemplate({
                to: payload.recipient,
                template: payload.templateKey || 'general_notification',
                attributes: payload.templateParams ? [payload.templateParams] : undefined,
                reference: job.id,
              });
            } catch (waErr) {
              // Automatic failover to SMS if WhatsApp template/account fails and fallback is allowed
              if (payload.fallbackToSms !== false) {
                console.warn(`WhatsApp dispatch failed for job ${job.id}; initiating SMS failover`);
                result = await smsProvider.send({
                  to: payload.recipient,
                  text: payload.body || `Notification: ${payload.templateKey || 'Update'}`,
                  reference: `${job.id}-sms-fallback`,
                });
              } else {
                throw waErr;
              }
            }
          } else {
            // EMAIL channel
            const emailAttachments = payload.attachments || (job.invitationId || job.resetId ? [{
              filename: 'syncacademy-logo.png',
              path: resolve(process.cwd(), 'src/communication/email/syncacademy-logo.png'),
              cid: SYNCACADEMY_LOGO_CID,
            }] : undefined);

            result = await emailProvider.send({
              to: payload.to || payload.recipient,
              subject: payload.subject,
              text: payload.body || payload.text,
              html: payload.html,
              attachments: emailAttachments,
              reference: job.id,
            });
          }

          // Evaluate result
          if (['DELIVERED', 'ACCEPTED', 'ENROUTE', 'READ'].includes(result.status)) {
            await db.outbox.updateMany({
              where: { id: job.id, leaseId: lease },
              data: { sentAt: new Date(), payload: '', leaseUntil: null },
            });
            workerMetrics.successes++;

            if (reservedUnits > 0 && job.schoolId) {
              const wallet = await db.schoolCreditWallet.findUnique({ where: { schoolId: job.schoolId } });
              if (wallet) {
                const bal = channel === 'SMS' ? wallet.smsBalance : wallet.whatsappBalance;
                await db.creditLedger.create({
                  data: {
                    schoolId: job.schoolId,
                    walletId: wallet.id,
                    channel,
                    type: 'CONSUMPTION',
                    units: -reservedUnits,
                    balanceBefore: bal,
                    balanceAfter: bal,
                    referenceId: job.id,
                    referenceType: 'OUTBOX',
                    description: `Consumed ${reservedUnits} credits upon delivery`,
                  },
                });
              }
            }

            if (payload.communicationLogId) {
              await db.communicationLog.updateMany({
                where: { id: payload.communicationLogId },
                data: {
                  status: result.status as DeliveryStatus,
                  providerMessageId: result.providerMessageId,
                  unitCostTzs: result.unitCostTzs ?? undefined,
                  deliveredAt: result.status === 'DELIVERED' ? new Date() : null,
                },
              });
            }
          } else {
            // Provider returned non-delivered status (FAILED / REJECTED / UNDELIVERABLE)
            workerMetrics.failures++;
            const isDeadLetter = job.attempts >= 8 || result.isRetryable === false;

            if (isDeadLetter && reservedUnits > 0 && job.schoolId) {
              // Release reservation back to wallet
              await db.$transaction(async tx => {
                const wallet = await tx.schoolCreditWallet.findUnique({ where: { schoolId: job.schoolId! } });
                if (wallet) {
                  const before = channel === 'SMS' ? wallet.smsBalance : wallet.whatsappBalance;
                  const after = before + reservedUnits;
                  if (channel === 'SMS') {
                    await tx.schoolCreditWallet.update({ where: { id: wallet.id }, data: { smsBalance: after } });
                  } else {
                    await tx.schoolCreditWallet.update({ where: { id: wallet.id }, data: { whatsappBalance: after } });
                  }
                  await tx.creditLedger.create({
                    data: {
                      schoolId: job.schoolId!,
                      walletId: wallet.id,
                      channel,
                      type: 'RELEASE',
                      units: reservedUnits,
                      balanceBefore: before,
                      balanceAfter: after,
                      referenceId: job.id,
                      referenceType: 'OUTBOX',
                      description: `Released ${reservedUnits} credits: permanent dispatch failure`,
                    },
                  });
                }
              });
            }

            await db.outbox.updateMany({
              where: { id: job.id, leaseId: lease },
              data: {
                leaseUntil: null,
                availableAt: new Date(Date.now() + Math.min(3600000, 2 ** job.attempts * 10000)),
                failedAt: isDeadLetter ? new Date() : null,
              },
            });

            if (payload.communicationLogId) {
              await db.communicationLog.updateMany({
                where: { id: payload.communicationLogId },
                data: {
                  status: (result.status as DeliveryStatus) || 'FAILED',
                  providerMessageId: result.providerMessageId,
                  errorCode: String(result.statusCode || 'SEND_ERROR'),
                  errorMessage: result.statusDescription || 'Provider rejected message',
                },
              });
            }
          }
        } catch (error) {
          workerMetrics.failures++;
          const isDeadLetter = job.attempts >= 8;
          await db.outbox.updateMany({
            where: { id: job.id, leaseId: lease },
            data: {
              leaseUntil: null,
              availableAt: new Date(Date.now() + Math.min(3600000, 2 ** job.attempts * 10000)),
              failedAt: isDeadLetter ? new Date() : null,
            },
          });

          const err = error as { code?: string; responseCode?: number; message?: string };
          console.error(JSON.stringify({
            event: 'message_dispatch_failed',
            jobId: job.id,
            attempt: job.attempts,
            code: err.code || err.responseCode,
            message: err.message,
          }));
        } finally {
          workerMetrics.lastExecution = new Date().toISOString();
          workerMetrics.durationMs = performance.now() - executionStarted;
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (++cycles % 300 === 0) {
        await db.rateBucket.deleteMany({ where: { expiresAt: { lt: new Date() } } });
        await db.publicFormBlock.deleteMany({ where: { expiresAt: { lt: new Date() } } });
        const publicFormCutoff = new Date(Date.now() - config.PUBLIC_FORM_RETENTION_DAYS * 86400000);
        await db.publicFormAttempt.deleteMany({ where: { createdAt: { lt: publicFormCutoff } } });
        await db.securityEvent.deleteMany({ where: { category: 'PUBLIC_FORM', createdAt: { lt: publicFormCutoff } } });
        workerMetrics.cleanupAt = new Date().toISOString();
      }
    } catch {
      console.error('Outbox database unavailable; retrying');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  clearInterval(heartbeatTimer);
  await db.$disconnect();
}

main().catch(() => {
  console.error('Worker failed to start');
  process.exit(1);
});
