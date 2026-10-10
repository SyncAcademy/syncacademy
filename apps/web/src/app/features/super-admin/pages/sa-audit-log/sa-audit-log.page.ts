import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SuperAdminStore } from '../../super-admin.store';

@Component({ selector: 'app-sa-audit-log', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './sa-audit-log.page.html', styleUrls: ['./sa-audit-log.page.scss', '../../sa-workflows.scss'] })
export class SaAuditLogPage {
  readonly store = inject(SuperAdminStore);
  readonly search = this.store.auditSearch;
  readonly actorFilter = this.store.auditActor;
  readonly actionFilter = this.store.auditAction;
  readonly from = this.store.auditFrom;
  readonly to = this.store.auditTo;
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.store.auditTotal() / 25)));
  readonly filtered = computed(() => this.store.auditLog());
  readonly error = signal('');
  readonly exporting = signal(false);
  private timer?: ReturnType<typeof setTimeout>;
  filter(value: string, kind: 'search' | 'actor' | 'action' | 'from' | 'to') {
    ({search:this.search,actor:this.actorFilter,action:this.actionFilter,from:this.from,to:this.to})[kind].set(value);
    this.store.auditPage.set(1); clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.load(), ['search','actor','action'].includes(kind) ? 250 : 0);
  }
  async load() { try { await this.store.loadAudit(); this.error.set(''); } catch (e) { this.error.set(this.store.auth.error(e)); } }
  async page(change: number) { this.store.auditPage.update(page => Math.max(1, page + change)); await this.load(); }
  async exportCsv() {
    if (this.exporting()) return;
    this.exporting.set(true); this.error.set('');
    try {
      const params = new URLSearchParams(Object.entries({page:'1',pageSize:'100',q:this.search(),actor:this.actorFilter(),action:this.actionFilter(),from:this.from(),to:this.to()}).filter(([,value])=>value));
      const all: any[] = [];
      for (let page = 1; ; page++) {
        params.set('page', String(page));
        const result = await this.store.auth.request('GET', 'audit?' + params);
        all.push(...result.items);
        if (all.length >= result.total) break;
      }
      const cell = (value: string) => '"' + (/^[=+@\-\t\r]/.test(value) ? "'" + value : value).replace(/"/g, '""') + '"';
      const rows = [['Action','Actor','Target','Timestamp'], ...all.map(entry => [entry.action,entry.actor?.name || entry.actorId || 'System',entry.target,new Date(entry.createdAt).toISOString()])];
      const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n')], {type:'text/csv;charset=utf-8'}));
      const link = document.createElement('a'); link.href = url; link.download = 'platform-audit.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { this.error.set(this.store.auth.error(e)); }
    finally { this.exporting.set(false); }
  }
}
