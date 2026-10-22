import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, HostListener, OnDestroy, inject, computed } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
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
export class SaLeadsPage implements OnDestroy {
  store = inject(SuperAdminStore);
  private readonly document = inject(DOCUMENT);
  readonly timeSince = this.store.timeSince.bind(this.store);

  search = this.store.leadSearch;
  statusFilter = this.store.leadStatus;
  sourceFilter = this.store.leadSource;

  readonly filtered = computed(() => this.store.leads());
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.store.leadTotal() / 25)));
  private searchTimer?:ReturnType<typeof setTimeout>;
  filter(value:string,kind:'search'|'status'|'source'){(kind==='search'?this.search:kind==='status'?this.statusFilter:this.sourceFilter).set(value);this.store.leadPage.set(1);clearTimeout(this.searchTimer);this.searchTimer=setTimeout(()=>void this.store.loadLeads().catch(e=>this.error=this.store.auth.error(e)),kind==='search'?250:0);}
  clearFilters(): void { clearTimeout(this.searchTimer); this.search.set(''); this.statusFilter.set(''); this.sourceFilter.set(''); this.store.leadFrom.set(''); this.store.leadTo.set(''); this.store.leadPage.set(1); void this.store.loadLeads().catch(e=>this.error=this.store.auth.error(e)); }
  async page(change:number){this.store.leadPage.update(page=>Math.max(1,page+change));try{await this.store.loadLeads();}catch(e){this.error=this.store.auth.error(e);}}

  readonly pipelineSummary = computed(() => {
    const totals = this.store.leadStages();
    const stages = [
      { key: 'new', label: 'New', count: 0 },
      { key: 'contacted', label: 'Contacted', count: 0 },
      { key: 'demo-scheduled', label: 'Demo Scheduled', count: 0 },
      { key: 'demo-done', label: 'Demo Done', count: 0 },
      { key: 'negotiation', label: 'Negotiation', count: 0 },
      { key: 'won', label: 'Won', count: 0 },
      { key: 'lost', label: 'Lost', count: 0 },
    ];
    for (const stage of stages) stage.count = totals[stage.key] || 0;
    return stages;
  });

  statusLabel(status: string): string {
    return status.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase());
  }

  sourceLabel(source: string): string {
    const labels: Record<string, string> = {
      website: 'Website',
      'website-demo-request': 'Website Demo Request',
      referral: 'Referral',
      social: 'Social Media',
      event: 'Event',
      'cold-outreach': 'Cold Outreach',
      'friend-relative': 'Friend or Relative',
      other: 'Other',
    };
    return labels[source] ?? this.statusLabel(source);
  }

  editingId = '';
  convertingId = '';
  busy = false;
  error = '';
  notice = '';
  editor: Record<string, any> | null = null;
  selected: PlatformLead | null = null;
  private previousBodyOverflow: string | null = null;
  activityKind = 'note'; activityNote = ''; activityWhen = '';
  openDetails(lead: PlatformLead): void {
    if (!this.selected) {
      this.previousBodyOverflow = this.document.body.style.overflow;
      this.document.body.style.overflow = 'hidden';
    }
    this.selected = lead;
  }
  closeDetails(): void {
    this.selected = null;
    if (this.previousBodyOverflow !== null) {
      this.document.body.style.overflow = this.previousBodyOverflow;
      this.previousBodyOverflow = null;
    }
  }
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.selected) this.closeDetails();
  }
  ngOnDestroy(): void {
    this.closeDetails();
  }
  async addActivity(): Promise<void> {
    if (!this.selected || this.busy || this.activityNote.trim().length < 2) return;
    this.busy = true;
    this.error = '';
    try {
      const id = this.selected.id;
      await this.store.auth.request('POST', `platform/leads/${id}/activities`, {
        kind: this.activityKind,
        note: this.activityNote.trim(),
        ...(this.activityWhen ? { scheduledAt: new Date(this.activityWhen).toISOString() } : {}),
      });
      await this.store.loadLeads();
      const refreshedLead = this.store.leads().find(lead => lead.id === id);
      if (refreshedLead) this.selected = refreshedLead;
      else this.closeDetails();
      this.activityNote = '';
      this.activityWhen = '';
      this.notice = 'Activity recorded.';
    } catch (e) {
      this.error = this.store.auth.error(e);
    } finally {
      this.busy = false;
    }
  }
  fields: EditorField[] = [
    { key: 'schoolName', label: 'School name', required: true }, { key: 'contactName', label: 'Contact name', required: true },
    { key: 'schoolType', label: 'School type' }, { key: 'region', label: 'Region' }, { key: 'schoolWebsite', label: 'School website' }, { key: 'applicantPosition', label: 'Applicant position' },
    { key: 'headmasterName', label: 'Headmaster name' }, { key: 'headmasterEmail', label: 'Headmaster email', type: 'email' }, { key: 'headmasterPhone', label: 'Headmaster phone', type: 'tel' },
    { key: 'preferredDemoMethod', label: 'Preferred demo method' }, { key: 'requestMessage', label: 'Request message' },
    { key: 'contactEmail', label: 'Email', type: 'email', required: true }, { key: 'contactPhone', label: 'Phone', type: 'tel' },
    { key: 'location', label: 'Region', required: true }, { key: 'studentCount', label: 'Estimated students', type: 'number', min: 0, required: true },
    { key: 'source', label: 'Source', choices: [
      { value: 'website', label: 'Website' },
      { value: 'website-demo-request', label: 'Website Demo Request' },
      { value: 'social', label: 'Social Media' },
      { value: 'friend-relative', label: 'Friend or Relative' },
      { value: 'referral', label: 'Referral' },
      { value: 'event', label: 'Event' },
      { value: 'cold-outreach', label: 'Cold Outreach' },
      { value: 'other', label: 'Other' },
    ] },
    { key: 'status', label: 'Stage', options: ['new', 'contacted', 'demo-scheduled', 'demo-done', 'negotiation', 'won', 'lost'] },
    { key: 'owner', label: 'Follow-up owner' }, { key: 'followUp', label: 'Next follow-up', type: 'date' }, { key: 'notes', label: 'Notes' },
  ];
  conversionFields: EditorField[] = [{ key: 'code', label: 'Unique school code', required: true }, { key: 'expiresInMinutes', label: 'Headmaster invitation expires after', choices: [{value:'1440',label:'24 hours'},{value:'2880',label:'48 hours'},{value:'10080',label:'7 days'}], required: true }];
  openLead(lead?: PlatformLead): void { this.error='';this.convertingId='';this.editingId = lead?.id || ''; this.editor = lead ? { schoolName:lead.schoolName,contactName:lead.contactName,contactEmail:lead.contactEmail,contactPhone:lead.contactPhone,location:lead.location,region:lead.region,schoolType:lead.schoolType,schoolWebsite:lead.schoolWebsite,applicantPosition:lead.applicantPosition,headmasterName:lead.headmasterName,headmasterEmail:lead.headmasterEmail,headmasterPhone:lead.headmasterPhone,preferredDemoMethod:lead.preferredDemoMethod,requestMessage:lead.requestMessage,studentCount:lead.studentCount,source:lead.source,status:lead.status,owner:lead.owner,followUp:lead.followUp,notes:lead.notes } : { source: 'website', status: 'new', studentCount: 0, owner: '', followUp:'',notes: '',contactPhone:'' }; }
  openConversion(lead: PlatformLead): void {this.error='';this.convertingId=lead.id;this.editor={code:'',expiresInMinutes:'2880'};}
  async save(values: Record<string, any>): Promise<void> { if(this.busy)return;this.busy=true;this.error='';try{if(this.convertingId){await this.store.convertLead(this.convertingId,values['code'],Number(values['expiresInMinutes']));this.notice='School created and Headmaster invitation queued.';}else{await this.store.saveLead(values,this.editingId||undefined);this.notice=this.editingId?'Lead updated.':'Lead added.';}this.editor=null;}catch(e){this.error=this.store.auth.error(e);}finally{this.busy=false;} }
  constructor() {
    inject(ActivatedRoute).queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
      const q=params.get('q')||'',status=params.get('status')||'';
      if(q!==this.search()||status!==this.statusFilter()){this.search.set(q);this.statusFilter.set(status);this.store.leadPage.set(1);void this.store.loadLeads().catch(e=>this.error=this.store.auth.error(e));}

    });
  }
}
