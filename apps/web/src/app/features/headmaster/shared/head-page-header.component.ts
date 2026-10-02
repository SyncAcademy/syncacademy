import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-head-page-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="hph">
      <div class="hph__text">
        <h2 class="hph__title">{{ title }}</h2>
        <p class="hph__desc" *ngIf="description">{{ description }}</p>
      </div>
      <div class="hph__actions">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    @use 'variables' as *;
    .hph {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 16px; margin-bottom: 24px; flex-wrap: wrap;
    }
    .hph__title { margin: 0; font-size: 1.5rem; font-weight: 700; color: $text-primary; }
    .hph__desc { margin: 4px 0 0; font-size: 0.875rem; color: $text-secondary; }
    .hph__actions { display: flex; gap: 12px; flex-shrink: 0; flex-wrap: wrap; }
  `],
})
export class HeadPageHeaderComponent {
  @Input() title = '';
  @Input() description = '';
}
