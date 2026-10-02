import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeVariant = 'draft' | 'active' | 'closed' | 'pending' | 'approved' |
  'rejected' | 'inactive' | 'success' | 'warning' | 'error' | 'info' |
  'generated' | 'released' | 'sent' | 'delivered' | 'viewed' | 'failed' |
  'verified' | 'unverified' | 'used' | 'expired' | 'revoked';

const VARIANT_COLORS: Record<string, { bg: string; color: string }> = {
  active:    { bg: '#ECFDF5', color: '#065F46' },
  success:   { bg: '#ECFDF5', color: '#065F46' },
  approved:  { bg: '#ECFDF5', color: '#065F46' },
  verified:  { bg: '#ECFDF5', color: '#065F46' },
  delivered: { bg: '#ECFDF5', color: '#065F46' },
  viewed:    { bg: '#ECFDF5', color: '#065F46' },
  released:  { bg: '#DBEAFE', color: '#1E40AF' },
  sent:      { bg: '#DBEAFE', color: '#1E40AF' },
  info:      { bg: '#DBEAFE', color: '#1E40AF' },
  generated: { bg: '#DBEAFE', color: '#1E40AF' },
  used:      { bg: '#DBEAFE', color: '#1E40AF' },
  draft:     { bg: '#F3F4F6', color: '#374151' },
  pending:   { bg: '#FEF3C7', color: '#92400E' },
  warning:   { bg: '#FEF3C7', color: '#92400E' },
  unverified:{ bg: '#FEF3C7', color: '#92400E' },
  closed:    { bg: '#F3F4F6', color: '#6B7280' },
  inactive:  { bg: '#F3F4F6', color: '#6B7280' },
  expired:   { bg: '#F3F4F6', color: '#6B7280' },
  revoked:   { bg: '#F3F4F6', color: '#6B7280' },
  rejected:  { bg: '#FEE2E2', color: '#991B1B' },
  error:     { bg: '#FEE2E2', color: '#991B1B' },
  failed:    { bg: '#FEE2E2', color: '#991B1B' },
};

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="badge" [style.background]="bgColor" [style.color]="textColor">
      {{ label }}
    </span>
  `,
  styles: [`
    .badge {
      display: inline-block;
      font-size: 0.8125rem;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 12px;
      white-space: nowrap;
      text-transform: capitalize;
      line-height: 1.4;
    }
  `],
})
export class StatusBadgeComponent {
  @Input() variant: BadgeVariant = 'info';
  @Input() label = '';

  get bgColor(): string {
    return (VARIANT_COLORS[this.variant] ?? VARIANT_COLORS['info']).bg;
  }

  get textColor(): string {
    return (VARIANT_COLORS[this.variant] ?? VARIANT_COLORS['info']).color;
  }
}
