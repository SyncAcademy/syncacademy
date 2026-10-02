import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-teacher-page-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tph">
      <div class="tph__text">
        <h2 class="tph__title">{{ title }}</h2>
        <p class="tph__desc" *ngIf="description">{{ description }}</p>
      </div>
      <div class="tph__actions">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    @use 'variables' as *;
    .tph {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 16px; margin-bottom: 24px; flex-wrap: wrap;
    }
    .tph__title { margin: 0; font-size: 1.5rem; font-weight: 700; color: $text-primary; }
    .tph__desc { margin: 4px 0 0; font-size: 0.875rem; color: $text-secondary; }
    .tph__actions { display: flex; gap: 12px; flex-shrink: 0; flex-wrap: wrap; }
  `],
})
export class TeacherPageHeaderComponent {
  @Input() title = '';
  @Input() description = '';
}
