import { AuthService } from '../../../../core/services/auth.service';
import { SchoolApiService } from '../../../../core/services/school-api.service';
import { Component, signal, inject, computed } from '@angular/core';
import { NgFor } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MenuController } from '@ionic/angular';
import { SidebarResizeHandleComponent } from '../../../../shared/components/sidebar-resize-handle/sidebar-resize-handle.component';

import { TeacherClassStore } from '../../teacher-class.store';

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
  selector: 'app-teacher-sidebar',
  standalone: true,
  imports: [NgFor, RouterLink, RouterLinkActive, SidebarResizeHandleComponent],
  templateUrl: './teacher-sidebar.component.html',
  styleUrls: ['./teacher-sidebar.component.scss'],
})
export class TeacherSidebarComponent {
  selectedCampus = () => this.api.schoolName();

  constructor(private router:Router,private menuController:MenuController) {}

  navigateTo(route: string): void {
    void this.router.navigate([route],{queryParamsHandling:'preserve'}).then(() => {
      void this.menuController.close('teacher-menu');
    });
  }

  readonly auth=inject(AuthService); readonly api=inject(SchoolApiService); async logout():Promise<void>{try{await this.auth.logout();this.navigateTo('/auth/login');}catch(e){this.api.error.set(this.auth.error(e));}}

  readonly classStore = inject(TeacherClassStore);
  readonly navSections = computed<NavSection[]>(() => [
    {
      label: 'DASHBOARD',
      items: [
        { title: 'My Assignments', route: '/teacher', icon: 'assignments' },
        { title: 'Subject Performance', route: '/teacher/subject-performance', icon: 'reports' },
      ],
    },
    ...(this.classStore.classes().length ? [{ label: 'MY CLASS', items: [
      { title: 'Class Overview', route: '/teacher/my-class', icon: 'students' },
      { title: 'Attendance', route: '/teacher/my-class/attendance', icon: 'calendar' },
      { title: 'Class Performance', route: '/teacher/my-class/performance', icon: 'gradebook' },
    ] }] : []),
    {
      label: 'ACCOUNT',
      items: [
        { title: 'Notifications', route: '/teacher/notifications', icon: 'notifications' },
        { title: 'Profile', route: '/teacher/profile', icon: 'profile' },
      ],
    },
  ]);
}
