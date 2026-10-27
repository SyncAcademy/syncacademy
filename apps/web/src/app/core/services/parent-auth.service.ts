import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Preferences } from '@capacitor/preferences';
import { requestErrorMessage } from './request-error';

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

  readonly token = signal<string | null>(null);
  readonly parentUser = signal<ParentUser | null>(null);
  readonly children = signal<LinkedChild[]>([]);
  readonly selectedChildId = signal<string | null>(null);
  readonly isReady = signal<boolean>(false);

  readonly isAuthenticated = () => !!this.token();

  constructor() {
    void this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: 'syncacademy_parent_token' });
      if (value) {
        this.token.set(value);
        await this.loadInitialData();
      }
      const savedChild = await Preferences.get({ key: 'syncacademy_selected_child' });
      if (savedChild.value) {
        this.selectedChildId.set(savedChild.value);
      }
    } catch {
      // Fallback
    } finally {
      this.isReady.set(true);
    }
  }

  async selectChild(studentId: string): Promise<void> {
    this.selectedChildId.set(studentId);
    await Preferences.set({ key: 'syncacademy_selected_child', value: studentId });
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
    await Preferences.set({ key: 'syncacademy_parent_token', value: res.accessToken });
    await this.loadInitialData();
  }

  async loadInitialData(): Promise<void> {
    try {
      const me = await this.request<ParentUser>('GET', 'parent/auth/me');
      this.parentUser.set(me);
      const kids = await this.request<LinkedChild[]>('GET', 'parent/children');
      this.children.set(kids);
      if (kids.length && (!this.selectedChildId() || !kids.some(k => k.id === this.selectedChildId()))) {
        await this.selectChild(kids[0].id);
      }
    } catch {
      // Handled in request
    }
  }

  async logout(): Promise<void> {
    try {
      if (this.token()) {
        await this.request('POST', 'parent/auth/logout', {});
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      this.token.set(null);
      this.parentUser.set(null);
      this.children.set([]);
      this.selectedChildId.set(null);
      await Preferences.remove({ key: 'syncacademy_parent_token' });
      await Preferences.remove({ key: 'syncacademy_selected_child' });
    }
  }

  errorMessage(error: unknown): string {
    return requestErrorMessage(error);
  }
}
