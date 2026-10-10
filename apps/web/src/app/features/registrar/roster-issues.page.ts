import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RegistrarStore } from './registrar.store';

@Component({ selector: 'app-roster-issues', standalone: true, imports: [CommonModule, FormsModule, RouterLink], styleUrls: ['./registrar.page.scss'], template: `
  <h2>Roster issues & notifications</h2><p>Teacher requests for student corrections appear here. Correct the student’s record first, then record the resolution so the teacher can review it.</p>
  <div class="context-row"><strong>{{ store.year()?.label }}</strong><span>{{ api.schoolName() }}</span><button class="action-btn" [disabled]="busy()" (click)="load()">Refresh</button></div>
  @if (error()) { <p class="portal-notice portal-notice--error" role="alert">{{ error() }}</p> }
  @if (notice()) { <p class="portal-notice" role="status">{{ notice() }}</p> }
  <label class="field">Status<select [ngModel]="status()" (ngModelChange)="status.set($event); page.set(1)"><option value="open">Open requests</option><option value="resolved">Resolved requests</option><option value="">All requests</option></select></label>
  @for (issue of items(); track issue.id) {
    <section class="panel"><div class="panel-heading"><h3>{{ issue.assignment.classroom.name }} · {{ issue.assignment.subject?.name || 'Whole class' }}</h3><span class="badge">{{ issue.status }}</span></div>
    <p>{{ issue.issueType.replaceAll('_', ' ') }} · {{ issue.assignment.membership.user.name }} · {{ issue.createdAt | date:'medium' }}</p>
    <p>{{ issue.description }}</p>
    @if (issue.resolution) { <p><strong>Latest response:</strong> {{ issue.resolution }}</p> }
    <a [routerLink]="[api.role() === 'HEADMASTER' ? '/head/students' : api.role() === 'ACADEMIC' ? '/academic/students' : '/register/students']" [queryParams]="{class: issue.assignment.classroomId}" queryParamsHandling="merge">Open student directory for this class</a>
    <label class="field">{{ issue.status === 'open' ? 'Resolution: explain what was corrected' : 'Reason to reopen' }}<textarea maxlength="2000" rows="3" [(ngModel)]="notes[issue.id]" [disabled]="busy() || closed()"></textarea></label>
    <button class="action-btn action-btn--primary" [disabled]="busy() || closed() || (notes[issue.id] || '').trim().length < 10" (click)="save(issue)">{{ issue.status === 'open' ? 'Mark resolved' : 'Reopen issue' }}</button>
    </section>
  } @empty { <section class="panel empty">{{ busy() ? 'Loading requests…' : 'No requests in this view.' }}</section> }
  <div class="pagination"><span>{{ total() }} requests · page {{ page() }}</span><button class="action-btn" [disabled]="page() === 1 || busy()" (click)="page.set(page()-1)">Previous</button><button class="action-btn" [disabled]="page()*25 >= total() || busy()" (click)="page.set(page()+1)">Next</button></div>
` })
export class RosterIssuesPage {
  readonly store = inject(RegistrarStore); readonly api = this.store.api;
  readonly status = signal('open'); readonly page = signal(1); readonly total = signal(0); readonly items = signal<any[]>([]);
  readonly error = signal(''); readonly notice = signal(''); readonly busy = signal(false); notes: Record<string, string> = {};
  private generation = 0;
  private readonly context = computed(() => `${this.api.schoolId()}|${this.store.year()?.id || ''}`);
  constructor() { effect(() => { this.context(); this.status(); this.page(); untracked(() => { this.notes = {}; this.notice.set(''); void this.load(); }); }); }
  closed() { return !this.store.year(); }
  async load() {
    const generation = ++this.generation; const school = this.api.schoolId(); const year = this.store.year()?.id;
    this.items.set([]); this.error.set(''); if (!school || !year) return;
    this.busy.set(true);
    try { const query = new URLSearchParams({ yearId: year, page: String(this.page()), ...(this.status() ? { status: this.status() } : {}) }); const result: any = await this.api.auth.request('GET', `schools/${school}/registry/issues?${query}`); if (generation === this.generation) { this.items.set(result.items); this.total.set(result.total); } }
    catch (e) { if (generation === this.generation) this.error.set(this.api.auth.error(e)); } finally { if (generation === this.generation) this.busy.set(false); }
  }
  async save(issue: any) {
    if (this.busy() || this.closed()) return;
    const generation = this.generation; this.busy.set(true); this.error.set('');
    try { await this.api.write(`registry/issues/${issue.id}`, { version: issue.version, status: issue.status === 'open' ? 'resolved' : 'open', resolution: this.notes[issue.id] }, 'PATCH'); if (generation === this.generation) { this.notice.set('Issue updated. The teacher can see your response.'); await this.load(); } }
    catch (e) { if (generation === this.generation) this.error.set(this.api.auth.error(e)); } finally { this.busy.set(false); }
  }
}
