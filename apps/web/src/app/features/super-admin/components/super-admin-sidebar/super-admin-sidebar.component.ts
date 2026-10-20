import { AuthService } from '../../../../core/services/auth.service';
import { SchoolApiService } from '../../../../core/services/school-api.service';
import { Component, computed, inject } from '@angular/core';
import { SuperAdminStore } from '../../super-admin.store';
import { NgFor } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MenuController } from '@ionic/angular';
import { SidebarResizeHandleComponent } from '../../../../shared/components/sidebar-resize-handle/sidebar-resize-handle.component';

interface NavItem {
  title: string;
  route: string;
  icon: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

@Component({
  selector: 'app-super-admin-sidebar',
  standalone: true,
  imports: [NgFor, RouterLink, RouterLinkActive, SidebarResizeHandleComponent],
  templateUrl: './super-admin-sidebar.component.html',
  styleUrls: ['./super-admin-sidebar.component.scss'],
})
export class SuperAdminSidebarComponent {
  store = inject(SuperAdminStore);
  platformName = computed(() => this.store.settings().platformName + ' Platform');

  constructor(private router:Router,private menuController:MenuController) {}

  navigateTo(route: string): void {
    void this.router.navigate([route]).then(() => {
      void this.menuController.close('super-admin-menu');
    });
  }

  readonly auth=inject(AuthService); readonly api=inject(SchoolApiService); async logout():Promise<void>{try{await this.auth.logout();this.navigateTo('/auth/login');}catch(e){this.api.error.set(this.auth.error(e));}}

  navSections: NavSection[] = [
    {
      label: 'OVERVIEW',
      items: [
        { title: 'Dashboard', route: '/super-admin', icon: 'overview' },
      ],
    },
    {
      label: 'SCHOOL MANAGEMENT',
      items: [
        { title: 'All Schools', route: '/super-admin/schools', icon: 'classes' },      ],
    },
    {
      label: 'SALES & CRM',
      items: [
        { title: 'Leads Pipeline', route: '/super-admin/leads', icon: 'invite' },
      ],
    },
    {
      label: 'PLATFORM',
      items: [
        { title: 'System Health', route: '/super-admin/system', icon: 'health' },
        { title: 'Audit Log', route: '/super-admin/audit-log', icon: 'notifications' },
        { title: 'Platform Settings', route: '/super-admin/settings', icon: 'settings' },
      ],
    },
  ];
}
