import { requestId } from '../../core/services/request-id';
import { inject, untracked, DestroyRef } from '@angular/core';
import { PlatformRealtimeService } from '../../core/services/platform-realtime.service';
import { AuthService } from '../../core/services/auth.service';
import { Injectable, signal, computed, effect } from '@angular/core';

export interface PlatformSchool {
 code?:string;
  id: string;
  name: string;
  location: string;
  type: 'primary' | 'secondary' | 'mixed';
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'trial' | 'suspended' | 'churned';
  students: number;
  staff: number;
  createdAt: Date;
  lastActive: Date;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  onboarding?: string;
  adminInvited?: boolean;
}

export interface PlatformSubscription {
  id: string;
  schoolId: string;
  schoolName: string;
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'trial' | 'expired' | 'cancelled';
  amount: number;
  billingCycle: 'monthly' | 'annual';
  startDate: Date;
  renewalDate: Date;
  trialEndsAt?: Date;
}

export interface PlatformLead {
  id: string;
  schoolName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  location: string;
  source: 'website' | 'referral' | 'social' | 'event' | 'cold-outreach';
  status: 'new' | 'contacted' | 'demo-scheduled' | 'demo-done' | 'negotiation' | 'won' | 'lost';
  studentCount: number;
  notes: string;
  owner?: string;
  followUp?: string;
  convertedSchoolId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlatformAuditEntry {
  id: string;
  action: string;
  actor: string;
  target: string;
  details: string;
  ip: string;
  timestamp: Date;
}

export interface SystemHealth {
  apiUptime: number;
  avgResponseMs: number;
  activeSessions: number;
  smsCredits: number;
  storageUsedGb: number;
  storageCapacityGb: number;
  lastBackup: Date;
  errorRate: number;
}

@Injectable({ providedIn: 'root' })
export class SuperAdminStore {
  // ── Schools ──
  readonly auth=inject(AuthService); readonly loading=signal(false); readonly page=signal(1); readonly total=signal(0); readonly summary=signal<any>(null); readonly schools=signal<PlatformSchool[]>([]);
  readonly schoolSearch=signal('');readonly schoolStatus=signal('');
  readonly schoolsLoading = signal(false);
  readonly schoolPageSize = signal(25);
  readonly schoolPageCount = computed(() => Math.max(1, Math.ceil(this.total() / this.schoolPageSize())));
  readonly schoolRangeStart = computed(() => this.total() ? (this.page() - 1) * this.schoolPageSize() + 1 : 0);
  readonly schoolRangeEnd = computed(() => Math.min(this.page() * this.schoolPageSize(), this.total()));
  readonly summaryError = signal('');
  readonly leadPage=signal(1);readonly leadTotal=signal(0);readonly leadSearch=signal('');readonly leadStatus=signal('');readonly leadSource=signal('');readonly leadStages=signal<Record<string,number>>({});
  readonly auditPage=signal(1);readonly auditTotal=signal(0);readonly auditSearch=signal('');readonly auditActor=signal('');readonly auditAction=signal('');readonly auditFrom=signal('');readonly auditTo=signal('');
  readonly activeSchools = computed(() => this.schools().filter(s => s.status === 'active'));
  readonly trialSchools = computed(() => this.schools().filter(s => s.status === 'trial'));
  readonly totalStudents = computed(() => this.schools().reduce((sum, s) => sum + s.students, 0));
  readonly totalStaff = computed(() => this.schools().reduce((sum, s) => sum + s.staff, 0));

  // ── Subscriptions ──
  readonly subscriptions=signal<PlatformSubscription[]>([]);
  readonly activeSubscriptions = computed(() => this.subscriptions().filter(s => s.status === 'active'));
  readonly trialSubscriptions = computed(() => this.subscriptions().filter(s => s.status === 'trial'));
  readonly totalMRR = computed(() => {
    return this.activeSubscriptions().reduce((sum, s) => {
      return sum + (s.billingCycle === 'annual' ? s.amount / 12 : s.amount);
    }, 0);
  });

  // ── Leads ──
  readonly leads=signal<PlatformLead[]>([]);
  readonly newLeads = computed(() => this.leads().filter(l => l.status === 'new'));
  readonly pipelineLeads = computed(() => this.leads().filter(l => !['won', 'lost'].includes(l.status)));

  // ── Audit Log ──
  readonly auditLog=signal<PlatformAuditEntry[]>([]);

  // ── System Health ──
  readonly systemHealth=signal<SystemHealth>({apiUptime:0,avgResponseMs:0,activeSessions:0,smsCredits:0,storageUsedGb:0,storageCapacityGb:0,lastBackup:new Date(0),errorRate:0});

  // ── Platform Metrics ──
  readonly monthlyGrowth = computed(() => {
    const schools = this.schools();
    const thisMonth = schools.filter(s => {
      const d = new Date(s.createdAt);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    return thisMonth.length;
  });

  readonly revenueByPlan = computed(() => {
    const plans = { starter: 0, professional: 0, enterprise: 0 };
    for (const sub of this.activeSubscriptions()) {
      const monthly = sub.billingCycle === 'annual' ? sub.amount / 12 : sub.amount;
      plans[sub.plan] += monthly;
    }
    return plans;
  });

  readonly schoolsByType = computed(() => {
    const types = { primary: 0, secondary: 0, mixed: 0 };
    for (const s of this.activeSchools()) {
      types[s.type]++;
    }
    return types;
  });

  readonly invoices = signal<PlatformInvoice[]>([]);
  readonly admins=signal<PlatformAdmin[]>([]);
  readonly settings=signal({platformName:'SyncAcademy',supportEmail:'',maintenanceMessage:''});
  readonly storageError = signal('');
  readonly recentActivity = computed(() => [...this.auditLog()].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)));
  readonly overdueInvoices = computed(() => this.invoices().filter(i => i.status === 'unpaid' && +new Date(i.dueDate) < Date.now()));
  readonly overdueBalance = computed(() => this.overdueInvoices().reduce((sum, i) => sum + i.amount, 0));
  readonly expiringTrials = computed(() => this.trialSubscriptions().filter(s => s.trialEndsAt && +new Date(s.trialEndsAt) <= Date.now() + 7 * 86400000));
  readonly followUps = computed(() => this.pipelineLeads().filter(l => l.followUp && l.followUp <= this.dateInput(new Date())));
  readonly attention=computed(()=>[
    ...(this.summary()?.newLeads ? [{id:'leads',title:'New school leads',detail:this.summary().newLeads+' leads awaiting follow-up',route:'/super-admin/leads',query:{status:'new'},action:'Review leads'}] : []),
    ...(this.summary()?.pendingInvitations ? [{id:'invitations',title:'Pending invitations',detail:this.summary().pendingInvitations+' invitations awaiting acceptance',route:'/super-admin/schools',query:{},action:'Manage schools'}] : []),
  ]);
  readonly collectionRate = computed(() => {
    const total = this.invoices().reduce((sum, i) => sum + i.amount, 0);
    return total ? this.invoices().filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0) / total * 100 : 0;
  });

  readonly realtime = inject(PlatformRealtimeService);
  private readonly destroyRef = inject(DestroyRef);
  private context() { const identity = this.auth.identity(); return identity ? `${identity.id}:${identity.selectedRole}` : ''; }
  private canSync() { const identity = this.auth.identity(); return !!identity?.platformAdmin && !identity.mustChangePassword && !identity.needsMfa && !identity.needsMfaSetup; }
  private refreshTimer?: ReturnType<typeof setTimeout>;
  private activeLoad: Promise<void> | null = null;
  private reloadPending = false;
  constructor() {
    effect(() => {
      const identity = this.auth.identity();
      this.realtime.select(this.canSync() ? this.context() : '');
      if (!identity?.platformAdmin) {
        this.schoolRequest++; this.leadRequest++; this.auditRequest++;
        this.schools.set([]); this.leads.set([]); this.auditLog.set([]); this.admins.set([]); this.summary.set(null);
        this.settings.set({platformName:'SyncAcademy',supportEmail:'',maintenanceMessage:''});
        this.loading.set(false); this.schoolsLoading.set(false);
      }
    });
    const refresh = () => { if (!this.canSync()) return; clearTimeout(this.refreshTimer); this.refreshTimer = setTimeout(() => void this.load(), 250); };
    effect(() => { this.realtime.revision(); untracked(refresh); });
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      const visible = () => { if (document.visibilityState === 'visible') refresh(); };
      const timer = setInterval(visible, 30000);
      document.addEventListener('visibilitychange', visible);
      this.destroyRef.onDestroy(() => { clearInterval(timer); document.removeEventListener('visibilitychange', visible); });
    }
    this.destroyRef.onDestroy(() => { clearTimeout(this.refreshTimer); this.realtime.select(''); });
  }
  private params(values:Record<string,string|number>){return new URLSearchParams(Object.entries(values).filter(([,value])=>String(value).length).map(([key,value])=>[key,String(value)])).toString();}
  private schoolRequest=0;private leadRequest=0;private auditRequest=0;
  async loadSchools() {
    const request = ++this.schoolRequest; const context = this.context();
    this.schoolsLoading.set(true);
    try {
      const list = await this.auth.request('GET', 'schools?' + this.params({page:this.page(),q:this.schoolSearch(),status:this.schoolStatus()}));
      if (request !== this.schoolRequest || context !== this.context()) return;
      this.total.set(list.total);
      this.schoolPageSize.set(list.pageSize || 25);
      this.schools.set(list.items.map((s:any)=>({id:s.id,name:s.name,code:s.code,location:s.region,type:s.schoolType||'',plan:'',status:s.active?'active':'suspended',students:s._count.students,staff:s._count.memberships,createdAt:new Date(s.createdAt),lastActive:null,contactName:'',contactEmail:s.email||'',contactPhone:s.phone||''})));
    } finally {
      if (request === this.schoolRequest) this.schoolsLoading.set(false);
    }
  }
  async loadLeads(){const request=++this.leadRequest;const context=this.context();const list=await this.auth.request('GET','platform/leads?'+this.params({page:this.leadPage(),q:this.leadSearch(),status:this.leadStatus(),source:this.leadSource()}));if(request!==this.leadRequest||context!==this.context())return;this.leads.set(list.items);this.leadTotal.set(list.total);this.leadStages.set(list.stages);}
  async loadAudit(){const request=++this.auditRequest;const context=this.context();const list=await this.auth.request('GET','audit?'+this.params({page:this.auditPage(),q:this.auditSearch(),actor:this.auditActor(),action:this.auditAction(),from:this.auditFrom(),to:this.auditTo()}));if(request!==this.auditRequest||context!==this.context())return;this.auditTotal.set(list.total);this.auditLog.set(list.items.map((a:any)=>({id:a.id,action:a.action,actor:a.actor?.name||a.actorId||'System',target:a.target,details:'',ip:'Not recorded',timestamp:new Date(a.createdAt)})));}
  load(): Promise<void> {
    if (this.activeLoad) { this.reloadPending = true; return this.activeLoad; }
    const promise = (async () => { try { do { this.reloadPending = false; await this.fetch(); } while (this.reloadPending && this.canSync()); } finally { this.activeLoad = null; } })();
    this.activeLoad = promise;
    return promise;
  }
  private async fetch() {
    const context = this.context();
    this.loading.set(true);
    this.storageError.set('');
    this.summaryError.set('');
    const results = await Promise.allSettled([
      this.auth.request('GET', 'platform/summary').then(summary => {
        if (context !== this.context()) return;
        this.summary.set(summary);
        this.admins.set(summary.admins.map((a:any)=>({id:a.id,name:a.name,email:a.email,role:'Super Admin',status:a.enabled?'active':'revoked'})));
      }).catch(error => { if (context === this.context()) this.summaryError.set(this.auth.error(error)); throw error; }),
      this.auth.request('GET', 'platform/settings').then(settings => {
        if (context !== this.context()) return;
        this.settings.set({platformName:settings?.platformName || 'SyncAcademy',supportEmail:settings?.supportEmail || '',maintenanceMessage:settings?.maintenanceMessage || ''});
      }),
      this.loadSchools(), this.loadLeads(), this.loadAudit(),
    ]);
    if (context !== this.context()) return;
    const labels = ['Dashboard totals', 'Platform settings', 'Schools', 'Leads', 'Audit log'];
    this.storageError.set(results.flatMap((result, index) => result.status === 'rejected' ? [labels[index] + ': ' + this.auth.error(result.reason)] : []).join(' '));
    this.loading.set(false);
  }
  async nextPage(change:number) {
    if (this.schoolsLoading()) return;
    const previous = this.page();
    const next = Math.min(this.schoolPageCount(), Math.max(1, previous + change));
    if (next === previous) return;
    this.page.set(next);
    try { await this.loadSchools(); } catch (error) { this.page.set(previous); this.storageError.set(this.auth.error(error)); }
  }

  dateInput(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  monthlyRevenue(schoolId: string): number {
    return this.activeSubscriptions().filter(s => s.schoolId === schoolId).reduce((sum, s) => sum + (s.billingCycle === 'annual' ? s.amount / 12 : s.amount), 0);
  }
  record(action:string,target:string,details:string):void {}
  saveSchool(values:Partial<PlatformSchool>,id?:string):string { throw new Error('Use the school registration form.'); }
  async setSchoolStatus(id:string,status:PlatformSchool['status'],reason:string):Promise<void>{await this.auth.request('PATCH','schools/'+id,{active:status==='active',reason});await this.load();}
  inviteSchoolAdmin(id:string):void { this.storageError.set('Open the school staff invitations to invite a Headmaster.'); }
  price(_plan: string): number { return 0; }
  saveSubscription(..._args: unknown[]): void { this.storageError.set('Subscriptions are not available.'); }
  extendTrial(_id: string): void { this.storageError.set('Subscriptions are not available.'); }
  activateSubscription(_id: string): void { this.storageError.set('Subscriptions are not available.'); }
  recordPayment(_id: string): void { this.storageError.set('Payments are not part of this system.'); }
  async saveLead(values:any,id?:string):Promise<void> { await this.auth.request(id?'PATCH':'POST',id?`platform/leads/${id}`:'platform/leads',values,id?undefined:requestId());await this.load(); }
  async convertLead(id:string,code:string,expiresInMinutes:number):Promise<void> { await this.auth.request('POST',`platform/leads/${id}/convert`,{code,expiresInMinutes},requestId());await this.load(); }
  saveAdmin(values:any,id?:string):string { return 'Additional platform administrator invitations are not available yet.'; }
  async saveSettings(values:any):Promise<void> { const settings=await this.auth.request('PATCH','platform/settings',values);this.settings.set({platformName:settings.platformName,supportEmail:settings.supportEmail,maintenanceMessage:settings.maintenanceMessage}); }


  // ── Seed Data ──
  private seedSchools():PlatformSchool[]{return [];}

  private seedSubscriptions():PlatformSubscription[]{return [];}

  private seedLeads():PlatformLead[]{return [];}

  private seedAuditLog():PlatformAuditEntry[]{return [];}

  money(amount: number): string {
    return 'TZS ' + amount.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  timeSince(date: Date): string {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    return Math.floor(seconds / 86400) + 'd ago';
  }
}

export interface PlatformInvoice { id: string; schoolId: string; schoolName: string; amount: number; dueDate: Date; status: 'paid' | 'unpaid'; paidAt?: Date; }
export interface PlatformAdmin { id: string; name: string; email: string; role: string; status: string; }
