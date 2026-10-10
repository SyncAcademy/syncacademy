import { Routes } from '@angular/router';
import { AcademicLayout } from './academic.layout';

export const ACADEMIC_PAGES = [
  { path: 'subjects', title: 'Subject Setup', icon: 'academics', group: 'ACADEMIC WORK' },
  { path: 'class-lists', title: 'Class Lists', icon: 'students', group: 'ACADEMIC WORK' },
  { path: 'students', title: 'Student Directory', icon: 'students', group: 'ACADEMIC WORK' },
  { path: 'student-subjects', title: 'Student Subjects', icon: 'academics', group: 'ACADEMIC WORK' },
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
  { path: 'years', title: 'Academic Years & Terms', icon: 'calendar', group: 'SETTINGS' },
];

export const ACADEMIC_ROUTES: Routes = [{
  path: '', component: AcademicLayout, children: [
    { path: 'notifications', loadComponent: () => import('../../shared/notifications/notifications.page').then(m => m.NotificationsPage), data: { title: 'Notifications', breadcrumb: 'Academic Master / Notifications', audience: 'academic' } },
    { path: 'academic-reports/class/:classId', loadComponent: () => import('./class-results.page').then(m => m.ClassResultsPage), data: { title: 'Class Results', breadcrumb: 'Academic Master / Academic Reports / Class Results', audience: 'academic' } },
    { path: 'years', loadComponent: () => import('../headmaster/pages/head-academic-years/head-academic-years.page').then(m => m.HeadAcademicYearsPage), data: { title: 'Academic Years & Terms', breadcrumb: 'Academic Master / Academic Years & Terms' } },
    ...ACADEMIC_PAGES.filter(page => page.path !== 'years').map(page => ({ path: page.path,
      loadComponent: () => page.path === 'student-subjects' ? import('./student-subjects.page').then(m => m.StudentSubjectsPage) : page.path === 'subjects' ? import('../registrar/subject-setup.page').then(m => m.SubjectSetupPage) : page.path === 'roster-issues' ? import('../registrar/roster-issues.page').then(m => m.RosterIssuesPage) : ['class-lists', 'students'].includes(page.path) ? import('../registrar/registrar.page').then(m => m.RegistrarPage) : ['classes-subjects', 'teachers', 'settings'].includes(page.path) ? import('./academic-setup.page').then(m => m.AcademicSetupPage) : import('./academic.page').then(m => m.AcademicPage),
      data: { title: page.title, breadcrumb: `Academic Master / ${page.title}`, section: page.path, ...(page.path === 'student-subjects' ? { audience: 'academic' } : {}) },
    })),
    { path: 'page', redirectTo: 'dashboard', pathMatch: 'full' },
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  ],
}];
