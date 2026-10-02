import { inject } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { SchoolApiService } from '../../../../core/services/school-api.service';
import { Component, signal } from '@angular/core';
import { NgFor } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MenuController } from '@ionic/angular';
import { SidebarResizeHandleComponent } from '../../../../shared/components/sidebar-resize-handle/sidebar-resize-handle.component';
import { BURSAR_PAGES } from '../../bursar.navigation';

@Component({
  selector: 'app-bursar-sidebar', standalone: true,
  imports: [NgFor, RouterLink, RouterLinkActive, SidebarResizeHandleComponent],
  templateUrl: './bursar-sidebar.component.html', styleUrls: ['./bursar-sidebar.component.scss'],
})
export class BursarSidebarComponent {
  readonly selectedCampus = () => this.api.schoolName();
  readonly navSections = [...new Set(BURSAR_PAGES.map(p => p.group))].map(label => ({ label,
    items: BURSAR_PAGES.filter(p => p.group === label).map(p => ({ ...p, route: `/bursar/${p.path}` })),
  }));
  constructor(private router:Router,private menuController:MenuController) {}
  navigateTo(route: string): void { void this.router.navigate([route],{queryParamsHandling:'preserve'}).then(() => this.menuController.close('bursar-menu')); }
  readonly auth=inject(AuthService); readonly api=inject(SchoolApiService); async logout():Promise<void>{try{await this.auth.logout();this.navigateTo('/auth/login');}catch(e){this.api.error.set(this.auth.error(e));}}
}
