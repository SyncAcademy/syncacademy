import { Injectable, OnModuleInit, OnModuleDestroy, NotFoundException } from '@nestjs/common';
import { hostname } from 'node:os';
import { randomUUID } from 'node:crypto';
import { statfs } from 'node:fs/promises';
import { getHeapStatistics } from 'node:v8';
import { Pool } from 'pg';
import { Database } from '../database/database.service';
import { config } from '../config';
import { Metrics, Aggregate, empty, add, summarize } from './metrics';
import { defaults, Settings, severity, overall, ranges } from './settings';
@Injectable()
export class MonitoringService implements OnModuleInit, OnModuleDestroy {
    readonly instance = (config.MONITOR_INSTANCE_ID || hostname()).slice(0, 80);
    private pool = new Pool({ connectionString: config.DATABASE_URL, max: 1, connectionTimeoutMillis: 2000, query_timeout: 2500, statement_timeout: 2000, application_name: 'syncacademy-monitor' });
    private timer?: NodeJS.Timeout;
    private running = false;
    private stopped = false;
    private cycles = 0;
    private previousEvents = 0;
    private previousDatabaseFailures = 0;
    private previousSocketFailures = 0;
    private previousSocketConnections = 0;
    private previousProcessingFailures = 0;
    private cpu = process.cpuUsage();
    private started = performance.now();
    private windowStarted = Date.now();
    private streaks = new Map<string, {
        bad: number;
        good: number;
    }>();
    private readCache = new Map<string, {
        until: number;
        value: unknown;
    }>();
    private readPending = new Map<string, Promise<any>>();
    private pendingAlerts = new Map<string, {
        severity: string;
        name: string;
        detail: string;
        detectedAt: Date;
    }>();
    settings: Settings = { ...defaults };
    current: any = null;
    constructor(private readonly db: Database, readonly metrics: Metrics) { this.pool.on('error', () => { }); }
    onModuleInit() { this.timer = setInterval(() => void this.collect(), 30000); this.timer.unref(); void this.collect(); }
    async onModuleDestroy() { this.stopped = true; clearInterval(this.timer); await this.pool.end(); }
    async collect() {
        if (this.running || this.stopped)
            return;
        this.running = true;
        const at = new Date(), duration = Math.max(1, (Date.now() - this.windowStarted) / 1000);
        this.windowStarted = Date.now();
        const requests = this.metrics.drain();
        const aggregate = empty();
        for (const a of requests.values())
            add(aggregate, a);
        try {
            const elapsed = performance.now() - this.started, diff = process.cpuUsage(this.cpu);
            this.cpu = process.cpuUsage();
            this.started = performance.now();
            const memory = process.memoryUsage(), heapLimit = getHeapStatistics().heap_size_limit;
            let diskPercent: number | null = null;
            try {
                const fs = await statfs(process.cwd());
                diskPercent = fs.blocks ? 100 * (fs.blocks - fs.bavail) / fs.blocks : null;
            }
            catch { }
            const runtime = { uptimeSeconds: process.uptime(), cpuPercent: elapsed > 0 ? (diff.user + diff.system) / (elapsed * 10) : null, rssBytes: memory.rss, heapUsedBytes: memory.heapUsed, heapLimitBytes: heapLimit, memoryPercent: 100 * memory.heapUsed / heapLimit, diskPercent, version: process.env.npm_package_version || '0.1.0', environment: config.NODE_ENV, hostCpu: null, containerMemory: null };
            const database: any = { connected: false, latencyMs: null, connections: null, maxConnections: null, active: null, slowQueries: null, longTransactions: null, bytes: null, rollbacks: null, statsScope: 'Visible sessions only; aggregate connection count covers this database', applicationPool: null, failedOperations: this.db.operationFailures, intervalFailures: this.db.operationFailures - this.previousDatabaseFailures };
            this.previousDatabaseFailures = this.db.operationFailures;
            const start = performance.now();
            try {
                await this.pool.query('SELECT 1');
                database.connected = true;
                database.latencyMs = performance.now() - start;
                try {
                    const result = await this.pool.query(`SELECT (SELECT numbackends FROM pg_stat_database WHERE datname=current_database())::int AS connections, current_setting('max_connections')::int AS maximum, pg_database_size(current_database())::float8 AS bytes, (SELECT xact_rollback::float8 FROM pg_stat_database WHERE datname=current_database()) AS rollbacks, count(*) FILTER (WHERE state='active' AND pid<>pg_backend_pid())::int AS active, count(*) FILTER (WHERE state='active' AND pid<>pg_backend_pid() AND query_start < now()-interval '1 second')::int AS slow, count(*) FILTER (WHERE xact_start < now()-interval '60 seconds' AND pid<>pg_backend_pid())::int AS transactions FROM pg_stat_activity WHERE datname=current_database()`);
                    const r = result.rows[0];
                    Object.assign(database, { connections: r.connections, maxConnections: r.maximum, bytes: r.bytes, rollbacks: r.rollbacks, active: r.active, slowQueries: r.slow, longTransactions: r.transactions });
                }
                catch {
                    database.statisticsUnavailable = true;
                }
            }
            catch {
                database.connected = false;
            }
            let jobs: any = { available: false, workers: [], channels: null, pending: null, failed: null, sent: null, overdue: null };
            try {
                const [workers, counts] = await Promise.all([this.pool.query(`SELECT instance, at, data FROM "MonitorWorker" WHERE at>now()-interval '24 hours' ORDER BY at DESC LIMIT 100`), this.pool.query(`SELECT COALESCE(channel::text,'EMAIL') AS channel,count(*) FILTER (WHERE "sentAt" IS NULL AND "failedAt" IS NULL AND "cancelledAt" IS NULL)::int AS pending,count(*) FILTER (WHERE "failedAt" IS NOT NULL AND "cancelledAt" IS NULL)::int AS failed,count(*) FILTER (WHERE "sentAt" IS NOT NULL)::int AS sent,count(*) FILTER (WHERE "sentAt" IS NULL AND "failedAt" IS NULL AND "cancelledAt" IS NULL AND "availableAt"<now()-interval '5 minutes')::int AS overdue FROM "Outbox" GROUP BY 1`)]);
                const totals = counts.rows.reduce((sum, row) => ({ pending: sum.pending + row.pending, failed: sum.failed + row.failed, sent: sum.sent + row.sent, overdue: sum.overdue + row.overdue }), { pending: 0, failed: 0, sent: 0, overdue: 0 });
                jobs = { available: true, workers: workers.rows, channels: counts.rows, ...totals };
                const settings = await this.pool.query('SELECT data FROM "MonitorSetting" WHERE id=1');
                if (settings.rows[0])
                    this.settings = { ...defaults, ...settings.rows[0].data };
            }
            catch { }
            jobs.providers = [{ channel: 'EMAIL', mode: config.COMMUNICATION_MOCK_DISPATCH === 'true' || config.EMAIL_PROVIDER === 'mock' ? 'Mock' : config.EMAIL_PROVIDER === 'resend' && config.RESEND_API_KEY ? 'Resend' : 'SMTP' }, { channel: 'SMS', mode: config.COMMUNICATION_MOCK_DISPATCH === 'true' || !config.NEXTSMS_USERNAME ? 'Mock / not configured' : 'NextSMS' }, { channel: 'WHATSAPP', mode: config.COMMUNICATION_MOCK_DISPATCH === 'true' || !config.NEXTSMS_USERNAME ? 'Mock / not configured' : 'NextSMS' }];
            const api = { ...summarize(aggregate), requestsPerMinute: aggregate.count * 60 / duration, windowSeconds: duration };
            const ws = { ...this.metrics.sockets, eventsPerMinute: (this.metrics.sockets.events - this.previousEvents) * 60 / duration, intervalFailures: this.metrics.sockets.failures - this.previousSocketFailures, intervalConnections: this.metrics.sockets.connections - this.previousSocketConnections, intervalProcessingFailures: this.metrics.sockets.processingFailures - this.previousProcessingFailures, failureRate: (this.metrics.sockets.connections + this.metrics.sockets.failures) ? 100 * this.metrics.sockets.failures / (this.metrics.sockets.connections + this.metrics.sockets.failures) : null, reconnections: null, scope: 'Serving API process', transport: config.REALTIME_TRANSPORT };
            this.previousEvents = this.metrics.sockets.events;
            this.previousSocketFailures = this.metrics.sockets.failures;
            this.previousSocketConnections = this.metrics.sockets.connections;
            this.previousProcessingFailures = this.metrics.sockets.processingFailures;
            const liveWorkers = jobs.workers.filter((w: any) => Date.now() - new Date(w.at).getTime() < 90000);
            const s = this.settings;
            const services = [
                { id: 'api', name: 'Backend API', status: severity(api.p95Ms, s.latencyWarning, s.latencyCritical) === 'critical' || severity(api.errorRate, s.errorWarning, s.errorCritical) === 'critical' ? 'critical' : aggregate.count && (api.p95Ms! >= s.latencyWarning || api.errorRate! >= s.errorWarning) ? 'warning' : 'healthy', detail: 'Serving process responds; external reachability requires an independent probe.' },
                { id: 'database', name: 'PostgreSQL', status: !database.connected ? 'critical' : severity(database.latencyMs, s.latencyWarning, s.latencyCritical), detail: 'Dedicated, time-limited database probe; detailed statistics may require additional privileges.' },
                { id: 'websocket', name: 'WebSocket gateway', status: !ws.ready ? 'critical' : ws.intervalProcessingFailures > 0 || ws.intervalFailures >= 3 ? 'warning' : 'healthy', detail: 'Local gateway initialization and authenticated connection counters.' },
                { id: 'worker', name: 'Communication worker', status: !jobs.available ? 'unknown' : !liveWorkers.length ? 'critical' : jobs.overdue > 0 || jobs.failed > 0 ? 'warning' : 'healthy', detail: 'Worker heartbeat and actual email, SMS and WhatsApp outbox records. Provider acceptance is not confirmed delivery.' },
                { id: 'resources', name: 'Process resources', status: [severity(runtime.cpuPercent, s.cpuWarning, s.cpuCritical), severity(runtime.memoryPercent, s.memoryWarning, s.memoryCritical), severity(runtime.diskPercent, s.diskWarning, s.diskCritical)].includes('critical') ? 'critical' : [severity(runtime.cpuPercent, s.cpuWarning, s.cpuCritical), severity(runtime.memoryPercent, s.memoryWarning, s.memoryCritical), severity(runtime.diskPercent, s.diskWarning, s.diskCritical)].includes('warning') ? 'warning' : 'healthy', detail: 'CPU relative to one core; memory is V8 heap / heap limit; disk is the application filesystem.' },
            ];
            this.current = { at: at.toISOString(), instance: this.instance, runtime, database, api, websocket: ws, jobs, services, status: overall(services.map(x => x.status)), sessionPool: this.metrics.sessionPool?.() ?? null, persistenceAvailable: false };
            // Never block request processing on metrics persistence. Failed writes are not fabricated as observations.
            try {
                await this.pool.query('INSERT INTO "MonitorSample" (instance,at,data) VALUES ($1,$2,$3)', [this.instance, at, JSON.stringify(this.current)]);
                const bucket = new Date(Math.floor(at.getTime() / 300000) * 300000);
                for (const [route, data] of requests) {
                    const previous = await this.pool.query('SELECT data FROM "MonitorEndpoint" WHERE instance=$1 AND hour=$2 AND route=$3', [this.instance, bucket, route]);
                    const merged = add(previous.rows[0]?.data ?? empty(), data);
                    await this.pool.query('INSERT INTO "MonitorEndpoint" (instance,hour,route,data) VALUES ($1,$2,$3,$4) ON CONFLICT(instance,hour,route) DO UPDATE SET data=EXCLUDED.data', [this.instance, bucket, route, JSON.stringify(merged)]);
                }
                this.current.persistenceAvailable = true;
                if (++this.cycles % 120 === 1) {
                    const cutoff = new Date(Date.now() - s.retentionDays * 86400000);
                    await this.pool.query('DELETE FROM "MonitorSample" WHERE at<$1', [cutoff]);
                    await this.pool.query('DELETE FROM "MonitorEndpoint" WHERE hour<$1', [cutoff]);
                    await this.pool.query('DELETE FROM "MonitorAlert" WHERE "resolvedAt"<$1', [cutoff]);
                    await this.pool.query(`DELETE FROM "MonitorWorker" WHERE at<now()-interval '1 day'`);
                }
            }
            catch {
                this.current.persistenceAvailable = false;
            }
            for (const service of services) {
                try {
                    await this.observeAlert(service, database.connected);
                }
                catch { }
            }
        }
        catch { /* Isolated instrumentation must never interrupt school operations. */ }
        finally {
            this.running = false;
        }
    }
    private async observeAlert(service: {
        id: string;
        name: string;
        status: string;
        detail: string;
    }, available = true) {
        const streak = this.streaks.get(service.id) ?? { bad: 0, good: 0 };
        if (service.status === 'critical' || service.status === 'warning') {
            streak.bad++;
            streak.good = 0;
        }
        else if (service.status === 'healthy') {
            streak.good++;
            streak.bad = 0;
        }
        else {
            streak.good = 0;
            streak.bad = 0;
        }
        this.streaks.set(service.id, streak);
        if (streak.bad >= this.settings.consecutive && !this.pendingAlerts.has(service.id))
            this.pendingAlerts.set(service.id, { severity: service.status, name: service.name, detail: service.detail, detectedAt: new Date() });
        if (!available)
            return;
        const pending = this.pendingAlerts.get(service.id);
        if (pending) {
            await this.pool.query(`INSERT INTO "MonitorAlert" (id,instance,service,severity,title,description,"detectedAt") VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (instance,service) WHERE "resolvedAt" IS NULL DO UPDATE SET severity=EXCLUDED.severity,title=EXCLUDED.title`, [randomUUID(), this.instance, service.id, pending.severity, pending.name + ' needs attention', pending.detail, pending.detectedAt]);
            this.pendingAlerts.delete(service.id);
        }
        if (streak.good >= this.settings.consecutive)
            await this.pool.query('UPDATE "MonitorAlert" SET "resolvedAt"=now() WHERE instance=$1 AND service=$2 AND "resolvedAt" IS NULL', [this.instance, service.id]);
    }
    async summary() {
        if (!this.current)
            await this.collect();
        let instances: any[] = [];
        try {
            const r = await this.pool.query(`SELECT DISTINCT ON (instance) instance,at,data->'websocket'->>'active' AS connections FROM "MonitorSample" WHERE at>now()-interval '24 hours' ORDER BY instance,at DESC LIMIT 100`);
            instances = r.rows.map(r => ({ ...r, connections: Number(r.connections), stale: Date.now() - new Date(r.at).getTime() > 90000 }));
        }
        catch { }
        return { current: this.current, settings: this.settings, instances, observedConnections: instances.filter(x => !x.stale).reduce((n, x) => n + x.connections, 0), scope: 'Serving API instance. Connection total includes only recently observed instances; missing instances are not assumed healthy.' };
    }
    private cached<T>(key: string, load: () => Promise<T>): Promise<T> {
        const cached = this.readCache.get(key);
        if (cached && cached.until > Date.now())
            return Promise.resolve(cached.value as T);
        const pending = this.readPending.get(key);
        if (pending)
            return pending;
        const request = load().then(value => { this.readCache.set(key, { until: Date.now() + 30000, value }); return value; }).finally(() => this.readPending.delete(key));
        this.readPending.set(key, request);
        return request;
    }
    history(range: string) { return this.cached('history:' + range, () => this.readHistory(range)); }
    private async readHistory(range: string) {
        const seconds = ranges[range], from = new Date(Date.now() - seconds * 1000), bucket = Math.max(30, Math.ceil(seconds / 180 / 30) * 30);
        const result = await this.pool.query(`SELECT to_timestamp(floor(extract(epoch FROM at)/$3)*$3) AS at,count(*)::int AS observations,array_agg(DISTINCT data->>'status') AS statuses,avg((data->'runtime'->>'cpuPercent')::float8) AS cpu,avg((data->'runtime'->>'memoryPercent')::float8) AS memory,avg((data->'runtime'->>'diskPercent')::float8) AS disk,avg((data->'database'->>'latencyMs')::float8) AS database,avg((data->'database'->>'connections')::float8) AS connections,avg(100*(data->'database'->>'connections')::float8/NULLIF((data->'database'->>'maxConnections')::float8,0)) AS "connectionPercent",sum((data->'database'->>'intervalFailures')::float8) AS "databaseFailures",avg((data->'websocket'->>'active')::float8) AS sockets,max((data->'websocket'->>'failures')::float8) AS "socketFailures",sum((data->'api'->>'count')::float8) AS requests,sum((data->'api'->>'totalMs')::float8)/NULLIF(sum((data->'api'->>'count')::float8),0) AS latency,max((data->'api'->>'p95Ms')::float8) AS "p95",100*sum((data->'api'->>'serverErrors')::float8)/NULLIF(sum((data->'api'->>'count')::float8),0) AS errors,count(*) FILTER(WHERE data->>'status'='Operational')::int AS healthy FROM "MonitorSample" WHERE instance=$1 AND at>=$2 GROUP BY 1 ORDER BY 1`, [this.instance, from, bucket]);
        const observations = result.rows.reduce((n, r) => n + r.observations, 0), healthy = result.rows.reduce((n, r) => n + r.healthy, 0);
        return { points: result.rows, range, from, instance: this.instance, coveragePercent: Math.min(100, 100 * observations * 30 / seconds), observedAvailabilityPercent: observations ? 100 * healthy / observations : null, observations, externalAvailability: null, bucketSeconds: bucket, note: 'Availability describes collected observations only. Gaps and complete API outages require an independent uptime monitor. P95 chart shows the maximum interval histogram estimate.' };
    }
    endpoints(range: string) { return this.cached('endpoints:' + range, () => this.readEndpoints(range)); }
    private async readEndpoints(range: string) {
        const from = new Date(Math.floor((Date.now() - ranges[range] * 1000) / 300000) * 300000);
        const result = await this.pool.query(`SELECT route,sum((data->>'count')::float8) AS count,sum((data->>'totalMs')::float8) AS "totalMs",sum((data->>'clientErrors')::float8) AS "clientErrors",sum((data->>'serverErrors')::float8) AS "serverErrors",ARRAY[${Array.from({ length: 13 }, (_, i) => `sum((data->'histogram'->>${i})::float8)`).join(',')}] AS histogram FROM "MonitorEndpoint" WHERE instance=$1 AND hour>=$2 GROUP BY route ORDER BY count DESC LIMIT 256`, [this.instance, from]);
        return { from, bucketSeconds: 300, rows: result.rows.map(r => ({ route: r.route, ...summarize(r) })), note: 'Five-minute buckets; percentiles are histogram upper-bound estimates (last bucket includes durations over 120 seconds).' };
    }
    async alerts(range: string) { const r = await this.pool.query('SELECT * FROM "MonitorAlert" WHERE "resolvedAt" IS NULL OR "detectedAt">=$1 ORDER BY "resolvedAt" NULLS FIRST,"detectedAt" DESC LIMIT 200', [new Date(Date.now() - ranges[range] * 1000)]); return { rows: r.rows, limit: 200 }; }
    async acknowledge(id: string, actorId: string) {
        return this.db.$transaction(async (tx) => {
            const rows = await tx.$queryRaw<any[]> `UPDATE "MonitorAlert" SET "acknowledgedAt"=COALESCE("acknowledgedAt",now()),"actorId"=COALESCE("actorId",${actorId}::uuid) WHERE id=${id}::uuid RETURNING *`;
            if (!rows.length)
                throw new NotFoundException('Alert no longer available.');
            await tx.auditEvent.create({ data: { actorId, action: 'MONITOR_ALERT_ACKNOWLEDGED', target: id } });
            return rows[0];
        });
    }
    async saveSettings(settings: Settings, actorId: string) { await this.db.$transaction(async (tx) => { await tx.$executeRaw `INSERT INTO "MonitorSetting" (id,data) VALUES (1,${JSON.stringify(settings)}::jsonb) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data`; await tx.auditEvent.create({ data: { actorId, action: 'MONITOR_SETTINGS_UPDATED', target: 'monitoring' } }); }); this.settings = settings; return settings; }
}
