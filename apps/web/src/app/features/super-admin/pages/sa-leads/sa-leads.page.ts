import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { SaEditorComponent, EditorField } from '../../components/sa-editor.component';
import { SuperAdminStore, PlatformLead } from '../../super-admin.store';

@Component({
  selector: 'app-sa-leads',
  standalone: true,
  imports: [CommonModule, FormsModule, SaEditorComponent],
  templateUrl: './sa-leads.page.html',
  styleUrls: ['./sa-leads.page.scss', '../../sa-workflows.scss'],
})
export class SaLeadsPage {
  store = inject(SuperAdminStore);
  readonly timeSince = this.store.timeSince.bind(this.store);

  search = signal(inject(ActivatedRoute).snapshot.queryParamMap.get('q') || '');
  statusFilter = signal('');
  sourceFilter = signal('');

  readonly filtered = computed(() => {
    let leads = this.store.leads();
    const q = this.search().toLowerCase();
    if (q) leads = leads.filter(l => l.schoolName.toLowerCase().includes(q) || l.contactName.toLowerCase().includes(q));
    if (this.statusFilter()) leads = leads.filter(l => l.status === this.statusFilter());
    if (this.sourceFilter()) leads = leads.filter(l => l.source === this.sourceFilter());
    return leads;
  });

  readonly pipelineSummary = computed(() => {
    const leads = this.store.leads();
    const stages = [
      { key: 'new', label: 'New', count: 0 },
      { key: 'contacted', label: 'Contacted', count: 0 },
      { key: 'demo-scheduled', label: 'Demo Scheduled', count: 0 },
      { key: 'demo-done', label: 'Demo Done', count: 0 },
      { key: 'negotiation', label: 'Negotiation', count: 0 },
      { key: 'won', label: 'Won', count: 0 },
      { key: 'lost', label: 'Lost', count: 0 },
    ];
    for (const l of leads) {
      const stage = stages.find(s => s.key === l.status);
      if (stage) stage.count++;
    }
    return stages;
  });

  statusLabel(status: string): string {
    return status.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase());
  }

  editingId = '';
  editor: Record<string, any> | null = null;
  fields: EditorField[] = [
    { key: 'schoolName', label: 'School name', required: true }, { key: 'contactName', label: 'Contact name', required: true },
    { key: 'contactEmail', label: 'Email', type: 'email', required: true }, { key: 'contactPhone', label: 'Phone', type: 'tel' },
    { key: 'location', label: 'Region', required: true }, { key: 'studentCount', label: 'Estimated students', type: 'number', min: 0, required: true },
    { key: 'source', label: 'Source', options: ['website', 'referral', 'social', 'event', 'cold-outreach'] },
    { key: 'status', label: 'Stage', options: ['new', 'contacted', 'demo-scheduled', 'demo-done', 'negotiation', 'won', 'lost'] },
    { key: 'owner', label: 'Follow-up owner', required: true }, { key: 'followUp', label: 'Next follow-up', type: 'date' }, { key: 'notes', label: 'Notes' },
  ];
  openLead(lead?: PlatformLead): void { this.editingId = lead?.id || ''; this.editor = lead ? { ...lead } : { source: 'website', status: 'new', studentCount: 0, owner: 'Admin Juma', notes: '' }; }
  save(values: Record<string, any>): void { this.store.saveLead(values, this.editingId || undefined); this.editor = null; }
  constructor() {
    inject(ActivatedRoute).queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
      this.search.set(params.get('q') || '');
      this.statusFilter.set(params.get('status') || '');
      this.sourceFilter.set('');

    });
  }
}
