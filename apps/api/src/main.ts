import { Metrics } from './monitoring/metrics';
import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { BlockList, isIP } from 'node:net';
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
import { RealtimeGateway, SchoolChange } from './realtime.gateway';
import { SessionIoAdapter } from './session-io.adapter';

@Catch()
class SafeErrors implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    let status = 500; let message = 'The service could not complete this request. Please try again.';
    if (error instanceof HttpException) { status = error.getStatus(); const details = error.getResponse(); message = typeof details === 'string' ? details : (details as any).message; }
    else if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002','P2003','P2025','P2034'].includes(error.code)) { status = error.code === 'P2025' ? 404 : 409; message = 'This record already exists, changed, or references an unavailable record. Refresh and try again.'; }
    if (status >= 500) console.error(JSON.stringify({ event: 'request_failed', requestId: response.getHeader('X-Request-ID'), errorType: error instanceof Error ? error.name : 'unknown' }));
    if (status === 429) response.setHeader('Retry-After', String((error instanceof HttpException && typeof error.getResponse() === 'object' ? (error.getResponse() as any).retryAfter : undefined) ?? 900));
    response.status(status).json({ statusCode: status, message, requestId: response.getHeader('X-Request-ID') });
  }
}
async function main() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const server = app.getHttpAdapter().getInstance(); server.disable('x-powered-by');
  const trustedProxies = new BlockList();
  for (const entry of config.TRUSTED_PROXY_CIDRS.split(',').map(value => value.trim()).filter(Boolean)) {
    const [address, mask] = entry.split('/');
    const family = isIP(address);
    const prefix = mask === undefined ? (family === 4 ? 32 : 128) : Number(mask);
    if (!family || !Number.isInteger(prefix) || prefix < 0 || prefix > (family === 4 ? 32 : 128)) throw new Error('Invalid trusted proxy CIDR.');
    trustedProxies.addSubnet(address, prefix, family === 4 ? 'ipv4' : 'ipv6');
  }
  server.set('trust proxy', (address: string) => trustedProxies.check(address));
  const monitoring=app.get(Metrics);
  app.use(helmet());
  app.use((req: Request, res: Response, next: NextFunction) => {
    const started = performance.now();
    res.once('finish', () => {
      const durationMs = Math.round(performance.now() - started);
      monitoring.record(req.method,req.route?.path,res.statusCode,durationMs);
      if (config.REQUEST_METRICS === 'true' || durationMs >= 1000) console.log(JSON.stringify({ event: 'http_request', method: req.method, route: req.route?.path ?? 'unmatched', status: res.statusCode, durationMs, requestId: res.getHeader('X-Request-ID') }));
    });
    res.setHeader('X-Request-ID', randomUUID()); res.setHeader('Cache-Control', 'no-store');
    const isExempt = req.path.startsWith('/api/v1/webhooks/') || req.path.startsWith('/api/v1/public/');
    if (!isExempt && !['GET','HEAD','OPTIONS'].includes(req.method) && (req.get('Origin') !== config.APP_ORIGIN || req.get('X-Requested-With') !== 'SyncAcademy' || !req.is('application/json'))) {
      return res.status(403).json({ message: 'Request origin or content type is not allowed.' });
    }
    next();
  });
  app.use('/api/v1/schools/:schoolId/registry/imports/preview', express.json({ limit: '8mb' }));
  app.use(express.json({
    limit: '32kb',
    verify: (req, _res, buffer) => {
      if (req.url?.split('?')[0] === '/api/v1/webhooks/resend') {
        (req as Request & { rawBody?: Buffer }).rawBody = Buffer.from(buffer);
      }
    },
  }));
  const pool = new Pool({ connectionString: config.DATABASE_URL, max: 5 });
  if (config.REQUEST_METRICS === 'true') {
    const metricsTimer = setInterval(() => { const memory = process.memoryUsage(); console.log(JSON.stringify({ event: 'runtime_metrics', rssBytes: memory.rss, heapUsedBytes: memory.heapUsed, sessionConnections: pool.totalCount, sessionIdleConnections: pool.idleCount, sessionWaiting: pool.waitingCount })); }, 5000);
    metricsTimer.unref();
  }
  monitoring.sessionPool=()=>({total:pool.totalCount,idle:pool.idleCount,waiting:pool.waitingCount,max:5});
  pool.on('error', () => console.error('Session database connection unavailable'));
  const PgStore = connectPgSimple(session);
  const sessionMiddleware = session({ name: 'sa.sid', secret: config.SESSION_SECRET, store: new PgStore({ pool, tableName: 'session', createTableIfMissing: false, pruneSessionInterval: 900 }), resave: false, saveUninitialized: false, rolling: true, cookie: { httpOnly: true, secure: config.NODE_ENV === 'production', sameSite: 'lax', maxAge: 8 * 3600000, path: '/' } });
  app.use(sessionMiddleware);
  app.useWebSocketAdapter(new SessionIoAdapter(app, sessionMiddleware));
  const realtime = app.get(RealtimeGateway);
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!['GET','HEAD','OPTIONS'].includes(req.method)) res.once('finish', () => {
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      const match = /^\/api\/v1\/schools\/([0-9a-f-]{36})(?:\/|$)/i.exec(req.path);
      if (match || /^\/api\/v1\/(?:platform(?:\/|$)|schools$|contact$|invitations\/accept$)/.test(req.path)) {
        void realtime.platformChanged().catch(() => console.error('Platform update notification failed'));
      }
      if (!match) return;
      const academicCommand = req.path.endsWith('/academics/commands');
      const action = academicCommand ? req.body?.action : undefined;
      const change: SchoolChange = academicCommand && !['class','delete-class','copy-classes','class-teacher'].includes(action)
        ? { area: 'academic', yearId: req.body?.yearId }
        : { area: 'school' };
      void realtime.changed(match[1], change).catch(() => console.error('School update notification failed'));
    });
    next();
  });
  app.useGlobalFilters(new SafeErrors()); app.enableShutdownHooks();
  await app.listen(config.PORT, '0.0.0.0');
}
main().catch(() => { console.error('Backend startup failed. Check configuration, migrations and database availability.'); process.exit(1); });
