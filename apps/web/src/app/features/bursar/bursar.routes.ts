import { Routes } from '@angular/router';
import { BursarLayout } from './bursar.layout';
import { BURSAR_PAGES } from './bursar.navigation';

export const BURSAR_ROUTES: Routes = [{ path: '', component: BursarLayout, children: [
  { path: 'notifications', loadComponent: () => import('../../shared/notifications/notifications.page').then(m => m.NotificationsPage), data: { title: 'Notifications', breadcrumb: 'Bursar / Notifications', audience: 'bursar' } },
  ...BURSAR_PAGES.map(page => ({ path: page.path,
    loadComponent: () => import('./bursar.page').then(m => m.BursarPage),
    data: { title: page.title, breadcrumb: `Bursar / ${page.title}`, section: page.path },
  })),
  { path: 'dashboard', redirectTo: 'page', pathMatch: 'full' },
  { path: '', redirectTo: 'page', pathMatch: 'full' },
] }];
