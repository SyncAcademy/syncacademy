import { inject } from '@angular/core';
import { TeacherClassStore } from './teacher-class.store';
import { Routes, Router } from '@angular/router';
import { TeacherLayout } from './teacher.layout';

export const TEACHER_ROUTES: Routes = [
  {
    path: '',
    component: TeacherLayout,
    children: [
      {path:'planner',loadComponent:()=>import('./teacher-work.page').then(m=>m.TeacherWorkPage),data:{title:'Teaching Planner',breadcrumb:'Teacher / Planner'}},
      {path:'support',loadComponent:()=>import('./teacher-support.page').then(m=>m.TeacherSupportPage),data:{title:'Student Support',breadcrumb:'Teacher / Student Support'}},
      { path: 'subject-performance', loadComponent: () => import('./teacher-class.page').then(m => m.TeacherClassPage), data: { title: 'Subject Performance', breadcrumb: 'Teacher / Subject Performance', section: 'subject-performance' } },
      { path: 'my-class/student-subjects', loadComponent: () => import('../academic/student-subjects.page').then(m => m.StudentSubjectsPage), data: { title: 'Student Subjects', breadcrumb: 'Teacher / My Class / Student Subjects', audience: 'teacher' } },
      { path: 'my-class/performance/:classId', loadComponent: () => import('../academic/class-results.page').then(m => m.ClassResultsPage), data: { title: 'Class Results', breadcrumb: 'Teacher / My Class / Class Results', audience: 'teacher' } },
      ...[{ path: 'my-class', title: 'Class Overview', section: 'class-overview' }, { path: 'my-class/attendance', title: 'Attendance', section: 'attendance' }, { path: 'my-class/performance', title: 'Class Performance', section: 'class-performance' }, { path: 'my-class/reports', title: 'Student Reports', section: 'class-reports' }].map(page => ({
        path: page.path,
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
        canDeactivate: [(component:any)=>component.canLeave()],
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
          import('../../shared/notifications/notifications.page').then(m => m.NotificationsPage),
        data: { title: 'Notifications', breadcrumb: 'Teacher / Notifications', audience: 'teacher' },
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/teacher-profile/teacher-profile.page').then(m => m.TeacherProfilePage),
        data: { title: 'My Profile', breadcrumb: 'Teacher / Profile' },
      },
    ],
  },
];
