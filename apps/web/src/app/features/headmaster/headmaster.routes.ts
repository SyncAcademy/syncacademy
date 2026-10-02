import { Routes } from '@angular/router';
import { HeadmasterLayout } from './headmaster.layout';

export const HEADMASTER_ROUTES: Routes = [
  {
    path: '',
    component: HeadmasterLayout,
    children: [
 {path:'students',loadComponent:()=>import('../registrar/registrar.page').then(m=>m.RegistrarPage),data:{title:'Students',breadcrumb:'Headmaster / Students',section:'students'}},
      { path: 'school-setup', loadComponent: () => import('./school-setup.page').then(m => m.SchoolSetupPage), data: { title: 'School Setup', breadcrumb: 'Headmaster / Settings / School Setup' } },
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
        loadComponent: () => import('./head-oversight.page').then(m => m.HeadOversightPage),
        data: { title: 'Teaching Assignments', breadcrumb: 'Headmaster / Teaching Assignments', section: 'teaching-assignments' },
      },
      {
        path: 'reports/send',
        loadComponent: () => import('./pages/head-reports/head-reports.page').then(m => m.HeadReportsPage),
        data: { title: 'Send Reports', breadcrumb: 'Headmaster / Reports / Send', mode: 'send' },
      },
      {
        path: 'reports/delivery',
        loadComponent: () => import('./pages/head-reports/head-reports.page').then(m => m.HeadReportsPage),
        data: { title: 'Parent Delivery Center', breadcrumb: 'Headmaster / Reports / Delivery', mode: 'delivery' },
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
