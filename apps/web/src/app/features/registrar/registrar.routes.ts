import { Routes } from '@angular/router';
import { RegistrarLayout } from './registrar.layout';
import { REGISTRAR_PAGES } from './registrar.navigation';

export const REGISTRAR_ROUTES: Routes = [{ path: '', component: RegistrarLayout, children: [
  ...REGISTRAR_PAGES.map(page => ({ path: page.path,
    loadComponent: () => import('./registrar.page').then(m => m.RegistrarPage),
    data: { title: page.title, breadcrumb: `Registrar / ${page.title}`, section: page.path },
  })),
  { path: 'dashboard', redirectTo: 'page', pathMatch: 'full' },
  { path: '', redirectTo: 'page', pathMatch: 'full' },
] }];
