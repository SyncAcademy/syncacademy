import { Routes } from '@angular/router';
import { parentAuthGuard } from '@core/guards/parent-auth.guard';
import { ParentLayout } from './parent.layout';

export const PARENT_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/parent-login/parent-login.page').then(m => m.ParentLoginPage),
  },
  {
    path: '',
    component: ParentLayout,
    canActivate: [parentAuthGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'home',
      },
      {
        path: 'home',
        loadComponent: () => import('./pages/parent-home/parent-home.page').then(m => m.ParentHomePage),
        data: { title: 'Parent Home' },
      },
      {
        path: 'results',
        loadComponent: () => import('./pages/parent-results/parent-results.page').then(m => m.ParentResultsPage),
        data: { title: 'Academic Results' },
      },
      {
        path: 'fees',
        loadComponent: () => import('./pages/parent-fees/parent-fees.page').then(m => m.ParentFeesPage),
        data: { title: 'Fee Records' },
      },
      {
        path: 'attendance',
        loadComponent: () => import('./pages/parent-attendance/parent-attendance.page').then(m => m.ParentAttendancePage),
        data: { title: 'Attendance Log' },
      },
      {
        path: 'announcements',
        loadComponent: () => import('./pages/parent-announcements/parent-announcements.page').then(m => m.ParentAnnouncementsPage),
        data: { title: 'School Announcements' },
      },
      {
        path: 'notifications',
        loadComponent: () => import('./pages/parent-notifications/parent-notifications.page').then(m => m.ParentNotificationsPage),
        data: { title: 'Alerts' },
      },
    ],
  },
];
