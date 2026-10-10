import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { requestId } from './request-id';

/** Shared server snapshot for the original portal components. No business data is persisted in the browser. */
@Injectable({ providedIn: 'root' })
export class SchoolApiService {
  readonly auth = inject(AuthService);
  readonly schoolId = signal('');
  readonly data = signal<any>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly role = signal('');
  readonly schoolName = computed(() => this.data()?.school?.name || 'Select a school');
  readonly choices = computed(() => this.auth.identity()?.memberships.filter(m => !this.role() || m.role === this.role()).map(m => m.school).filter((s,i,a)=>a.findIndex(x=>x.id===s.id)===i) || []);
  private generation = 0;
  private readonly writeKeys = new Map<string, string>();
  constructor() { effect(() => { const id = this.auth.identity()?.id; if (!id) { this.generation++; this.data.set(null); this.schoolId.set(''); } }); }
  async enter(role: string, requested?: string | null) {
    this.role.set(role);
    const id = requested || ((this.auth.identity()?.platformAdmin || this.choices().some(s=>s.id===this.schoolId())) ? this.schoolId() : this.choices()[0]?.id) || this.choices()[0]?.id || '';
    await this.select(id);
  }
  async select(id: string) { this.schoolId.set(id); this.data.set(null); await this.refresh(); }
  async refresh() {
    const id = this.schoolId(); const generation = ++this.generation;
    this.error.set(''); if (!id) { this.data.set(null); this.loading.set(false); return; }
    this.loading.set(true);
    try { const data = await this.auth.request('GET', `schools/${id}/workspace`); if (generation === this.generation) this.data.set(data); }
    catch(e) { if (generation === this.generation) { this.data.set(null); this.error.set(this.auth.error(e)); } }
    finally { if (generation === this.generation) this.loading.set(false); }
  }
  async write(path: string, payload: unknown, method = 'POST', key?: string) {
    const id = this.schoolId(); if (!id) throw new Error('Select a school first.');
    const fingerprint = id + ':' + method + ':' + path + ':' + JSON.stringify(payload);
    const requestKey = key || this.writeKeys.get(fingerprint) || requestId();
    this.writeKeys.set(fingerprint, requestKey);
    const result = await this.auth.request(method, `schools/${id}/${path}`, payload, requestKey);
    if (this.schoolId() === id) await this.refresh(); this.writeKeys.delete(fingerprint); return result;
  }
}
