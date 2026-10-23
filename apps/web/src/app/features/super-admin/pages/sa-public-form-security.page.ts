import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SuperAdminStore } from '../super-admin.store';

interface Activity { id: string; ipAddress: string; eventType: string; createdAt: string; details: { form?: string; reason?: string; emailHash?: string }; blockedUntil?: string | null }

@Component({ selector: 'app-sa-public-form-security', standalone: true, imports: [CommonModule, FormsModule], template: `
<header class="page-header security-page-header"><div><h2>Public Form Security</h2><p>Monitor public form submissions, security events, and IP restrictions.</p></div></header>
@if (error()) { <p class="portal-notice portal-notice--error" role="alert">{{error()}}</p> }
@if (notice()) { <p class="portal-notice" role="status">{{notice()}}</p> }
<section class="restriction-panel panel" aria-labelledby="restriction-heading">
  <div class="security-section-heading"><div><h3 id="restriction-heading">Manage an IP restriction</h3><p>Restrictions apply only to public form submissions. Record a reason for each change.</p></div></div>
  <div class="restriction-form">
    <label class="security-field"><span>IP address</span><input #restrictionIpInput [(ngModel)]="selectedIp" placeholder="IPv4 or IPv6"></label>
    <label class="security-field"><span>Reason</span><input [(ngModel)]="reason" maxlength="500"></label>
    <div class="restriction-actions"><button class="action-btn restriction-block" type="button" [disabled]="busy()" (click)="changeBlock('POST')">Block temporarily</button><button class="action-btn restriction-unblock" type="button" [disabled]="busy()" (click)="changeBlock('DELETE')">Unblock</button></div>
  </div>
</section>
<section class="security-filter-panel" aria-label="Filter public form activity">
  <div class="security-section-heading"><div><h3>Find activity</h3><p>Filter the security events by form and IP address.</p></div></div>
  <div class="security-filters">
    <label class="security-field"><span>Form</span><select [(ngModel)]="form" (ngModelChange)="load()"><option value="">Both forms</option><option value="contact">Contact Us</option><option value="demo">Request a Demo</option></select></label>
    <label class="security-field"><span>IP address</span><input [(ngModel)]="ip" placeholder="IPv4 or IPv6"></label>
    <button class="action-btn action-btn--primary security-search" type="button" (click)="load()">Search</button>
  </div>
</section>
<section class="security-activity panel" aria-label="Public form security events">
  <div class="security-section-heading security-table-heading"><div><h3>Security activity</h3><p>{{total()}} events · Page {{page}}</p></div></div>
  <div class="table-scroll"><table><thead><tr><th scope="col">Time</th><th scope="col">IP address</th><th scope="col">Form</th><th scope="col">Event</th><th scope="col">Violation</th><th scope="col">Email identifier</th><th scope="col">Block expires</th><th scope="col">Action</th></tr></thead><tbody>
    @for (item of items(); track item.id) {
      <tr>
        <td data-label="Time" class="security-time">{{item.createdAt | date:'medium'}}</td>
        <td data-label="IP address" class="security-ip">{{item.ipAddress}}</td>
        <td data-label="Form"><span class="form-badge">{{item.details.form || 'Both'}}</span></td>
        <td data-label="Event"><span class="event-badge">{{item.eventType}}</span></td>
        <td data-label="Violation" class="violation-cell">{{item.details.reason || 'None'}}</td>
        <td data-label="Email identifier" class="identifier-cell">{{item.details.emailHash || 'Hidden'}}</td>
        <td data-label="Block expires"><span [class.restriction-active]="item.blockedUntil">{{item.blockedUntil ? (item.blockedUntil | date:'medium') : 'None'}}</span></td>
        <td data-label="Action"><button class="action-btn security-manage" type="button" (click)="manageIp(item.ipAddress)">Manage</button></td>
      </tr>
    }
    @empty { <tr class="security-empty"><td colspan="8"><strong>No activity found</strong><span>Try changing the selected form or IP address.</span></td></tr> }
  </tbody></table></div>
  <nav class="pagination-bar security-pagination" aria-label="Public form security pagination"><span>{{total()}} events · Page {{page}}</span><div class="security-pagination-actions"><button class="action-btn" type="button" [disabled]="page <= 1" (click)="page = page - 1; load()">Previous</button><button class="action-btn" type="button" [disabled]="page * 25 >= total()" (click)="page = page + 1; load()">Next</button></div></nav>
</section>
`, styleUrls: ['./sa-public-form-security.page.scss', '../sa-workflows.scss'] })
export class SaPublicFormSecurityPage implements OnInit {
  private readonly store = inject(SuperAdminStore);
  @ViewChild('restrictionIpInput') private restrictionIpInput!: ElementRef<HTMLInputElement>;
  readonly items = signal<Activity[]>([]); readonly total = signal(0); readonly error = signal(''); readonly notice = signal(''); readonly busy = signal(false);
  form = ''; ip = ''; page = 1; selectedIp = ''; reason = '';
  ngOnInit(): void { void this.load(); }
  manageIp(ipAddress: string): void { this.selectedIp = ipAddress; this.restrictionIpInput.nativeElement.focus({ preventScroll: true }); this.restrictionIpInput.nativeElement.scrollIntoView({ block: 'center' }); }
  async load(): Promise<void> { this.error.set(''); try { const q = new URLSearchParams({ page: String(this.page) }); if (this.form) q.set('form', this.form); if (this.ip.trim()) q.set('ip', this.ip.trim()); const result = await this.store.auth.request('GET', 'platform/public-forms/activity?' + q); this.items.set(result.items); this.total.set(result.total); } catch (e) { this.error.set(this.store.auth.error(e)); } }
  async changeBlock(method: 'POST' | 'DELETE'): Promise<void> { if (this.busy()) return; if (!window.confirm(method === 'POST' ? 'Block this IP from public form submissions?' : 'Remove this IP restriction now?')) return; this.busy.set(true); this.error.set(''); this.notice.set(''); try { await this.store.auth.request(method, 'platform/public-forms/blocks', { ip: this.selectedIp.trim(), reason: this.reason.trim() }); this.notice.set(method === 'POST' ? 'IP restriction applied.' : 'IP restriction removed.'); this.reason = ''; await this.load(); } catch (e) { this.error.set(this.store.auth.error(e)); } finally { this.busy.set(false); } }
}
