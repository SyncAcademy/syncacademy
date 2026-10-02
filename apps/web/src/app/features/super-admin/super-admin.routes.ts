import { Routes } from '@angular/router';
import { SuperAdminLayout } from './super-admin.layout';

export const SUPER_ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: SuperAdminLayout,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/sa-dashboard/sa-dashboard.page').then(m => m.SaDashboardPage),
        data: { title: 'Platform Overview', breadcrumb: 'Super Admin' },
      },
      {
        path: 'schools',
        loadComponent: () =>
          import('./pages/sa-schools/sa-schools.page').then(m => m.SaSchoolsPage),
        data: { title: 'Schools Directory', breadcrumb: 'Super Admin / Schools' },
      },

      {
        path: 'leads',
        loadComponent: () =>
          import('./pages/sa-leads/sa-leads.page').then(m => m.SaLeadsPage),
        data: { title: 'Leads Pipeline', breadcrumb: 'Super Admin / Leads' },
      },
      {
        path: 'system',
        loadComponent: () =>
          import('./pages/sa-system/sa-system.page').then(m => m.SaSystemPage),
        data: { title: 'System Health', breadcrumb: 'Super Admin / System Health' },
      },
      {
        path: 'audit-log',
        loadComponent: () =>
          import('./pages/sa-audit-log/sa-audit-log.page').then(m => m.SaAuditLogPage),
        data: { title: 'Platform Audit Log', breadcrumb: 'Super Admin / Audit Log' },
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/sa-settings/sa-settings.page').then(m => m.SaSettingsPage),
        data: { title: 'Platform Settings', breadcrumb: 'Super Admin / Settings' },
      },
    ],
  },
];
