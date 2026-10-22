import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SuperAdminStore } from '../super-admin.store';

interface Activity { id: string; ipAddress: string; eventType: string; createdAt: string; details: { form?: string; reason?: string; emailHash?: string }; blockedUntil?: string | null }

@Component({ selector: 'app-sa-public-form-security', standalone: true, imports: [CommonModule, FormsModule], template: `
<header class="page-header"><div><p class="eyebrow">Platform oversight</p><h2>Public Form Security</h2><p>Review Contact Us and Request a Demo submissions and restrictions.</p></div></header>
@if (error()) { <p class="portal-notice portal-notice--error" role="alert">{{error()}}</p> }
@if (notice()) { <p class="portal-notice" role="status">{{notice()}}</p> }
<section class="panel"><div class="filters"><label>Form <select [(ngModel)]="form" (ngModelChange)="load()"><option value="">Both forms</option><option value="contact">Contact Us</option><option value="demo">Request a Demo</option></select></label><label>IP address <input [(ngModel)]="ip" placeholder="IPv4 or IPv6"></label><button class="action-btn" (click)="load()">Search</button></div>
<div class="table-scroll"><table><thead><tr><th>Time</th><th>IP address</th><th>Form</th><th>Event</th><th>Violation</th><th>Email identifier</th><th>Block expires</th><th>Action</th></tr></thead><tbody>
@for (item of items(); track item.id) { <tr><td>{{item.createdAt | date:'medium'}}</td><td>{{item.ipAddress}}</td><td>{{item.details.form || 'Both'}}</td><td>{{item.eventType}}</td><td>{{item.details.reason || 'None'}}</td><td>{{item.details.emailHash || 'Hidden'}}</td><td>{{item.blockedUntil ? (item.blockedUntil | date:'medium') : 'None'}}</td><td><button class="action-btn" (click)="selectedIp = item.ipAddress">Manage</button></td></tr> }
@empty { <tr><td colspan="8">No activity matches your filters.</td></tr> }
</tbody></table></div><div class="pagination-bar"><span>{{total()}} events · Page {{page}}</span><div><button class="action-btn" [disabled]="page <= 1" (click)="page = page - 1; load()">Previous</button><button class="action-btn" [disabled]="page * 25 >= total()" (click)="page = page + 1; load()">Next</button></div></div></section>
<section class="panel"><h3>Manage an IP restriction</h3><p>Restrictions apply only to public form submissions. Record a reason for each change.</p><label>IP address <input [(ngModel)]="selectedIp" placeholder="IPv4 or IPv6"></label><label>Reason <input [(ngModel)]="reason" maxlength="500"></label><div class="row-actions"><button class="action-btn" [disabled]="busy()" (click)="changeBlock('POST')">Block temporarily</button><button class="action-btn" [disabled]="busy()" (click)="changeBlock('DELETE')">Unblock</button></div></section>
`, styleUrls: ['./sa-public-form-security.page.scss', '../sa-workflows.scss'] })
export class SaPublicFormSecurityPage implements OnInit {
  private readonly store = inject(SuperAdminStore);
  readonly items = signal<Activity[]>([]); readonly total = signal(0); readonly error = signal(''); readonly notice = signal(''); readonly busy = signal(false);
  form = ''; ip = ''; page = 1; selectedIp = ''; reason = '';
  ngOnInit(): void { void this.load(); }
  async load(): Promise<void> { this.error.set(''); try { const q = new URLSearchParams({ page: String(this.page) }); if (this.form) q.set('form', this.form); if (this.ip.trim()) q.set('ip', this.ip.trim()); const result = await this.store.auth.request('GET', 'platform/public-forms/activity?' + q); this.items.set(result.items); this.total.set(result.total); } catch (e) { this.error.set(this.store.auth.error(e)); } }
  async changeBlock(method: 'POST' | 'DELETE'): Promise<void> { if (this.busy()) return; if (!window.confirm(method === 'POST' ? 'Block this IP from public form submissions?' : 'Remove this IP restriction now?')) return; this.busy.set(true); this.error.set(''); this.notice.set(''); try { await this.store.auth.request(method, 'platform/public-forms/blocks', { ip: this.selectedIp.trim(), reason: this.reason.trim() }); this.notice.set(method === 'POST' ? 'IP restriction applied.' : 'IP restriction removed.'); this.reason = ''; await this.load(); } catch (e) { this.error.set(this.store.auth.error(e)); } finally { this.busy.set(false); } }
}
