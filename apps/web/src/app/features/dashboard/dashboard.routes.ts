import { Routes } from '@angular/router';
import { DashboardLayout } from './dashboard.layout';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    component: DashboardLayout,
    children: [
      {
        path: 'overview',
        loadComponent: () => import('./pages/overview/overview.page').then(m => m.OverviewPage),
        data: { title: 'Overview' },
      },
      {
        path: 'students',
        loadComponent: () => import('./pages/students/students.page').then(m => m.StudentsPage),
        data: { title: 'All Students' },
      },
      {
        path: 'students/:id',
        loadComponent: () => import('./pages/student-profile/student-profile.page').then(m => m.StudentProfilePage),
        data: { title: 'Student Profile' },
      },
      {
        path: 'reports',
        loadComponent: () => import('./pages/reports/reports.page').then(m => m.ReportsPage),
        data: { title: 'Reports & Institutional Analytics' },
      },
      {
        path: 'attendance',
        loadComponent: () => import('./pages/attendance/attendance.page').then(m => m.AttendancePage),
        data: { title: 'Student Attendance' },
      },
      {
        path: 'teachers',
        loadComponent: () => import('./pages/teachers/teachers.page').then(m => m.TeachersPage),
        data: { title: 'Teachers Directory' },
      },
      {
        path: 'classes',
        loadComponent: () => import('./pages/overview/overview.page').then(m => m.OverviewPage),
        data: { title: 'Classes' },
      },
      {
        path: 'gradebook',
        loadComponent: () => import('./pages/gradebook/gradebook.page').then(m => m.GradebookPage),
        data: { title: 'Gradebook' },
      },
      {
        path: 'finance',
        loadComponent: () => import('./pages/finance/finance.page').then(m => m.FinancePage),
        data: { title: 'Finance' },
      },
      {
        path: 'users',
        loadComponent: () => import('./pages/users/users.page').then(m => m.UsersPage),
        data: { title: 'Users & Roles' },
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings.page').then(m => m.SettingsPage),
        data: { title: 'School Settings' },
      },
      {
        path: '',
        redirectTo: 'overview',
        pathMatch: 'full',
      },
    ],
  },
];
