import { Routes } from '@angular/router';
import { HeadmasterLayout } from './headmaster.layout';

export const HEADMASTER_ROUTES: Routes = [
  {
    path: '',
    component: HeadmasterLayout,
    children: [
      { path: 'announcements', loadComponent: () => import('../announcements/announcements.page').then(m => m.AnnouncementsPage), data: { title: 'Announcements', breadcrumb: 'Headmaster / Announcements' } },
      { path: 'notifications', loadComponent: () => import('../../shared/notifications/notifications.page').then(m => m.NotificationsPage), data: { title: 'Notifications', breadcrumb: 'Headmaster / Notifications', audience: 'head' } },
      { path: 'academic-results/class/:classId', loadComponent: () => import('../academic/class-results.page').then(m => m.ClassResultsPage), data: { title: 'Class Results', breadcrumb: 'Headmaster / Academic Results / Class Results', audience: 'head' } },
      { path: 'import', loadComponent: () => import('../registrar/student-import.page').then(m => m.StudentImportPage), data: { title: 'Bulk Import' } },
      { path: 'subjects', loadComponent: () => import('../registrar/subject-setup.page').then(m => m.SubjectSetupPage), data: { title: 'Subject Setup' } },
      { path: 'roster-issues', loadComponent: () => import('../registrar/roster-issues.page').then(m => m.RosterIssuesPage), data: { title: 'Roster Issues' } },
      ...['class-lists','admissions','enrolment','transfers','progression'].map(section => ({ path: section, loadComponent: () => import('../registrar/registrar.page').then(m => m.RegistrarPage), data: { title: ({'class-lists':'Class Lists',admissions:'Admissions',enrolment:'Enrollment',transfers:'Student Movements',progression:'Year Progression'} as Record<string,string>)[section], section } })),
 {path:'students',loadComponent:()=>import('../registrar/registrar.page').then(m=>m.RegistrarPage),data:{title:'Students',breadcrumb:'Headmaster / Students',section:'students'}},
      { path: 'school-setup', loadComponent: () => import('./school-setup.page').then(m => m.SchoolSetupPage), data: { title: 'School Setup', breadcrumb: 'Headmaster / Settings / School Setup' } },
      { path: 'finance', loadComponent: () => import('./head-oversight.page').then(m => m.HeadOversightPage), data: { title: 'Finance Overview', breadcrumb: 'Headmaster / Finance', section: 'finance' } },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings.page').then(m => m.SettingsPage),
        data: { title: 'Settings', breadcrumb: 'Headmaster / Settings' },
      },      { path: 'academic-results', loadComponent: () => import('./head-oversight.page').then(m => m.HeadOversightPage), data: { title: 'Academic Results', breadcrumb: 'Headmaster / Academic Results', section: 'academic-results' } },
      { path: 'academic-progress', loadComponent: () => import('./head-oversight.page').then(m => m.HeadOversightPage), data: { title: 'Academic Progress', breadcrumb: 'Headmaster / Academic Progress', section: 'academic-progress' } },
      { path: 'activity', loadComponent: () => import('./head-oversight.page').then(m => m.HeadOversightPage), data: { title: 'Staff Activity', breadcrumb: 'Headmaster / Staff Activity', section: 'activity' } },
      {
        path: 'dashboard',
        loadComponent: () => import('./head-oversight.page').then(m => m.HeadOversightPage),
        data: { title: 'School Overview', breadcrumb: 'Headmaster / School Overview', section: 'overview' },
      },
      {
        path: 'academic-years',
        loadComponent: () =>
          import('./pages/head-academic-years/head-academic-years.page').then(m => m.HeadAcademicYearsPage),
        data: { title: 'Academic Years', breadcrumb: 'Headmaster / Academic Years' },
      },
      {
        path: 'classes-subjects',
        loadComponent: () => import('./head-oversight.page').then(m => m.HeadOversightPage),
        data: { title: 'Classes & Subjects', breadcrumb: 'Headmaster / Classes & Subjects', section: 'classes-subjects' },
      },
      {
        path: 'staff',
        loadComponent: () =>
          import('./pages/head-staff/head-staff.page').then(m => m.HeadStaffPage),
        data: { title: 'Staff Directory', breadcrumb: 'Headmaster / Staff' },
      },
      {
        path: 'staff/invite',
        loadComponent: () =>
          import('./pages/head-staff-invite/head-staff-invite.page').then(m => m.HeadStaffInvitePage),
        data: { title: 'Invite Staff', breadcrumb: 'Headmaster / Staff / Invite' },
      },
      {
        path: 'staff/pending',
        loadComponent: () =>
          import('./pages/head-staff-pending/head-staff-pending.page').then(m => m.HeadStaffPendingPage),
        data: { title: 'Pending Approvals', breadcrumb: 'Headmaster / Staff / Pending' },
      },
      {
        path: 'teaching-assignments',
        loadComponent: () => import('../academic/teaching-responsibilities.page').then(m => m.TeachingResponsibilitiesPage),
        data: { title: 'Teaching Assignments', breadcrumb: 'Headmaster / Teaching Assignments', section: 'teaching-assignments' },
      },
      {
        path: 'reports/send',
        redirectTo: 'reports',
        pathMatch: 'full',
      },
      {
        path: 'reports/delivery',
        redirectTo: 'reports',
        pathMatch: 'full',
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./pages/head-reports/head-reports.page').then(m => m.HeadReportsPage),
        data: { title: 'Reports', breadcrumb: 'Headmaster / Reports' },
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
];
