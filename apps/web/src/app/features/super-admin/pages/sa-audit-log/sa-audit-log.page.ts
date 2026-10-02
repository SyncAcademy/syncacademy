import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SuperAdminStore } from '../../super-admin.store';

@Component({
  selector: 'app-sa-audit-log',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sa-audit-log.page.html',
  styleUrls: ['./sa-audit-log.page.scss', '../../sa-workflows.scss'],
})
export class SaAuditLogPage {
  store = inject(SuperAdminStore);
  readonly timeSince = this.store.timeSince.bind(this.store);

  search = signal('');
  actionFilter = signal('');
  from = signal('');
  to = signal('');
  readonly actions = computed(() => [...new Set(this.store.auditLog().map(a => a.action))]);
  actorFilter = signal('');

  readonly actors = computed(() => {
    const all = this.store.auditLog().map(a => a.actor);
    return [...new Set(all)];
  });

  readonly filtered = computed(() => {
    let logs = this.store.recentActivity();
    const q = this.search().toLowerCase();
    if (q) logs = logs.filter(l => l.action.toLowerCase().includes(q) || l.target.toLowerCase().includes(q) || l.details.toLowerCase().includes(q));
    if (this.actorFilter()) logs = logs.filter(l => l.actor === this.actorFilter());
    if (this.actionFilter()) logs = logs.filter(l => l.action === this.actionFilter());
    if (this.from()) logs = logs.filter(l => this.store.dateInput(new Date(l.timestamp)) >= this.from());
    if (this.to()) logs = logs.filter(l => this.store.dateInput(new Date(l.timestamp)) <= this.to());
    return logs;
  });

  exportCsv(): void {
    const cell = (value: string) => '"' + (/^[=+@\-\t\r]/.test(value) ? "'" + value : value).replace(/"/g, '""') + '"';
    const rows = [['Action', 'Actor', 'Target', 'Details', 'IP', 'Timestamp'], ...this.filtered().map(l => [l.action, l.actor, l.target, l.details, l.ip, new Date(l.timestamp).toISOString()])];
    const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(r => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'platform-audit.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
