import { inject } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { SchoolApiService } from '../../../../core/services/school-api.service';
import { Component, signal } from '@angular/core';
import { NgFor } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MenuController } from '@ionic/angular';
import { SidebarResizeHandleComponent } from '../../../../shared/components/sidebar-resize-handle/sidebar-resize-handle.component';

@Component({
  selector: 'app-academic-sidebar', standalone: true,
  imports: [NgFor, RouterLink, RouterLinkActive, SidebarResizeHandleComponent],
  templateUrl: './academic-sidebar.component.html', styleUrls: ['./academic-sidebar.component.scss'],
})
export class AcademicSidebarComponent {
  selectedCampus = () => this.api.schoolName();
  navSections = [
    { label: 'DASHBOARD', items: [{ title: 'Overview', route: '/academic/dashboard', icon: 'overview' }] },
    { label: 'ACADEMIC WORK', items: [
      { title: 'Classes & Subjects', route: '/academic/classes-subjects', icon: 'academics' },
      { title: 'Student Subjects', route: '/academic/student-subjects', icon: 'students' },
      { title: 'Teachers', route: '/academic/teachers', icon: 'teachers' },
      { title: 'Marks Review', route: '/academic/marks-review', icon: 'approvals' },
      { title: 'Assessments', route: '/academic/assessments', icon: 'gradebook' },
      { title: 'Exam Timetable', route: '/academic/timetable', icon: 'calendar' },
      { title: 'Teaching Assignments', route: '/academic/teaching-assignments', icon: 'teachers' },
      { title: 'Syllabus Coverage', route: '/academic/curriculum', icon: 'academics' },
    ] },
    { label: 'RESULTS & SUPPORT', items: [
      { title: 'Academic Reports', route: '/academic/academic-reports', icon: 'reports' },
      { title: 'Student Reports', route: '/academic/student-reports', icon: 'gradebook' },
      { title: 'Roster Issues', route: '/academic/roster-issues', icon: 'students' },
      { title: 'Student Support', route: '/academic/interventions', icon: 'communication' },
    ] },
    { label: 'SETTINGS', items: [{ title: 'Academic Years & Terms', route: '/academic/years', icon: 'calendar' }, { title: 'Academic Settings', route: '/academic/settings', icon: 'settings' }] },
  ];
  constructor(private router:Router,private menuController:MenuController) {}
  navigateTo(route: string): void { void this.router.navigate([route],{queryParamsHandling:'preserve'}).then(() => this.menuController.close('academic-menu')); }
  readonly auth=inject(AuthService); readonly api=inject(SchoolApiService); async logout():Promise<void>{try{await this.auth.logout();this.navigateTo('/auth/login');}catch(e){this.api.error.set(this.auth.error(e));}}
}
