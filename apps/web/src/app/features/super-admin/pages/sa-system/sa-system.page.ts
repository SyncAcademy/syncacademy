import { Component, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { LoadingSkeletonComponent } from '../../../../shared/loading-skeleton.component';
import { HealthChartComponent, HealthSeries } from './health-chart.component';
@Component({ selector: 'app-sa-system', standalone: true, imports: [CommonModule, FormsModule, LoadingSkeletonComponent, HealthChartComponent], templateUrl: './sa-system.page.html', styleUrls: ['./sa-system.page.scss'] })
export class SaSystemPage {
    readonly auth = inject(AuthService);
    private destroy = inject(DestroyRef);
    private stopped = false;
    private generation = 0;
    private timer?: ReturnType<typeof setInterval>;
    private lastHistory = 0;
    readonly summary = signal<any>(null);
    readonly history = signal<any>(null);
    readonly endpoints = signal<any[]>([]);
    readonly alerts = signal<any[]>([]);
    readonly errors = signal<Record<string, string>>({});
    readonly loading = signal(false);
    readonly updated = signal<Date | null>(null);
    readonly now = signal(Date.now());
    readonly range = signal('1h');
    readonly auto = signal(true);
    readonly selectedService = signal('database');
    readonly query = signal('');
    readonly method = signal('all');
    readonly category = signal('all');
    readonly sort = signal('count');
    readonly descending = signal(true);
    readonly page = signal(1);
    readonly alertFilter = signal('active');
    readonly alertSeverity = signal('all');
    readonly busy = signal('');
    readonly settingsOpen = signal(false);
    readonly notice = signal('');
    settings: Record<string, number> = {};
    readonly current = computed(() => this.summary()?.current);
    readonly stale = computed(() => !this.current() || this.now() - Date.parse(this.current().at) > 90000 || !!this.errors()['summary']);
    readonly filtered = computed(() => this.endpoints().filter(r => (r.route.toLowerCase().includes(this.query().toLowerCase())) && (this.method() === 'all' || r.route.startsWith(this.method() + ' ')) && (this.category() === 'all' || (this.category() === '5xx' ? r.serverErrors > 0 : this.category() === '4xx' ? r.clientErrors > 0 : !r.serverErrors && !r.clientErrors))).sort((a, b) => { const key = this.sort(), v = key === 'route' ? a.route.localeCompare(b.route) : (a[key] ?? -1) - (b[key] ?? -1); return this.descending() ? -v : v; }));
    readonly pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / 10)));
    readonly rows = computed(() => this.filtered().slice((Math.min(this.page(), this.pages()) - 1) * 10, Math.min(this.page(), this.pages()) * 10));
    readonly visibleAlerts = computed(() => this.alerts().filter(a => (this.alertFilter() === 'all' || (this.alertFilter() === 'active' ? !a.resolvedAt : !!a.resolvedAt)) && (this.alertSeverity() === 'all' || a.severity === this.alertSeverity())));
    readonly activeAlerts = computed(() => this.alerts().filter(a => !a.resolvedAt).length);
    readonly fields = [['cpuWarning', 'CPU warning (%)'], ['cpuCritical', 'CPU critical (%)'], ['memoryWarning', 'Heap warning (%)'], ['memoryCritical', 'Heap critical (%)'], ['diskWarning', 'Disk warning (%)'], ['diskCritical', 'Disk critical (%)'], ['latencyWarning', 'Latency warning (ms)'], ['latencyCritical', 'Latency critical (ms)'], ['errorWarning', '5xx warning (%)'], ['errorCritical', '5xx critical (%)'], ['consecutive', 'Consecutive checks (2-10)'], ['refreshSeconds', 'Refresh interval (30-300 seconds)'], ['retentionDays', 'History retention (1-31 days)']];
    readonly charts: {
        title: string;
        series: HealthSeries[];
    }[] = [
        { title: 'API response time', series: [{ key: 'latency', label: 'Average', color: '#e68125', unit: 'ms' }, { key: 'p95', label: 'P95 interval maximum', color: '#2563eb', unit: 'ms' }] },
        { title: 'API traffic', series: [{ key: 'requests', label: 'Requests per interval', color: '#2563eb' }] },
        { title: 'API server errors', series: [{ key: 'errors', label: 'HTTP 5xx rate', color: '#dc5163', unit: '%' }] },
        { title: 'Process resource utilization', series: [{ key: 'cpu', label: 'CPU / one core', color: '#e68125', unit: '%' }, { key: 'memory', label: 'V8 heap / limit', color: '#2563eb', unit: '%' }, { key: 'disk', label: 'App filesystem used', color: '#8b5cf6', unit: '%' }] },
        { title: 'Database query latency', series: [{ key: 'database', label: 'Probe latency', color: '#0d9488', unit: 'ms' }] },
        { title: 'Database connections', series: [{ key: 'connections', label: 'Open connections', color: '#8b5cf6' }] },
        { title: 'Database connection capacity', series: [{ key: 'connectionPercent', label: 'This database / server limit', color: '#8b5cf6', unit: '%' }] },
        { title: 'Database operation failures', series: [{ key: 'databaseFailures', label: 'Application errors per interval', color: '#dc5163' }] },
        { title: 'WebSocket connections', series: [{ key: 'sockets', label: 'Active clients', color: '#0d9488' }] },
        { title: 'WebSocket connection failures', series: [{ key: 'socketFailures', label: 'Failures since API start', color: '#dc5163' }] },
    ];
    constructor() { void this.refresh(true); const visibility = () => { if (!document.hidden && this.auto())
        void this.refresh(); }; document.addEventListener('visibilitychange', visibility); this.timer = setInterval(() => { this.now.set(Date.now()); if (!document.hidden && this.auto() && !this.loading() && (!this.updated() || Date.now() - this.updated()!.getTime() >= (this.summary()?.settings?.refreshSeconds ?? 30) * 1000))
        void this.refresh(); }, 5000); this.destroy.onDestroy(() => { this.stopped = true; this.generation++; clearInterval(this.timer); document.removeEventListener('visibilitychange', visibility); }); }
    async refresh(full = false) {
        if (this.loading())
            return;
        this.loading.set(true);
        const generation = ++this.generation, range = this.range();
        const tasks: Record<string, Promise<any>> = { summary: this.auth.request('GET', 'system-health'), alerts: this.auth.request('GET', `system-health/alerts?range=${range}`) };
        if (full || Date.now() - this.lastHistory > 120000) {
            tasks['history'] = this.auth.request('GET', `system-health/history?range=${range}`);
            tasks['endpoints'] = this.auth.request('GET', `system-health/endpoints?range=${range}`);
        }
        const entries = Object.entries(tasks), results = await Promise.allSettled(entries.map(([, task]) => task));
        if (this.stopped || generation !== this.generation)
            return;
        const errors = { ...this.errors() };
        results.forEach((result, index) => {
            const key = entries[index][0];
            if (result.status === 'rejected') {
                errors[key] = this.auth.error(result.reason);
                return;
            }
            delete errors[key];
            const value = result.value;
            if (key === 'summary') {
                this.summary.set(value);
                this.updated.set(new Date());
                if (!this.settingsOpen())
                    this.settings = { ...value.settings };
            }
            if (key === 'history') {
                this.history.set(value);
                this.lastHistory = Date.now();
            }
            if (key === 'endpoints')
                this.endpoints.set(value.rows);
            if (key === 'alerts')
                this.alerts.set(value.rows);
        });
        this.errors.set(errors);
        this.loading.set(false);
        this.now.set(Date.now());
    }
    changeRange(value: string) { if (this.loading())
        return; this.range.set(value); this.history.set(null); this.endpoints.set([]); this.alerts.set([]); this.page.set(1); void this.refresh(true); }
    sortBy(key: string) { if (this.sort() === key)
        this.descending.update(v => !v);
    else {
        this.sort.set(key);
        this.descending.set(key !== 'route');
    } this.page.set(1); }
    async acknowledge(id: string) { if (this.busy())
        return; this.busy.set(id); try {
        await this.auth.request('POST', `system-health/alerts/${id}/acknowledge`, {});
        this.notice.set('Alert acknowledged. It will resolve after verified recovery.');
        await this.refresh();
    }
    catch (e) {
        this.errors.update(v => ({ ...v, action: this.auth.error(e) }));
    }
    finally {
        this.busy.set('');
    } }
    async saveSettings() { if (this.busy())
        return; this.busy.set('settings'); try {
        this.settings = await this.auth.request('PATCH', 'system-health/settings', this.settings);
        this.settingsOpen.set(false);
        this.notice.set('Monitoring settings saved. Collectors apply changes on their next check.');
        await this.refresh();
    }
    catch (e) {
        this.errors.update(v => ({ ...v, action: this.auth.error(e) }));
    }
    finally {
        this.busy.set('');
    } }
    export(kind: 'endpoints' | 'alerts') {
        const rows = kind === 'endpoints' ? this.filtered().map(r => ({ endpoint: r.route, requests: r.count, average_ms: r.avgMs, p95_ms: r.p95Ms, error_percent: r.errorRate })) : this.visibleAlerts().map(a => ({ service: a.service, severity: a.severity, title: a.title, detected: a.detectedAt, acknowledged: a.acknowledgedAt, resolved: a.resolvedAt }));
        if (!rows.length)
            return;
        const keys = Object.keys(rows[0]);
        const cell = (v: unknown) => '"' + String(v ?? '').replace(/^[=+@-]/, "'").replace(/"/g, '""') + '"';
        const csv = [keys.join(','), ...rows.map(r => keys.map(k => cell((r as any)[k])).join(','))].join('\r\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `syncacademy-${kind}-${this.range()}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }
    queueFor(rows: any[] | null | undefined, channel: string) { if (!rows)
        return { pending: null, failed: null, sent: null }; return rows.find(row => row.channel === channel) ?? { pending: 0, failed: 0, sent: 0 }; }
    format(value: unknown, suffix = '') { return typeof value === 'number' && Number.isFinite(value) ? new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(value) + suffix : 'Unavailable'; }
    bytes(value: unknown) { return typeof value === 'number' ? this.format(value / 1048576, ' MB') : 'Unavailable'; }
    uptime(value: number) { if (!Number.isFinite(value))
        return 'Unavailable'; return Math.floor(value / 86400) + 'd ' + Math.floor(value % 86400 / 3600) + 'h ' + Math.floor(value % 3600 / 60) + 'm'; }
    alertCount(service: string) { return this.alerts().filter(a => a.service === service && !a.resolvedAt).length; }
    errorEntries() { return Object.entries(this.errors()); }
}
