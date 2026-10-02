import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';
import helmet from 'helmet';
import express, { Request, Response, NextFunction } from 'express';
import { config } from './config';
import { AppModule } from './app.module';

@Catch()
class SafeErrors implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    let status = 500; let message = 'The service could not complete this request. Please try again.';
    if (error instanceof HttpException) { status = error.getStatus(); const details = error.getResponse(); message = typeof details === 'string' ? details : (details as any).message; }
    else if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002','P2003','P2025','P2034'].includes(error.code)) { status = error.code === 'P2025' ? 404 : 409; message = 'This record already exists, changed, or references an unavailable record. Refresh and try again.'; }
    if (status >= 500) console.error(JSON.stringify({ event: 'request_failed', requestId: response.getHeader('X-Request-ID'), errorType: error instanceof Error ? error.name : 'unknown' }));
    if (status === 429) response.setHeader('Retry-After', '900');
    response.status(status).json({ statusCode: status, message, requestId: response.getHeader('X-Request-ID') });
  }
}
async function main() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const server = app.getHttpAdapter().getInstance(); server.disable('x-powered-by');
  server.set('trust proxy', config.TRUST_PROXY_HOPS);
  app.use(helmet());
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Request-ID', randomUUID()); res.setHeader('Cache-Control', 'no-store');
    if (!['GET','HEAD','OPTIONS'].includes(req.method) && (req.get('Origin') !== config.APP_ORIGIN || req.get('X-Requested-With') !== 'SyncAcademy' || !req.is('application/json'))) {
      return res.status(403).json({ message: 'Request origin or content type is not allowed.' });
    }
    next();
  });
  app.use(express.json({ limit: '32kb' }));
  const pool = new Pool({ connectionString: config.DATABASE_URL, max: 5 });
  pool.on('error', () => console.error('Session database connection unavailable'));
  const PgStore = connectPgSimple(session);
  app.use(session({ name: 'sa.sid', secret: config.SESSION_SECRET, store: new PgStore({ pool, tableName: 'session', createTableIfMissing: false, pruneSessionInterval: 900 }), resave: false, saveUninitialized: false, rolling: true, cookie: { httpOnly: true, secure: config.NODE_ENV === 'production', sameSite: 'lax', maxAge: 8 * 3600000, path: '/' } }));
  app.useGlobalFilters(new SafeErrors()); app.enableShutdownHooks();
  await app.listen(config.PORT, '0.0.0.0');
}
main().catch(() => { console.error('Backend startup failed. Check configuration, migrations and database availability.'); process.exit(1); });
