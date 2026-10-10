import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SuperAdminStore } from '../../super-admin.store';

@Component({ selector: 'app-sa-system', standalone: true, imports: [CommonModule], templateUrl: './sa-system.page.html', styleUrls: ['./sa-system.page.scss'] })
export class SaSystemPage {
  readonly store = inject(SuperAdminStore);
  readonly status = signal('Checking...');
  readonly checkedAt = signal<Date | null>(null);
  readonly mail = signal<{ queued: number; failed: number; sent: number } | null>(null);
  readonly error = signal('');
  readonly checking = signal(false);
  constructor() { void this.check(); }
  async check() {
    if (this.checking()) return;
    this.checking.set(true);
    this.status.set('Checking...'); this.error.set('');
    try {
      const data = await this.store.auth.request('GET', 'platform/health');
      this.status.set(data.status === 'ready' ? 'Available' : 'Unavailable');
      this.mail.set(data.mail);
    } catch (e) {
      this.status.set('Unavailable'); this.mail.set(null); this.error.set(this.store.auth.error(e));
    }
    this.checkedAt.set(new Date());
    this.checking.set(false);
  }
}
