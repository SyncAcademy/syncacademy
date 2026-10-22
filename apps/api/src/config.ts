import 'dotenv/config';
import { z } from 'zod';
import { isIP } from 'node:net';

const schema = z.object({
  DATABASE_URL: z.string().url(),
  MONITOR_INSTANCE_ID: z.string().regex(/^[a-zA-Z0-9._-]{1,80}$/).optional(),
  REQUEST_METRICS: z.enum(['true', 'false']).default('false'),
  REALTIME_TRANSPORT: z.enum(['local', 'postgres']).default('local'),
  REALTIME_DATABASE_URL: z.string().url().optional(),
  APP_ORIGIN: z.string().url(),
  SESSION_SECRET: z.string().min(48),
  DATA_ENCRYPTION_KEY: z.string().regex(/^[a-f0-9]{64}$/i),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).default(3000),
  SMTP_HOST: z.string().min(1), SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().optional(), SMTP_PASSWORD: z.string().optional(),
  SMTP_SECURE: z.enum(['true','false']).default('false'),
  MAIL_FROM: z.string().email(),
  CONTACT_NOTIFICATION_EMAIL: z.string().email().optional().or(z.literal('')),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(2).default(0),
  TRUSTED_PROXY_CIDRS: z.string().default('').refine(value => value.split(',').map(item => item.trim()).filter(Boolean).every(item => { const [address, mask] = item.split('/'); const family = isIP(address); const prefix = mask === undefined ? (family === 4 ? 32 : 128) : Number(mask); return !!family && Number.isInteger(prefix) && prefix >= 0 && prefix <= (family === 4 ? 32 : 128); }), 'Use comma-separated trusted proxy CIDRs.'),
  PUBLIC_FORM_EMAIL_LIMIT: z.coerce.number().int().min(1).default(3),
  PUBLIC_FORM_IP_LIMIT: z.coerce.number().int().min(1).default(10),
  PUBLIC_FORM_BURST_LIMIT: z.coerce.number().int().min(1).default(5),
  PUBLIC_FORM_BLOCK_HOURS: z.coerce.number().int().min(1).default(24),
  PUBLIC_FORM_RETENTION_DAYS: z.coerce.number().int().min(30).default(90),
  NEXTSMS_API_URL: z.string().url().default('https://messaging-service.co.tz'),
  NEXTSMS_TOKEN: z.string().optional(),
  NEXTSMS_USERNAME: z.string().optional(),
  NEXTSMS_PASSWORD: z.string().optional(),
  NEXTSMS_SENDER_ID: z.string().default('SYNCACADEMY'),
  NEXTSMS_WHATSAPP_ACCOUNT: z.string().optional(),
  NEXTSMS_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),
  EMAIL_PROVIDER: z.enum(['smtp', 'resend', 'mock']).default('smtp'),
  MOCK_PAYMENT_PROVIDER: z.enum(['true', 'false']).default('false'),
  COMMUNICATION_MOCK_DISPATCH: z.enum(['true', 'false']).default('false'),
});
export const config = schema.parse(process.env);
if (config.NODE_ENV === 'production' && !config.APP_ORIGIN.startsWith('https://')) throw new Error('Production requires an HTTPS APP_ORIGIN');
if (new URL(config.APP_ORIGIN).origin !== config.APP_ORIGIN) throw new Error('APP_ORIGIN must be an origin without a path or trailing slash');
if (config.NODE_ENV === 'production' && config.MOCK_PAYMENT_PROVIDER === 'true') throw new Error('Mock payments are not permitted in production.');
if (config.NODE_ENV === 'production' && config.TRUST_PROXY_HOPS > 0 && !config.TRUSTED_PROXY_CIDRS.trim()) throw new Error('Production proxy trust requires explicit TRUSTED_PROXY_CIDRS.');
