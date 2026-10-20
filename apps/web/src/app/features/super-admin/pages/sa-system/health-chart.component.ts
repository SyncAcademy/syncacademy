import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
export interface HealthSeries {
    key: string;
    label: string;
    color: string;
    unit?: string;
}
@Component({ selector: 'app-health-chart', standalone: true, imports: [CommonModule], template: `
 <div class="chart-heading"><h3>{{title}}</h3><span>{{points.length}} intervals</span></div>
 <div class="legend">@for(s of series;track s.key){<button type="button" [attr.aria-pressed]="!hidden().includes(s.key)" (click)="toggle(s.key)"><i [style.background]="s.color"></i>{{s.label}}</button>}</div>
 @if(points.length>1 && hasValues()){
 <svg viewBox="0 0 600 170" role="img" tabindex="0" [attr.aria-label]="title+'. Use left and right arrow keys to inspect observations.'" (keydown.arrowleft)="move(-1,$event)" (keydown.arrowright)="move(1,$event)" (pointermove)="hover($event)">
  @for(y of [20,70,120];track y){<line x1="12" [attr.y1]="y" x2="588" [attr.y2]="y" stroke="currentColor" opacity=".1"/>}
  @for(s of series;track s.key){@if(!hidden().includes(s.key)){<path [attr.d]="path(s.key)" fill="none" [attr.stroke]="s.color" stroke-width="2.5" stroke-linejoin="round"/>}}
  @if(points[selected()]){<line [attr.x1]="x(selected())" y1="10" [attr.x2]="x(selected())" y2="140" stroke="#94a3b8" stroke-dasharray="3 4"/>}
  <text x="12" y="164">{{points[0].at|date:'MMM d, HH:mm'}}</text><text x="588" y="164" text-anchor="end">{{points[points.length-1].at|date:'MMM d, HH:mm'}}</text>
 </svg>
 <div class="tooltip" aria-live="polite">@if(points[selected()];as point){<time>{{point.at|date:'medium'}}</time>@for(s of series;track s.key){@if(!hidden().includes(s.key)){<span><i [style.background]="s.color"></i>{{s.label}}: <b>{{point[s.key]===null || point[s.key]===undefined?'Unavailable':(point[s.key]|number:'1.0-2')}} {{s.unit}}</b></span>}}}</div>
 }@else{<div class="empty">{{points.length>1?'No measurements available for this metric in the selected range.':'Collecting observations. A trend appears after two monitoring intervals.'}}</div>}
 `, styles: [`:host{display:block;min-width:0}.chart-heading,.legend{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}h3{font-size:1rem;margin:0}.chart-heading>span{font-size:.72rem;color:#64748b}.legend{justify-content:flex-start;margin:16px 0 8px}.legend button{font:inherit;font-size:.75rem;background:transparent;border:0;padding:6px;cursor:pointer;color:inherit}.legend button[aria-pressed=false]{opacity:.4}i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}svg{display:block;width:100%;height:auto;min-height:140px;color:#64748b;touch-action:pan-y}svg:focus-visible{outline:2px solid #ea8b29;outline-offset:2px}text{fill:currentColor;font-size:11px}.tooltip{min-height:58px;display:flex;gap:8px 14px;flex-wrap:wrap;font-size:.75rem;color:#64748b}.tooltip time{width:100%}.tooltip b{color:var(--health-text,#172338)}.empty{padding:58px 16px;color:#64748b;text-align:center;background:var(--health-soft,#f8fafc);border-radius:10px;margin-top:16px}`] })
export class HealthChartComponent {
    @Input()
    title = '';
    @Input()
    points: any[] = [];
    @Input()
    series: HealthSeries[] = [];
    @Input()
    bucketSeconds = 30;
    readonly hidden = signal<string[]>([]);
    readonly selected = signal(0);
    hasValues() { return this.points.some(p => this.series.some(s => typeof p[s.key] === 'number')); }
    toggle(key: string) { this.hidden.update(keys => keys.includes(key) ? keys.filter(k => k !== key) : [...keys, key]); }
    x(i: number) { const first = Date.parse(this.points[0]?.at), last = Date.parse(this.points.at(-1)?.at); return 12 + (Date.parse(this.points[i]?.at) - first) / Math.max(1, last - first) * 576; }
    path(key: string) { const values = this.points.flatMap(p => this.series.filter(s => !this.hidden().includes(s.key)).map(s => p[s.key])).filter(v => typeof v === 'number'); const max = Math.max(1, ...values); let open = false; return this.points.map((p, i) => { if (typeof p[key] !== 'number') {
        open = false;
        return '';
    } if (i && Date.parse(p.at) - Date.parse(this.points[i - 1].at) > this.bucketSeconds * 1500)
        open = false; const command = open ? 'L' : 'M'; open = true; return `${command}${this.x(i).toFixed(1)},${(140 - Math.max(0, p[key]) / max * 125).toFixed(1)}`; }).join(' '); }
    move(delta: number, event: Event) { event.preventDefault(); this.selected.set(Math.max(0, Math.min(this.points.length - 1, this.selected() + delta))); }
    hover(event: PointerEvent) { const rect = (event.currentTarget as SVGElement).getBoundingClientRect(); const target = (event.clientX - rect.left) / rect.width * 600; let index = 0; for (let i = 1; i < this.points.length; i++)
        if (Math.abs(this.x(i) - target) < Math.abs(this.x(index) - target))
            index = i; this.selected.set(index); }
}
