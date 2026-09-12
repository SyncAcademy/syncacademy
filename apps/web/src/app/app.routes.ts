import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';

export const routes: Routes = [
  { 
    path: '', 
    loadComponent: () => import('@features/landing/landing.page').then(m => m.LandingPage) 
  },
  { 
    path: 'auth', 
    loadChildren: () => import('@features/auth/auth.routes').then(m => m.AUTH_ROUTES) 
  },
  { 
    path: 'dashboard', 
    loadChildren: () => import('@features/dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES) 
  },
  { path: '**', redirectTo: '' }
];
