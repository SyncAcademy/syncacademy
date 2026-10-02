import { AuthLayoutComponent } from '../../shared/layouts/auth-layout/auth-layout.component';
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
@Component({ standalone: true, imports: [AuthLayoutComponent,CommonModule, FormsModule, RouterLink], templateUrl: './auth.page.html', styleUrls: ['./live.scss'] })
export class LiveAuthPage implements OnInit {
  auth = inject(AuthService); router = inject(Router); route = inject(ActivatedRoute);
  mode = this.route.snapshot.data['mode'] || 'login';
  email = ''; password = ''; confirm = ''; currentPassword = ''; code = ''; rememberMe = false;
  token = ''; invitation: any = null; setup: { secret: string; qr: string } | null = null;
  busy = false; error = ''; notice = ''; recoveryCodes: string[] = []; recoveryCode = '';
  async ngOnInit() {
    this.token = new URLSearchParams(location.hash.slice(1)).get('token') || '';
    if (this.token) history.replaceState(null, '', location.pathname);
    if (this.mode === 'invitation') {
      await this.run(async () => { this.invitation = await this.auth.request('POST', 'invitations/preview', { token: this.token }); try { await this.auth.refresh(); } catch { this.auth.identity.set(null); } });
    }
    if (this.mode === 'security') await this.run(async () => { await this.auth.refresh(); });
  }
  async run(action: () => Promise<void>) { if (this.busy) return; this.busy = true; this.error = ''; this.notice = ''; try { await action(); } catch (e) { this.error = this.auth.error(e); } finally { this.busy = false; } }
  async login() { if (!this.invitation?.role) { await this.router.navigateByUrl('/auth/login'); return; } await this.run(async () => { await this.auth.login(this.email, this.password, this.invitation.role, this.rememberMe); this.password = ''; await this.router.navigateByUrl(this.auth.landing()); }); }
  async invitationLogin() { await this.run(async () => { if (this.auth.identity() && this.auth.identity()?.email !== this.invitation.email) await this.auth.logout(); await this.auth.request('POST', 'invitations/accept', { token: this.token, password: this.password }); await this.auth.login(this.invitation.email, this.password, this.invitation.role); this.password = ''; this.invitation = null; await this.router.navigateByUrl(this.auth.landing()); }); }
  async accept() { await this.run(async () => {
    if (!this.invitation.existingAccount && this.password !== this.confirm) { this.error = 'Passwords do not match.'; return; }
    const result = await this.auth.request('POST', 'invitations/accept', { token: this.token, ...(!this.invitation.existingAccount ? { password: this.password } : {}) });
    this.notice = result.message; this.invitation = null; this.password = ''; this.confirm = '';
  }); }
  async recover() { await this.run(async () => { this.notice = (await this.auth.request('POST', 'auth/recover', { email: this.email })).message; }); }
  async reset() { await this.run(async () => { if (this.password !== this.confirm) { this.error = 'Passwords do not match.'; return; } this.notice = (await this.auth.request('POST', 'auth/reset', { token: this.token, password: this.password })).message; this.password = ''; this.confirm = ''; this.token = ''; }); }
  async changePassword() { await this.run(async () => { if (this.password !== this.confirm) { this.error = 'Passwords do not match.'; return; } await this.auth.request('POST', 'auth/change-password', { currentPassword: this.currentPassword, password: this.password }); this.password = ''; this.currentPassword = ''; this.confirm = ''; await this.auth.refresh(); this.notice = 'Password changed. Other sessions have been revoked.'; }); }
  async startMfa() { await this.run(async () => { this.setup = await this.auth.request('POST', 'auth/mfa/setup', {}); }); }
  async verify() { await this.run(async () => { const result = await this.auth.request('POST', 'auth/mfa/verify', { code: this.code, setup: !!this.setup }); this.setup = null; this.code = ''; await this.auth.refresh(); if (result.recoveryCodes) this.recoveryCodes = result.recoveryCodes; else await this.router.navigateByUrl(this.auth.landing()); }); }
  async recoverMfa() { await this.run(async () => { await this.auth.request('POST', 'auth/mfa/recovery', { code: this.recoveryCode.trim() }); this.recoveryCode = ''; await this.auth.refresh(); await this.router.navigateByUrl(this.auth.landing()); }); }
  async signOut() { await this.run(async () => { await this.auth.logout(); await this.router.navigateByUrl('/auth/login'); }); }
}
