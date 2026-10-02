import { inject } from '@angular/core';
import { TeacherClassStore } from './teacher-class.store';
import { Routes, Router } from '@angular/router';
import { TeacherLayout } from './teacher.layout';

export const TEACHER_ROUTES: Routes = [
  {
    path: '',
    component: TeacherLayout,
    children: [
      { path: 'subject-performance', loadComponent: () => import('./teacher-class.page').then(m => m.TeacherClassPage), data: { title: 'Subject Performance', breadcrumb: 'Teacher / Subject Performance', section: 'subject-performance' } },
      ...[{ path: 'my-class', title: 'Class Overview', section: 'class-overview' }, { path: 'my-class/attendance', title: 'Attendance', section: 'attendance' }, { path: 'my-class/performance', title: 'Class Performance', section: 'class-performance' }].map(page => ({
        path: page.path, canActivate: [() => inject(TeacherClassStore).classes().length > 0 || inject(Router).createUrlTree(['/teacher'])],
        loadComponent: () => import('./teacher-class.page').then(m => m.TeacherClassPage), data: { title: page.title, breadcrumb: `Teacher / My Class / ${page.title}`, section: page.section },
      })),
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./pages/teacher-dashboard/teacher-dashboard.page').then(m => m.TeacherDashboardPage),
        data: { title: 'My Assignments', breadcrumb: 'Teacher / Dashboard' },
      },
      {
        path: ':assignmentId/roster',
        loadComponent: () =>
          import('./pages/teacher-roster/teacher-roster.page').then(m => m.TeacherRosterPage),
        data: { title: 'Student List', breadcrumb: 'Teacher / Students' },
      },
      {
        path: ':assignmentId/marks',
        loadComponent: () =>
          import('./pages/teacher-marks/teacher-marks.page').then(m => m.TeacherMarksPage),
        data: { title: 'Mark Entry', breadcrumb: 'Teacher / Marks' },
      },
      {
        path: ':assignmentId/status',
        loadComponent: () =>
          import('./pages/teacher-status/teacher-status.page').then(m => m.TeacherStatusPage),
        data: { title: 'Submission Status', breadcrumb: 'Teacher / Status' },
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./pages/teacher-notifications/teacher-notifications.page').then(m => m.TeacherNotificationsPage),
        data: { title: 'Notifications', breadcrumb: 'Teacher / Notifications' },
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/teacher-profile/teacher-profile.page').then(m => m.TeacherProfilePage),
        data: { title: 'Profile & Settings', breadcrumb: 'Teacher / Profile' },
      },
    ],
  },
];
