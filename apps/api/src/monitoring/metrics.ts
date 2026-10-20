import { Injectable } from '@nestjs/common';
export const bounds = [5, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000, 10000, 30000, 120000];
export type Aggregate = {
    count: number;
    totalMs: number;
    clientErrors: number;
    serverErrors: number;
    histogram: number[];
};
export const empty = (): Aggregate => ({ count: 0, totalMs: 0, clientErrors: 0, serverErrors: 0, histogram: bounds.map(() => 0) });
export function add(a: Aggregate, b: Aggregate) { a.count += b.count; a.totalMs += b.totalMs; a.clientErrors += b.clientErrors; a.serverErrors += b.serverErrors; b.histogram.forEach((n, i) => a.histogram[i] += n); return a; }
export function percentile(a: Aggregate, p: number) { if (!a.count)
    return null; let n = 0; for (let i = 0; i < bounds.length; i++) {
    n += a.histogram[i];
    if (n >= Math.ceil(a.count * p))
        return bounds[i];
} return bounds.at(-1)!; }
export function summarize(a: Aggregate) { return { ...a, avgMs: a.count ? a.totalMs / a.count : null, p50Ms: percentile(a, .5), p95Ms: percentile(a, .95), p99Ms: percentile(a, .99), errorRate: a.count ? 100 * a.serverErrors / a.count : null, clientErrorRate: a.count ? 100 * a.clientErrors / a.count : null, successRate: a.count ? 100 * (a.count - a.clientErrors - a.serverErrors) / a.count : null }; }
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
