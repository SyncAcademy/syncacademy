import { Routes } from '@angular/router';
import { AcademicLayout } from './academic.layout';

export const ACADEMIC_PAGES = [
  { path: 'dashboard', title: 'Overview', icon: 'overview', group: 'DASHBOARD' },
  { path: 'classes-subjects', title: 'Classes & Subjects', icon: 'academics', group: 'ACADEMIC WORK' },
  { path: 'teachers', title: 'Teachers', icon: 'teachers', group: 'ACADEMIC WORK' },
  { path: 'marks-review', title: 'Marks Review', icon: 'approvals', group: 'ACADEMIC WORK' },
  { path: 'assessments', title: 'Assessments', icon: 'gradebook', group: 'ACADEMIC WORK' },
  { path: 'timetable', title: 'Exam Timetable', icon: 'calendar', group: 'ACADEMIC WORK' },
  { path: 'teaching-assignments', title: 'Teaching Assignments', icon: 'teachers', group: 'ACADEMIC WORK' },
  { path: 'curriculum', title: 'Syllabus Coverage', icon: 'academics', group: 'ACADEMIC WORK' },
  { path: 'academic-reports', title: 'Academic Reports', icon: 'reports', group: 'RESULTS & SUPPORT' },
  { path: 'student-reports', title: 'Student Reports', icon: 'gradebook', group: 'RESULTS & SUPPORT' },
  { path: 'roster-issues', title: 'Roster Issues', icon: 'students', group: 'RESULTS & SUPPORT' },
  { path: 'interventions', title: 'Student Support', icon: 'communication', group: 'RESULTS & SUPPORT' },
  { path: 'settings', title: 'Academic Settings', icon: 'settings', group: 'SETTINGS' },
];

export const ACADEMIC_ROUTES: Routes = [{
  path: '', component: AcademicLayout, children: [
    ...ACADEMIC_PAGES.map(page => ({ path: page.path,
      loadComponent: () => ['classes-subjects', 'teachers', 'settings'].includes(page.path) ? import('./academic-setup.page').then(m => m.AcademicSetupPage) : import('./academic.page').then(m => m.AcademicPage),
      data: { title: page.title, breadcrumb: `Academic Master / ${page.title}`, section: page.path },
    })),
    { path: 'page', redirectTo: 'dashboard', pathMatch: 'full' },
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  ],
}];
