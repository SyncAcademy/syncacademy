import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().url(),
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
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(2).default(0),
});
export const config = schema.parse(process.env);
if (config.NODE_ENV === 'production' && !config.APP_ORIGIN.startsWith('https://')) throw new Error('Production requires an HTTPS APP_ORIGIN');
if (new URL(config.APP_ORIGIN).origin !== config.APP_ORIGIN) throw new Error('APP_ORIGIN must be an origin without a path or trailing slash');
