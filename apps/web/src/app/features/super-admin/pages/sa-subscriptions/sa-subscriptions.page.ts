import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { SaEditorComponent, EditorField } from '../../components/sa-editor.component';
import { SuperAdminStore, PlatformSubscription } from '../../super-admin.store';

@Component({
  selector: 'app-sa-subscriptions',
  standalone: true,
  imports: [CommonModule, FormsModule, SaEditorComponent],
  templateUrl: './sa-subscriptions.page.html',
  styleUrls: ['./sa-subscriptions.page.scss', '../../sa-workflows.scss'],
})
export class SaSubscriptionsPage {
  store = inject(SuperAdminStore);
  readonly money = this.store.money.bind(this.store);

  statusFilter = signal(inject(ActivatedRoute).snapshot.queryParamMap.get('status') || '');
  planFilter = signal('');
  search = signal(inject(ActivatedRoute).snapshot.queryParamMap.get('q') || '');

  readonly filtered = computed(() => {
    let subs = this.store.subscriptions();
    if (this.statusFilter()) subs = subs.filter(s => s.status === this.statusFilter());
    if (this.planFilter()) subs = subs.filter(s => s.plan === this.planFilter());
    const q = this.search().toLowerCase();
    if (q) subs = subs.filter(s => s.schoolName.toLowerCase().includes(q));
    return subs;
  });

  readonly totalActive = computed(() => this.filtered().filter(s => s.status === 'active').length);
  readonly totalTrial = computed(() => this.filtered().filter(s => s.status === 'trial').length);
  readonly filteredMRR = computed(() => {
    return this.filtered().filter(s => s.status === 'active').reduce((sum, s) => {
      return sum + (s.billingCycle === 'annual' ? s.amount / 12 : s.amount);
    }, 0);
  });

  invoices = computed(() => { const ids = new Set(this.filtered().map(s => s.schoolId)); return this.store.invoices().filter(i => ids.has(i.schoolId)).sort((a,b) => +new Date(b.dueDate) - +new Date(a.dueDate)); });
  editor: Record<string, any> | null = null;
  editingId = '';
  fields: EditorField[] = [{ key: 'plan', label: 'Plan', options: ['starter', 'professional', 'enterprise'] }, { key: 'billingCycle', label: 'Billing cycle', options: ['monthly', 'annual'] }];
  edit(sub: PlatformSubscription): void { this.editingId = sub.id; this.editor = { ...sub }; }
  save(values: Record<string, any>): void { this.store.saveSubscription(this.editingId, values['plan'], values['billingCycle']); this.editor = null; }
  constructor() {
    inject(ActivatedRoute).queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
      this.search.set(params.get('q') || '');
      this.statusFilter.set(params.get('status') || '');
      this.planFilter.set('');

      this.statusFilter.set(params.get('status') || '');
    });
  }
}
