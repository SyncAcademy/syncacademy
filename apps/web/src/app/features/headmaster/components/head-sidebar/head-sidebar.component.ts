import { inject } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { SchoolApiService } from '../../../../core/services/school-api.service';
import { Component, signal } from '@angular/core';
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
  selector: 'app-head-sidebar',
  standalone: true,
  imports: [NgFor, RouterLink, RouterLinkActive, SidebarResizeHandleComponent],
  templateUrl: './head-sidebar.component.html',
  styleUrls: ['./head-sidebar.component.scss'],
})
export class HeadSidebarComponent {
  selectedCampus = () => this.api.schoolName();

  constructor(private router:Router,private menuController:MenuController) {}

  navigateTo(route: string): void {
    void this.router.navigate([route],{queryParamsHandling:'preserve'}).then(() => {
      void this.menuController.close('head-menu');
    });
  }

  readonly auth=inject(AuthService); readonly api=inject(SchoolApiService); async logout():Promise<void>{try{await this.auth.logout();this.navigateTo('/auth/login');}catch(e){this.api.error.set(this.auth.error(e));}}

  navSections: NavSection[] = [
    {
      label: 'DASHBOARD',
      items: [
        { title: 'Overview', route: '/head/dashboard', icon: 'overview' },
        { title: 'Staff Activity', route: '/head/activity', icon: 'notifications' },
      ],
    },
    {
      label: 'SCHOOL SETUP',
      items: [
        { title: 'Academic Years', route: '/head/academic-years', icon: 'calendar' },
        { title: 'Classes & Subjects', route: '/head/classes-subjects', icon: 'classes' },
      ],
    },
    {
      label: 'STUDENT MANAGEMENT',
      items: [
        { title: 'Student Directory', route: '/head/students', icon: 'students' },
          { title: 'Bulk Import', route: '/head/import', icon: 'students' },
        { title: 'Subject Setup', route: '/head/subjects', icon: 'academics' },
        { title: 'Roster Issues', route: '/head/roster-issues', icon: 'communication' },
        { title: 'Class Lists', route: '/head/class-lists', icon: 'classes' },
        { title: 'Admissions', route: '/head/admissions', icon: 'invite' },
      ],
    },
    {
      label: 'STAFF MANAGEMENT',
      items: [
        { title: 'Staff Directory', route: '/head/staff', icon: 'teachers' },
        { title: 'Invite Staff', route: '/head/staff/invite', icon: 'invite' },
        { title: 'Pending Approvals', route: '/head/staff/pending', icon: 'approvals' },
      ],
    },
    {
      label: 'ACADEMICS',
      items: [
        { title: 'Academic Results', route: '/head/academic-results', icon: 'gradebook' },
        { title: 'Academic Progress', route: '/head/academic-progress', icon: 'academics' },
        { title: 'Teaching Assignments', route: '/head/teaching-assignments', icon: 'assignments' },
      ],
    },
    { label: 'FINANCE', items: [{ title: 'Finance Overview', route: '/head/finance', icon: 'payments' }] },
    { label: 'COMMUNICATION', items: [{ title: 'Announcements', route: '/head/announcements', icon: 'communication' }] },
    {
      label: 'REPORTS',
      items: [        { title: 'Reports Overview', route: '/head/reports', icon: 'reports' },
      ],
    },
    {
      label: 'SETTINGS',
      items: [{ title: 'Settings', route: '/head/settings', icon: 'settings' }],
    },
  ];
}
