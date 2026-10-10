import { DialogFocusDirective } from '../../../shared/directives/dialog-focus.directive';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, DialogFocusDirective],
  template: `
    <dialog class="overlay" appDialogFocus *ngIf="open" aria-labelledby="confirmation-title" aria-describedby="confirmation-message" (click)="onCancel()" (keydown.escape)="onCancel()" role="dialog" aria-modal="true">
      <div class="dialog" (click)="$event.stopPropagation()">
        <h3 class="dialog__title" id="confirmation-title">{{ title }}</h3>
        <p class="dialog__message" id="confirmation-message">{{ message }}</p>
        <div class="dialog__actions">
          <button class="dialog__btn dialog__btn--cancel" (click)="onCancel()">Cancel</button>
          <button class="dialog__btn" [class.dialog__btn--danger]="variant === 'danger'" [class.dialog__btn--primary]="variant === 'primary'" (click)="onConfirm()">
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </dialog>
  `,
  styles: [`
    @use 'variables' as *;
    .overlay {
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center;
      padding: 16px; animation: fadeIn 0.15s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .dialog {
      background: #fff; border-radius: $radius-lg; padding: 24px;
      max-width: 440px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.15);
    }
    .dialog__title { margin: 0 0 8px; font-size: 1.125rem; font-weight: 600; color: $text-primary; }
    .dialog__message { margin: 0 0 24px; font-size: 0.875rem; color: $text-secondary; line-height: 1.5; }
    .dialog__actions { display: flex; gap: 12px; justify-content: flex-end; }
    .dialog__btn {
      padding: 10px 20px; border: none; border-radius: $radius-md;
      font-family: $font-family; font-size: 0.875rem; font-weight: 600; cursor: pointer;
      transition: background 0.2s;
    }
    .dialog__btn--cancel { background: #F3F4F6; color: $text-primary; &:hover { background: #E5E7EB; } }
    .dialog__btn--danger { background: #EF4444; color: #fff; &:hover { background: #DC2626; } }
    .dialog__btn--primary { background: $primary-orange; color: #fff; &:hover { background: $primary-orange-hover; } }
  `],
})
export class ConfirmDialogComponent {
  @Input() open = false;
  @Input() title = 'Confirm action';
  @Input() message = '';
  @Input() confirmLabel = 'Confirm';
  @Input() variant: 'danger' | 'primary' = 'danger';
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  onConfirm(): void { this.confirmed.emit(); }
  onCancel(): void { this.cancelled.emit(); }
}
