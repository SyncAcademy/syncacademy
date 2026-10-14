import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from './auth.service';
import { requestId } from './request-id';
import { SchoolRealtimeService } from './school-realtime.service';

/** Shared server snapshot for the original portal components. No business data is persisted in the browser. */
@Injectable({ providedIn: 'root' })
export class SchoolApiService {
  readonly auth = inject(AuthService);
  private readonly realtime = inject(SchoolRealtimeService);
  readonly schoolId = signal('');
  readonly data = signal<any>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly role = signal('');
  readonly academicRevisionNotice = signal(0);
  readonly schoolRevisionNotice = signal(0);
  readonly schoolName = computed(() => this.data()?.school?.name || 'Select a school');
  readonly choices = computed(() => this.auth.identity()?.memberships.filter(m => !this.role() || m.role === this.role()).map(m => m.school).filter((s,i,a)=>a.findIndex(x=>x.id===s.id)===i) || []);
  private generation = 0;
  private activeRefresh:Promise<void>|null=null;
  private refreshAgain=false;
  private readonly writeKeys = new Map<string, string>();
  constructor() {
    effect(() => { const id = this.auth.identity()?.id; if (!id) { this.generation++; this.data.set(null); this.schoolId.set(''); } });
    effect(() => { const identity = this.auth.identity(); const school = this.schoolId(); this.realtime.select(identity && !identity.mustChangePassword && !identity.needsMfa && !identity.needsMfaSetup ? school : '', identity ? `${identity.id}:${identity.selectedRole}` : ''); });
    effect(() => { const change = this.realtime.change(); if (!change || change.schoolId !== this.schoolId()) return; untracked(()=>{if (change.area === 'academic') this.academicRevisionNotice.update(value => value + 1); else {this.schoolRevisionNotice.update(value=>value+1);void this.refresh();}}); });
  }
  async enter(role: string, requested?: string | null) {
    this.role.set(role);
    const id = requested || ((this.auth.identity()?.platformAdmin || this.choices().some(s=>s.id===this.schoolId())) ? this.schoolId() : this.choices()[0]?.id) || this.choices()[0]?.id || '';
    await this.select(id);
  }
  async select(id: string) { this.generation++; this.schoolId.set(id); this.data.set(null); await this.refresh(); }
  refresh():Promise<void> {
    if(this.activeRefresh){this.refreshAgain=true;return this.activeRefresh;}
    const request=(async()=>{do{this.refreshAgain=false;await this.fetchSnapshot();}while(this.refreshAgain);})();
    this.activeRefresh=request;
    void request.finally(()=>{if(this.activeRefresh===request)this.activeRefresh=null;});
    return request;
  }
  private async fetchSnapshot() {
    const id = this.schoolId(); const generation = ++this.generation;
    const identity=this.auth.identity()?.id,role=this.role();
    const current=()=>generation===this.generation&&id===this.schoolId()&&identity===this.auth.identity()?.id&&role===this.role();
    this.error.set(''); if (!id) { this.data.set(null); this.loading.set(false); return; }
    this.loading.set(true);
    try { const data = await this.auth.request('GET', `schools/${id}/workspace`); if (current()) this.data.set(data); }
    catch(e) { if (current()) { this.data.set(null); this.error.set(this.auth.error(e)); } }
    finally { if (current()) this.loading.set(false); }
  }
  async write(path: string, payload: unknown, method = 'POST', key?: string, refresh = true) {
    const id = this.schoolId(); if (!id) throw new Error('Select a school first.');
    const fingerprint = id + ':' + method + ':' + path + ':' + JSON.stringify(payload);
    const requestKey = key || this.writeKeys.get(fingerprint) || requestId();
    this.writeKeys.set(fingerprint, requestKey);
    const result = await this.auth.request(method, `schools/${id}/${path}`, payload, requestKey);
    if (refresh && this.schoolId() === id) await this.refresh(); this.writeKeys.delete(fingerprint); return result;
  }
}
