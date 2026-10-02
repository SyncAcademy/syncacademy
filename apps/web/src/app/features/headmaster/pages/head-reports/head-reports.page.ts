import { Component, computed, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { HeadPageHeaderComponent } from '../../shared/head-page-header.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';
import { DialogFocusDirective } from '../../../../shared/directives/dialog-focus.directive';
import { ReportDemoStore, DemoReport } from '../../report-demo.store';

@Component({
  selector: 'app-head-reports', standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HeadPageHeaderComponent, ConfirmDialogComponent, StatusBadgeComponent, DialogFocusDirective],
  templateUrl: './head-reports.page.html', styleUrls: ['./head-reports.page.scss'],
})
export class HeadReportsPage {
  store = inject(ReportDemoStore);
  private route = inject(ActivatedRoute);
  private data = toSignal(this.route.data);
  mode = computed(() => this.data()?.['mode'] || 'overview');
  title = computed(() => this.mode() === 'send' ? 'Send Reports' : this.mode() === 'delivery' ? 'Parent Delivery Center' : 'Reports Overview');
  search = signal('');
  classFilter = signal('all');
  period = signal('all');
  periods = computed(() => [...new Set(this.store.reports().map(r => r.period))]);
  constructor() { effect(() => { this.store.yearContext.headYear(); this.clearFilters(); this.action.set(null); this.previewId.set(null); }); }
  statusFilter = signal('all');
  selection = signal<string[]>([]);
  previewId = signal<string | null>(null);
  preview = computed(() => this.store.reports().find(r => r.id === this.previewId()));
  notice = signal('');
  action = signal<'approve' | 'send' | 'resend' | null>(null);
  actionIds = signal<string[]>([]);
  filtered = computed(() => this.store.reports().filter(r => (this.period() === 'all' || r.period === this.period()) &&
    (this.classFilter() === 'all' || r.className === this.classFilter()) &&
    (r.student + ' ' + r.studentNumber + ' ' + r.recipients.map(g => g.name).join(' ')).toLowerCase().includes(this.search().toLowerCase()) &&
    (this.statusFilter() === 'all' || (this.statusFilter() === 'blocked' ? this.blocked(r) : this.statusFilter() === 'failed' ? r.recipients.some(g => g.status === 'failed') : r.status === this.statusFilter()))));
  eligible = computed(() => this.filtered().filter(r => this.store.eligible(r)));
  selectedReports = computed(() => this.eligible().filter(r => this.selection().includes(r.id)));
  allSelected = computed(() => this.eligible().length > 0 && this.selectedReports().length === this.eligible().length);
  recipientCount = computed(() => this.selectedReports().reduce((sum,r) => sum + r.recipients.filter(g => g.verified && ['not_sent','failed'].includes(g.status)).length, 0));
  summary = computed(() => {
    const rows = this.filtered(); const recipients = rows.flatMap(r => r.recipients);
    return [
      { label: 'Student reports', value: rows.length },
      { label: 'Ready to send', value: rows.filter(r => this.store.eligible(r)).length },
      { label: 'Delivered messages', value: recipients.filter(g => ['delivered','viewed'].includes(g.status)).length },
      { label: 'Need attention', value: rows.filter(r => this.blocked(r) || r.recipients.some(g => g.status === 'failed')).length },
    ];
  });
  confirmation = computed(() => {
    if (this.action() === 'approve') return 'Approve this academically reviewed report for release in the frontend demo?';
    const recipients = this.store.reports().filter(r => this.actionIds().includes(r.id)).flatMap(r => r.recipients).filter(g => g.verified && (this.action() === 'resend' || ['not_sent','failed'].includes(g.status))).length;
    return `${this.action() === 'resend' ? 'Record a deliberate resend' : 'Record a send'} for ${recipients} verified guardian(s)? ${this.action() === 'resend' ? 'These guardians may already have received this report. ' : ''}This updates demo statuses only. No WhatsApp or SMS is sent.`;
  });
  blocked(r: DemoReport): boolean { return !r.academicApproved || !r.recipients.some(g => g.verified); }
  reason(r: DemoReport): string {
    if (!r.academicApproved) return 'Awaiting subject approval';
    if (!r.recipients.some(g => g.verified)) return 'Guardian verification needed';
    if (r.status === 'generated') return 'Ready for release approval';
    if (r.recipients.some(g => g.status === 'failed')) return 'Delivery failed ? retry available';
    return r.status === 'approved' ? 'Ready to send' : 'Release recorded';
  }
  changeScope(): void { this.selection.set([]); }
  toggle(id: string): void { this.selection.update(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids,id]); }
  selectAll(): void { this.selection.set(this.allSelected() ? [] : this.eligible().map(r => r.id)); }
  request(action: 'approve' | 'send' | 'resend', ids: string[]): void { if (this.store.readOnly() || !ids.length) return; this.action.set(action); this.actionIds.set(ids); }
  sendSelected(): void { this.request('send', this.selectedReports().map(r => r.id)); }
  confirmAction(): void {
    if (this.action() === 'approve') { this.store.approve(this.actionIds()[0]); this.notice.set('Report approved for release in this demo.'); }
    else { const count = this.store.send(this.actionIds(), this.action() === 'resend'); this.notice.set(`${count} guardian message(s) marked as sent in this demo. No external messages were sent.`); }
    this.action.set(null); this.selection.set([]);
  }
  clearFilters(): void { this.search.set(''); this.classFilter.set('all'); this.statusFilter.set('all'); this.period.set('all'); this.changeScope(); }
}
