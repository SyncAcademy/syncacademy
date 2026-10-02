import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SuperAdminStore } from '../../super-admin.store';

@Component({
  selector: 'app-sa-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './sa-dashboard.page.html',
  styleUrls: ['./sa-dashboard.page.scss'],
})
export class SaDashboardPage {
  store = inject(SuperAdminStore);

  readonly money = this.store.money.bind(this.store);
  readonly timeSince = this.store.timeSince.bind(this.store);

}
