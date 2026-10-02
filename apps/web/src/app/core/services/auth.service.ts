import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
export interface Identity { id: string; name: string; email: string; selectedRole: string; platformAdmin: boolean; mustChangePassword: boolean; needsMfa: boolean; needsMfaSetup: boolean; mfaEnabled: boolean; memberships: { id: string; role: string; school: { id: string; name: string } }[]; }
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  readonly identity = signal<Identity | null>(null);
  readonly isLoggedIn = () => !!this.identity();
  request<T = any>(method: string, path: string, body?: unknown, idempotencyKey?: string): Promise<T> {
    return firstValueFrom(this.http.request<T>(method, '/api/v1/' + path, { body, headers: { 'X-Requested-With': 'SyncAcademy', ...(method !== 'GET' ? { 'Content-Type': 'application/json' } : {}), ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) } }));
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
  error(error: unknown): string { return error instanceof HttpErrorResponse ? (error.status === 0 ? 'Cannot reach the server. Check your connection and try again.' : error.error?.message || 'The request failed. Try again.') : 'Something went wrong. Please try again.'; }
}
