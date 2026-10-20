import { Injectable } from '@nestjs/common';
export const bounds = [5, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000, 10000, 30000, 120000];
export type Aggregate = {
    count: number;
    totalMs: number;
    clientErrors: number;
    serverErrors: number;
    histogram: number[];
    maxMs?: number;
    samples?: number[];
};
export const empty = (): Aggregate => ({ count: 0, totalMs: 0, clientErrors: 0, serverErrors: 0, histogram: bounds.map(() => 0), maxMs: 0, samples: [] });
// Exact low-volume quantiles are computed from bounded, in-memory timings only.
// No individual request timings are written to monitoring storage.
export const exactSampleLimit = 512;
export function add(a: Aggregate, b: Aggregate) {
    const exact = a.samples?.length === a.count && b.samples?.length === b.count && a.count + b.count <= exactSampleLimit;
    a.samples = exact ? [...a.samples!, ...b.samples!] : undefined;
    a.maxMs = a.maxMs !== undefined && b.maxMs !== undefined ? Math.max(a.maxMs, b.maxMs) : undefined;
    a.count += b.count; a.totalMs += b.totalMs;
    a.clientErrors += b.clientErrors; a.serverErrors += b.serverErrors;
    b.histogram.forEach((n, i) => a.histogram[i] += n);
    return a;
}
export function durableAggregate(a: Aggregate) { const { samples, ...durable } = a; return durable; }
export function percentile(a: Aggregate, p: number) {
    if (!a.count) return null;
    if (a.samples?.length === a.count) {
        const values = [...a.samples].sort((x, y) => x - y);
        if (p === .5 && values.length % 2 === 0) return (values[values.length / 2 - 1] + values[values.length / 2]) / 2;
        return values[Math.ceil(a.count * p) - 1];
    }
    let n = 0;
    for (let i = 0; i < bounds.length; i++) {
        n += a.histogram[i];
        if (n >= Math.ceil(a.count * p)) return Math.min(i === bounds.length - 1 ? (a.maxMs ?? a.totalMs) : bounds[i], a.maxMs ?? Infinity, a.totalMs);
    }
    return a.maxMs ?? a.totalMs;
}
export function summarize(a: Aggregate) {
    return { ...durableAggregate(a), state: a.count ? 'measured' : 'idle',
        percentileMethod: !a.count ? null : a.samples?.length === a.count ? 'exact' : 'histogram-upper-bound',
        avgMs: a.count ? a.totalMs / a.count : null,
        p50Ms: percentile(a, .5), p95Ms: percentile(a, .95), p99Ms: percentile(a, .99),
        errorRate: a.count ? 100 * a.serverErrors / a.count : null,
        clientErrorRate: a.count ? 100 * a.clientErrors / a.count : null,
        successRate: a.count ? 100 * (a.count - a.clientErrors - a.serverErrors) / a.count : null,
    };
}
@Injectable()
export class Metrics {
    private endpoints = new Map<string, Aggregate>();
    readonly sockets = { ready: false, active: 0, connections: 0, disconnections: 0, failures: 0, events: 0, processingFailures: 0 };
    sessionPool: (() => {
        total: number;
        idle: number;
        waiting: number;
        max: number;
    }) | null = null;
    record(method: string, route: unknown, status: number, ms: number) {
        // Never retain URLs, query strings, request bodies or identity information.
        const path = typeof route === 'string' && route.startsWith('/api/v1/') ? route : 'unmatched';
        if (path.includes('/system-health') || path.includes('/health/'))
            return;
        const verb = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'].includes(method) ? method : 'OTHER';
        let key = verb + ' ' + path;
        if (!this.endpoints.has(key) && this.endpoints.size >= 255)
            key = 'OTHER overflow';
        const a = this.endpoints.get(key) ?? empty();
        const duration = Math.max(0, ms);
        if (a.samples && a.samples.length < exactSampleLimit) a.samples.push(duration);
        else a.samples = undefined;
        a.maxMs = Math.max(a.maxMs ?? 0, duration);
        a.count++;
        a.totalMs += Math.max(0, ms);
        if (status >= 500)
            a.serverErrors++;
        else if (status >= 400)
            a.clientErrors++;
        a.histogram[bounds.findIndex(b => ms <= b) === -1 ? bounds.length - 1 : bounds.findIndex(b => ms <= b)]++;
        this.endpoints.set(key, a);
    }
    drain() { const result = this.endpoints; this.endpoints = new Map(); return result; }
    restore(rows: Map<string, Aggregate>) { for (const [key, a] of rows) {
        const target = this.endpoints.has(key) || this.endpoints.size < 255 ? key : 'OTHER overflow';
        this.endpoints.set(target, add(this.endpoints.get(target) ?? empty(), a));
    } }
}
