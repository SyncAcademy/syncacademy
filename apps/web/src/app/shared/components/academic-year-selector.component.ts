import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AcademicYearService, YearViewer } from '../../core/services/academic-year.service';

@Component({
  selector: 'app-academic-year-selector', standalone: true,
  imports: [FormsModule],
  template: `
    <div class="year-controls">
      <label [for]="viewer() + '-academic-year'">Academic year</label>
      <select [id]="viewer() + '-academic-year'" [ngModel]="pending()" (ngModelChange)="pending.set($event)" [disabled]="!available().length">
        @for (year of available(); track year.id) {
          <option [value]="year.id">{{ year.label }} · {{ year.status === 'active' ? 'Current' : year.status === 'closed' ? 'Closed' : 'Draft' }}</option>
        }
      </select>
      <button type="button" (click)="apply()" [disabled]="!pending() || pending() === selected()?.id">Apply</button>
    </div>

  `,
  styles: [`
    :host { display:block; min-width:0; font-size:12px; }
    .year-controls { display:flex; align-items:center; gap:8px; flex-wrap:nowrap; }
    label { font-weight:600; color:#475569; }
    select, button { min-height:36px; border-radius:8px; font:inherit; font-size:13px; }
    select { border:1px solid #cbd5e1; background:white; color:#0f172a; padding:6px 8px; max-width:190px; }
    button { border:0; background:#2563eb; color:white; padding:6px 14px; cursor:pointer; font-weight:600; }
    button:disabled { background:#e2e8f0; color:#64748b; cursor:default; }
    select:focus-visible, button:focus-visible { outline:2px solid #2563eb; outline-offset:2px; }
    @media(max-width:900px) {
      label { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip-path:inset(50%); white-space:nowrap; }
    }
    @media(max-width:600px) {
      .year-controls { gap:6px; }
      select { width:112px; padding:6px 4px; }
      button { padding:6px 8px; }
    }
  `],
})
export class AcademicYearSelectorComponent {
  readonly viewer = input.required<YearViewer>();
  readonly context = inject(AcademicYearService);
  private readonly router = inject(Router);
  readonly selected = computed(() => this.context.selected(this.viewer()));
  readonly available = computed(() => this.context.available(this.viewer()));
  readonly pending = signal('');
  constructor() { effect(() => this.pending.set(this.selected()?.id ?? '')); }
  apply(): void {
    this.context.select(this.viewer(), this.pending());
    // Assignment detail pages belong to a single year. Return to the list on switching.
    if (this.viewer() === 'teacher' && /\/teacher\/[^/]+\/(marks|roster|status)/.test(this.router.url)) {
      void this.router.navigateByUrl('/teacher');
    }
  }
}
