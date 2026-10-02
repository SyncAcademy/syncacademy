import { signal } from '@angular/core';
import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SuperAdminStore } from '../../super-admin.store';

@Component({
  selector: 'app-sa-system',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sa-system.page.html',
  styleUrls: ['./sa-system.page.scss'],
})
export class SaSystemPage {
  store = inject(SuperAdminStore);
  readonly timeSince = this.store.timeSince.bind(this.store);

  readonly backupStale = computed(() => +new Date(this.store.systemHealth().lastBackup) < Date.now() - 86400000);
  readonly health = computed(() => this.store.systemHealth());
  readonly storagePercent = computed(() => {
    const h = this.health();
    return Math.round((h.storageUsedGb / h.storageCapacityGb) * 100);
  });

  readonly status=signal('Checking…');readonly checkedAt=signal<Date|null>(null);constructor(){void this.check();}async check(){this.status.set('Checking…');try{await this.store.auth.request('GET','health/ready');this.status.set('Available');}catch{this.status.set('Unavailable');}this.checkedAt.set(new Date());}
}
