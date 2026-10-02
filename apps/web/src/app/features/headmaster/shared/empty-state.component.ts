import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="empty">
      <svg *ngIf="icon === 'folder'" class="empty__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
      <svg *ngIf="icon === 'users'" class="empty__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
      <svg *ngIf="icon === 'file'" class="empty__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      <svg *ngIf="icon === 'search'" class="empty__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <h3 class="empty__title">{{ title }}</h3>
      <p class="empty__desc">{{ description }}</p>
      <div class="empty__action"><ng-content></ng-content></div>
    </div>
  `,
  styles: [`
    @use 'variables' as *;
    .empty {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 48px 24px; text-align: center;
    }
    .empty__icon { width: 48px; height: 48px; color: #596579; margin-bottom: 16px; }
    .empty__title { margin: 0 0 8px; font-size: 1.125rem; font-weight: 600; color: $text-primary; }
    .empty__desc { margin: 0; font-size: 0.875rem; color: $text-secondary; max-width: 400px; }
    .empty__action { margin-top: 20px; }
  `],
})
export class EmptyStateComponent {
  @Input() icon: 'folder' | 'users' | 'file' | 'search' = 'folder';
  @Input() title = 'No data yet';
  @Input() description = '';
}
