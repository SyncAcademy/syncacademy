import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
export interface HealthSeries { key: string; label: string; color: string; unit?: string; }
interface PlotPoint { index: number; x: number; y: number; }

@Component({
    selector: 'app-health-chart', standalone: true, imports: [CommonModule],
    templateUrl: './health-chart.component.html', styleUrls: ['./health-chart.component.scss'],
})
export class HealthChartComponent {
    @Input() title = '';
    private readonly values = signal<any[]>([]);
    private readonly definitions = signal<HealthSeries[]>([]);
    private readonly interval = signal(30);
    @Input() set points(value: any[]) { this.values.set(value ?? []); }
    get points() { return this.values(); }
    @Input() set series(value: HealthSeries[]) { this.definitions.set(value ?? []); }
    get series() { return this.definitions(); }
    @Input() set bucketSeconds(value: number) { this.interval.set(value || 30); }
    readonly hidden = signal<string[]>([]);
    private readonly inspectedAt = signal<number | null>(null);
    readonly apiChart = computed(() => this.definitions().some(s => ['latency', 'p95', 'errors'].includes(s.key)));
    readonly unit = computed(() => this.definitions()[0]?.unit ?? '');
    readonly selected = computed(() => {
        const rows = this.values(), target = this.inspectedAt();
        if (!rows.length) return -1;
        if (target !== null) return rows.reduce((best, row, i) => Math.abs(Date.parse(row.at) - target) < Math.abs(Date.parse(rows[best].at) - target) ? i : best, 0);
        for (let i = rows.length - 1; i >= 0; i--) if (!this.missing(rows[i])) return i;
        return rows.length - 1;
    });
    readonly maxValue = computed(() => {
        const values = this.values().flatMap(row => this.definitions().filter(s => !this.hidden().includes(s.key)).map(s => row[s.key])).filter(this.finite);
        const maximum = Math.max(0, ...values);
        const step = Math.pow(10, Math.floor(Math.log10(maximum || 1)));
        // A non-zero scale keeps zero-valued series visible and measurable.
        return maximum ? Math.ceil(maximum / step) * step : 1;
    });
    readonly ticks = computed(() => [0, .5, 1].map(part => ({ value: this.maxValue() * part, y: 156 - part * 136 })));
    readonly plots = computed(() => this.definitions().filter(s => !this.hidden().includes(s.key)).map(series => {
        let open = false, path = '';
        const markers: PlotPoint[] = [];
        this.values().forEach((row, index) => {
            if (this.missing(row) || !this.finite(row[series.key])) { open = false; return; }
            if (index && Date.parse(row.at) - Date.parse(this.values()[index - 1].at) > this.interval() * 1500) open = false;
            const x = this.x(index), y = 156 - Math.max(0, row[series.key]) / this.maxValue() * 136;
            path += `${open ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)} `;
            markers.push({ index, x, y }); open = true;
        });
        return { ...series, path, markers };
    }));
    readonly bands = computed(() => {
        const rows = this.values(), result: { x: number; width: number; state: string }[] = [];
        for (let i = 0; i < rows.length; i++) {
            const state = this.missing(rows[i]) ? 'missing' : this.apiChart() && rows[i].requests === 0 ? 'idle' : '';
            if (!state) continue;
            const start = i;
            while (i + 1 < rows.length && (this.missing(rows[i + 1]) ? 'missing' : this.apiChart() && rows[i + 1].requests === 0 ? 'idle' : '') === state) i++;
            const left = start ? (this.x(start - 1) + this.x(start)) / 2 : 58;
            const right = i + 1 < rows.length ? (this.x(i) + this.x(i + 1)) / 2 : 628;
            result.push({ x: left, width: right - left, state });
        }
        return result;
    });
    readonly hasValues = computed(() => this.values().some(row => !this.missing(row) && this.definitions().some(s => this.finite(row[s.key]))));
    readonly idleCount = computed(() => this.apiChart() ? this.values().filter(row => !this.missing(row) && row.requests === 0).length : 0);
    readonly missingCount = computed(() => this.values().filter(row => this.missing(row)).length);
    readonly observations = computed(() => this.values().filter(row => !this.missing(row)).length);
    readonly selectionState = computed(() => {
        const row = this.values()[this.selected()];
        return !row || this.missing(row) ? 'missing' : this.apiChart() && row.requests === 0 ? 'idle' : 'measured';
    });
    private finite(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
    private missing(row: any) { return row?.observations === 0 || row?.requestState === 'missing'; }
    x(index: number) {
        const rows = this.values();
        if (rows.length === 1) return 343;
        const first = Date.parse(rows[0]?.at), last = Date.parse(rows.at(-1)?.at);
        return 58 + (Date.parse(rows[index]?.at) - first) / Math.max(1, last - first) * 570;
    }
    toggle(key: string) { this.hidden.update(keys => keys.includes(key) ? keys.filter(k => k !== key) : [...keys, key]); }
    tickLabel(value: number) { return new Intl.NumberFormat('en', { maximumFractionDigits: 2, notation: value >= 10000 ? 'compact' : 'standard' }).format(value); }
    move(delta: number, event: Event) { event.preventDefault(); const i = Math.max(0, Math.min(this.values().length - 1, this.selected() + delta)); if (this.values()[i]) this.inspectedAt.set(Date.parse(this.values()[i].at)); }
    hover(event: PointerEvent) {
        const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
        const target = (event.clientX - rect.left) / rect.width * 640;
        const rows = this.values(); if (!rows.length) return;
        const index = rows.reduce((best, _, i) => Math.abs(this.x(i) - target) < Math.abs(this.x(best) - target) ? i : best, 0);
        this.inspectedAt.set(Date.parse(rows[index].at));
    }
}
