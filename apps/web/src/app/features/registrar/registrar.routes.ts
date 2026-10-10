import { Routes } from '@angular/router';
import { RegistrarLayout } from './registrar.layout';
import { REGISTRAR_PAGES } from './registrar.navigation';

export const REGISTRAR_ROUTES: Routes = [{ path: '', component: RegistrarLayout, children: [
  { path: 'notifications', loadComponent: () => import('../../shared/notifications/notifications.page').then(m => m.NotificationsPage), data: { title: 'Notifications', breadcrumb: 'Registrar / Notifications', audience: 'register' } },
  ...REGISTRAR_PAGES.map(page => ({ path: page.path,
    loadComponent: () => page.path === 'import' ? import('./student-import.page').then(m => m.StudentImportPage) : page.path === 'roster-issues' ? import('./roster-issues.page').then(m => m.RosterIssuesPage) : page.path === 'subjects' ? import('./subject-setup.page').then(m => m.SubjectSetupPage) : import('./registrar.page').then(m => m.RegistrarPage),
    data: { title: page.title, breadcrumb: `Registrar / ${page.title}`, section: page.path },
  })),
  { path: 'dashboard', redirectTo: 'page', pathMatch: 'full' },
  { path: '', redirectTo: 'page', pathMatch: 'full' },
] }];
