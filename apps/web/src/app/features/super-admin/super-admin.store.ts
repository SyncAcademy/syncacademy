import { inject } from '@angular/core';
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

  readonly invoices = signal<DemoInvoice[]>([]);
  readonly admins=signal<DemoAdmin[]>([]);
  readonly settings=signal({platformName:'SyncAcademy',supportEmail:'',trialDays:0,lowSmsThreshold:0,maintenanceMessage:''});
  readonly storageError = signal('');
  readonly recentActivity = computed(() => [...this.auditLog()].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)));
  readonly overdueInvoices = computed(() => this.invoices().filter(i => i.status === 'unpaid' && +new Date(i.dueDate) < Date.now()));
  readonly overdueBalance = computed(() => this.overdueInvoices().reduce((sum, i) => sum + i.amount, 0));
  readonly expiringTrials = computed(() => this.trialSubscriptions().filter(s => s.trialEndsAt && +new Date(s.trialEndsAt) <= Date.now() + 7 * 86400000));
  readonly followUps = computed(() => this.pipelineLeads().filter(l => l.followUp && l.followUp <= this.dateInput(new Date())));
  readonly attention=computed(()=>this.summary()?.pendingInvitations ? [{id:'invitations',title:'Pending invitations',detail:this.summary().pendingInvitations+' invitations awaiting acceptance',route:'/super-admin/schools',query:{},action:'Manage schools'}] : []);
  readonly collectionRate = computed(() => {
    const total = this.invoices().reduce((sum, i) => sum + i.amount, 0);
    return total ? this.invoices().filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0) / total * 100 : 0;
  });

  constructor(){effect(()=>{if(!this.auth.identity()){this.schools.set([]);this.auditLog.set([]);this.admins.set([]);this.summary.set(null);}});}
 async load(){this.loading.set(true);this.storageError.set('');try{const [list,audit,summary]=await Promise.all([this.auth.request('GET','schools?page='+this.page()),this.auth.request('GET','audit'),this.auth.request('GET','platform/summary')]);this.total.set(list.total);this.schools.set(list.items.map((s:any)=>({id:s.id,name:s.name,code:s.code,location:s.region,type:'',plan:'',status:s.active?'active':'suspended',students:s._count.students,staff:s._count.memberships,createdAt:new Date(s.createdAt),lastActive:null,contactName:'',contactEmail:'',contactPhone:''})));this.auditLog.set(audit.map((a:any)=>({id:a.id,action:a.action,actor:a.actor?.name||a.actorId||'System',target:a.target,details:'',ip:'Not recorded',timestamp:new Date(a.createdAt)})));this.summary.set(summary);this.admins.set(summary.admins.map((a:any)=>({id:a.id,name:a.name,email:a.email,role:'Super Admin',status:a.enabled?'active':'revoked'})));}catch(e){this.schools.set([]);this.summary.set(null);this.storageError.set(this.auth.error(e));}finally{this.loading.set(false);}}
 async nextPage(change:number){this.page.update(p=>Math.max(1,p+change));await this.load();}

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
  price(plan: string): number { return plan === 'enterprise' ? 500000 : plan === 'professional' ? 280000 : 85000; }
  saveSubscription(id: string, plan: PlatformSubscription['plan'], billingCycle: PlatformSubscription['billingCycle']): void {
    const sub = this.subscriptions().find(s => s.id === id); if (!sub) return;
    this.subscriptions.update(rows => rows.map(s => s.id === id ? { ...s, plan, billingCycle, amount: this.price(plan) * (billingCycle === 'annual' ? 12 : 1) } : s));
    this.schools.update(rows => rows.map(s => s.id === sub.schoolId ? { ...s, plan } : s));
    this.record('Subscription Updated', sub.schoolName, `${plan}, ${billingCycle}; existing invoices unchanged`);
  }
  extendTrial(id: string): void {
    const sub = this.subscriptions().find(s => s.id === id); if (!sub || sub.status !== 'trial') return;
    const end = new Date(Math.max(Date.now(), +new Date(sub.trialEndsAt || new Date())) + 7 * 86400000);
    this.subscriptions.update(rows => rows.map(s => s.id === id ? { ...s, trialEndsAt: end, renewalDate: end } : s));
    this.record('Trial Extended', sub.schoolName, 'Trial extended by 7 days');
  }
  activateSubscription(id: string): void {
    const sub = this.subscriptions().find(s => s.id === id); if (!sub || sub.status !== 'trial') return;
    const renewal = new Date(); sub.billingCycle === 'annual' ? renewal.setFullYear(renewal.getFullYear() + 1) : renewal.setMonth(renewal.getMonth() + 1);
    this.subscriptions.update(rows => rows.map(s => s.id === id ? { ...s, status: 'active', startDate: new Date(), renewalDate: renewal, trialEndsAt: undefined } : s));
    this.schools.update(rows => rows.map(s => s.id === sub.schoolId ? { ...s, status: 'active' } : s));
    this.invoices.update(rows => [{ id: 'INV-' + crypto.randomUUID().slice(0, 8), schoolId: sub.schoolId, schoolName: sub.schoolName, amount: sub.amount, dueDate: new Date(), status: 'unpaid' }, ...rows]);
    this.record('Subscription Activated', sub.schoolName, 'Demo subscription activated and invoice created');
  }
  recordPayment(id: string): void {
    const invoice = this.invoices().find(i => i.id === id); if (!invoice || invoice.status === 'paid') return;
    this.invoices.update(rows => rows.map(i => i.id === id ? { ...i, status: 'paid', paidAt: new Date() } : i));
    this.record('Demo Payment Recorded', invoice.schoolName, `${invoice.id}: ${this.money(invoice.amount)}; no funds transferred`);
  }
  saveLead(values:any,id?:string):void { this.storageError.set('Lead management is not available yet.'); }
  convertLead(id:string):void { this.storageError.set('Lead management is not available yet.'); }
  saveAdmin(values:any,id?:string):string { return 'Additional platform administrator invitations are not available yet.'; }
  saveSettings(values:any):void { this.storageError.set('Platform preferences are not editable yet.'); }


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

export interface DemoInvoice { id: string; schoolId: string; schoolName: string; amount: number; dueDate: Date; status: 'paid' | 'unpaid'; paidAt?: Date; }
export interface DemoAdmin { id: string; name: string; email: string; role: string; status: string; }
