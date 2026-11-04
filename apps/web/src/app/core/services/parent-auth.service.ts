import { Injectable, inject, signal, Injector } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Preferences } from '@capacitor/preferences';
import { requestErrorMessage } from './request-error';
import { MobileOfflineStorageService, DataClassification } from './mobile-offline-storage.service';
import { NativePushService } from './native-push.service';
import { NativeKeyVaultService } from './native-key-vault.service';

export interface ParentUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
}

export interface LinkedChild {
  id: string;
  name: string;
  admissionNumber: string;
  gender: string;
  school: { id: string; name: string };
  latestClass: { id: string; name: string } | null;
  permissions: {
    reports: boolean;
    finance: boolean;
    attendance: boolean;
  };
}

export interface ParentHomeSummary {
  student: LinkedChild;
  announcements: Array<{
    id: string;
    title: string;
    body: string;
    publishedAt: string;
    media: { id: string; mimeType: string; byteSize: number; width: number; height: number } | null;
  }>;
  hasMoreAnnouncements: boolean;
  unreadNotificationCount: number;
  fees: {
    balance: number;
    totalInvoiced: number;
    totalPaid: number;
  } | null;
  attendance: {
    latestStatus: string;
    latestDate: string;
  } | null;
  resultsCount: number;
}

@Injectable({ providedIn: 'root' })
export class ParentAuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private storage = inject(MobileOfflineStorageService);
  private keyVault = inject(NativeKeyVaultService);
  private injector = inject(Injector);

  readonly isReady = signal<boolean>(false);
  readonly token = signal<string | null>(null);
  readonly parentUser = signal<ParentUser | null>(null);
  readonly children = signal<LinkedChild[]>([]);
  readonly selectedChildId = signal<string | null>(null);
  readonly isOfflineData = signal<boolean>(false);

  readonly isAuthenticated = () => !!this.token();

  constructor() {
    void this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Securely load token from encrypted auth vault
      let tokenValue = await this.storage.getSecureRecord<string>('parent_token', 'parent_auth_scope');
      if (!tokenValue) {
        // Fallback and migrate from legacy Preferences if present
        const { value } = await Preferences.get({ key: 'syncacademy_parent_token' });
        if (value) {
          tokenValue = value;
          await this.storage.setSecureRecord('parent_token', value, 'parent_auth_scope', 30 * 86400000, DataClassification.AUTH_CREDENTIALS);
          await Preferences.remove({ key: 'syncacademy_parent_token' });
        }
      }

      if (tokenValue) {
        this.token.set(tokenValue);
        await this.loadInitialData();
      }

      const savedChild = await this.storage.getPreference('syncacademy_selected_child');
      if (savedChild) {
        this.selectedChildId.set(savedChild);
      }
    } catch {
      // Fallback
    } finally {
      this.isReady.set(true);
    }
  }

  async selectChild(studentId: string): Promise<void> {
    this.selectedChildId.set(studentId);
    await this.storage.setPreference('syncacademy_selected_child', studentId);
  }

  private authHeaders(): Record<string, string> {
    const t = this.token();
    return {
      'X-Requested-With': 'SyncAcademy',
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    };
  }

  async request<T = any>(method: string, path: string, body?: unknown): Promise<T> {
    try {
      return await firstValueFrom(
        this.http.request<T>(method, '/api/v1/' + path, {
          body,
          headers: {
            ...this.authHeaders(),
            ...(method !== 'GET' ? { 'Content-Type': 'application/json' } : {}),
          },
        })
      );
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401 && !path.includes('auth/login')) {
        await this.logout();
        void this.router.navigate(['/parent/login'], { queryParams: { session: 'expired' } });
      }
      throw error;
    }
  }

  async requestBlob(path: string): Promise<Blob> {
    return await firstValueFrom(
      this.http.get('/api/v1/' + path, {
        responseType: 'blob',
        headers: this.authHeaders(),
      })
    );
  }

  async login(identifier: string, pass: string): Promise<void> {
    const res = await this.request<{ accessToken: string; tokenType: string; expiresIn: number }>(
      'POST',
      'parent/auth/login',
      { identifier, password: pass }
    );
    this.token.set(res.accessToken);
    // Store in encrypted vault, never in plaintext Preferences
    await this.storage.setSecureRecord('parent_token', res.accessToken, 'parent_auth_scope', 30 * 86400000, DataClassification.AUTH_CREDENTIALS);
    await this.loadInitialData();
  }

  async loadInitialData(): Promise<void> {
    try {
      const me = await this.request<ParentUser>('GET', 'parent/auth/me');
      this.parentUser.set(me);
      this.keyVault.setActiveUser(me.id, this.token());
      const kidsRes = await this.request<any>('GET', 'parent/children');
      const kids: LinkedChild[] = Array.isArray(kidsRes) ? kidsRes : (kidsRes?.items || []);

      // Relationship Revocation: Invalidate cached records for any previously linked child that is no longer returned
      const previousKids = (await this.storage.getSecureRecord<LinkedChild[]>('parent_children', me.id)) || [];
      for (const prev of previousKids) {
        if (!kids.some(k => k.id === prev.id)) {
          await this.storage.invalidateRevokedChild(prev.id);
        }
      }

      this.children.set(kids);
      this.isOfflineData.set(false);

      // Cache fresh data securely with 7-day TTL and classification
      await this.storage.setSecureRecord('parent_user', me, me.id, 7 * 86400000, DataClassification.CONFIDENTIAL_EDUCATIONAL);
      await this.storage.setSecureRecord('parent_children', kids, me.id, 7 * 86400000, DataClassification.CONFIDENTIAL_EDUCATIONAL);

      if (kids.length && (!this.selectedChildId() || !kids.some(k => k.id === this.selectedChildId()))) {
        await this.selectChild(kids[0].id);
      }
    } catch {
      // Fallback to locally cached data when offline
      try {
        const currentUserId = this.parentUser()?.id || '';
        if (currentUserId) {
          this.keyVault.setActiveUser(currentUserId, this.token());
        }
        const cachedUser = await this.storage.getSecureRecord<ParentUser>('parent_user', currentUserId);
        const cachedKids = await this.storage.getSecureRecord<LinkedChild[]>('parent_children', currentUserId);
        if (cachedKids && cachedKids.length) {
          if (cachedUser) this.parentUser.set(cachedUser);
          this.children.set(cachedKids);
          this.isOfflineData.set(true);
          if (cachedKids.length && (!this.selectedChildId() || !cachedKids.some(k => k.id === this.selectedChildId()))) {
            await this.selectChild(cachedKids[0].id);
          }
        }
      } catch {
        // Fallback
      }
    }
  }

  async deleteAccount(password: string): Promise<void> {
    const userId = this.parentUser()?.id;
    await this.request('POST', 'parent/auth/delete-account', { password });
    if (userId) {
      await this.storage.clearSensitiveData(userId);
    } else {
      await this.storage.clearSensitiveData();
    }
    await this.performLogoutCleanup();
  }

  async logout(): Promise<void> {
    try {
      const push = this.injector.get(NativePushService, null);
      if (push) {
        await push.unregisterToken();
      }
    } catch {
      // Ignore push unregister errors
    }

    try {
      if (this.token()) {
        await this.request('POST', 'parent/auth/logout', {});
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      await this.performLogoutCleanup();
      // Lock vault on normal logout - preserves encrypted educational records at rest
      await this.storage.lockVault();
      this.keyVault.setActiveUser(null);
    }
  }

  private async performLogoutCleanup(): Promise<void> {
    this.token.set(null);
    this.parentUser.set(null);
    this.children.set([]);
    this.selectedChildId.set(null);
    this.isOfflineData.set(false);
  }

  errorMessage(error: unknown): string {
    return requestErrorMessage(error);
  }
}
