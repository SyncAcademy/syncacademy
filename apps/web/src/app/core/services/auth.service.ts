import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { requestErrorMessage } from './request-error';
export interface Identity { id: string; name: string; email: string; selectedRole: string; platformAdmin: boolean; mustChangePassword: boolean; needsMfa: boolean; needsMfaSetup: boolean; mfaEnabled: boolean; memberships: { id: string; role: string; school: { id: string; name: string } }[]; }
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private lastTrustedActivity = 0;
  readonly identity = signal<Identity | null>(null);
  readonly isLoggedIn = () => !!this.identity();
  constructor() {
    if (typeof window !== 'undefined') {
      const recordActivity = (event: Event) => { if (event.isTrusted) this.lastTrustedActivity = Date.now(); };
      for (const eventName of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(eventName, recordActivity, { passive: true });
    }
  }
  request<T = any>(method: string, path: string, body?: unknown, idempotencyKey?: string): Promise<T> {
    const identity = this.identity();
    const activity = identity?.selectedRole === 'SUPER_ADMIN' && Date.now() - this.lastTrustedActivity < 60000;
    return firstValueFrom(this.http.request<T>(method, '/api/v1/' + path, { body, withCredentials: true, headers: { 'X-Requested-With': 'SyncAcademy', ...(activity ? { 'X-Platform-Activity': '1' } : {}), ...(method !== 'GET' ? { 'Content-Type': 'application/json' } : {}), ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) } }))
      .catch(error => { this.handleSessionError(error, identity, path); throw error; });
  }
  private handleSessionError(error: unknown, identity: Identity | null, path: string): void {
    if (!(error instanceof HttpErrorResponse) || error.status !== 401 || !identity || this.identity() !== identity || path.startsWith('auth/platform/') || path === 'auth/login') return;
    this.identity.set(null);
    const destination = identity.selectedRole === 'SUPER_ADMIN' ? '/platform-access/login' : `/auth/sign-in/${identity.selectedRole}`;
    void this.router.navigate([destination], { queryParams: { session: 'expired' }, replaceUrl: true });
  }
  async requestBlob(path: string): Promise<Blob> {
    const identity = this.identity();
    try {
      return await firstValueFrom(this.http.get('/api/v1/' + path, {
        responseType: 'blob',
        withCredentials: true,
        headers: { 'X-Requested-With': 'SyncAcademy' },
      }));
    } catch (error) {
      if (!(error instanceof HttpErrorResponse) || !(error.error instanceof Blob)) { this.handleSessionError(error, identity, path); throw error; }
      try {
        const body = JSON.parse(await error.error.text());
        throw new HttpErrorResponse({
          error: body,
          headers: error.headers,
          status: error.status,
          statusText: error.statusText,
          url: error.url ?? undefined,
        });
      } catch (parseError) {
        if (parseError instanceof HttpErrorResponse) { this.handleSessionError(parseError, identity, path); throw parseError; }
        throw error;
      }
    }
  }
  async refresh(): Promise<Identity> { const me = await this.request<Identity>('GET', 'auth/me'); this.identity.set(me); return me; }
  async login(email: string, password: string, role: string, rememberMe = false): Promise<Identity> { const me = await this.request<Identity>('POST', 'auth/login', { email, password, role, rememberMe }); this.identity.set(me); return me; }
  async logout(): Promise<void> { await this.request('POST', 'auth/logout', {}); this.identity.set(null); }
  landing(me = this.identity()): string {
    if (!me) return '/auth/login';
    if (me.mustChangePassword || me.needsMfa || me.needsMfaSetup) return '/auth/security';
    if (me.selectedRole === 'SUPER_ADMIN' || me.platformAdmin) return '/super-admin';
    const routes: Record<string, string> = { HEADMASTER: '/head/dashboard', REGISTRAR: '/register/page', ACADEMIC: '/academic/dashboard', TEACHER: '/teacher', BURSAR: '/bursar/page' };
    return routes[me.selectedRole] || routes[me.memberships[0]?.role] || '/auth/login';
  }
  loginError(error: unknown, role: string): string { return error instanceof HttpErrorResponse && error.status === 401 ? `We couldn't sign you in as ${role}. Check your email and password, or ask your administrator to confirm your access.` : this.error(error); }
  error(error: unknown): string { return requestErrorMessage(error); }
}
