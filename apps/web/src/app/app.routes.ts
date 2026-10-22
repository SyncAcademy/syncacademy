import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';
const auth=()=>import('./features/live/auth.page').then(m=>m.LiveAuthPage);
export const routes:Routes=[
 {path:'',pathMatch:'full',loadComponent:()=>import('./features/landing/landing.page').then(m=>m.LandingPage)},
 {path:'faq',loadComponent:()=>import('./features/faq/faq.page').then(m=>m.FaqPage)},
 {path:'request-demo',loadComponent:()=>import('./features/landing/demo-request.page').then(m=>m.DemoRequestPage)},
 {path:'privacy',loadComponent:()=>import('./features/legal/legal.page').then(m=>m.LegalPage),data:{document:'privacy'}},
 {path:'terms',loadComponent:()=>import('./features/legal/legal.page').then(m=>m.LegalPage),data:{document:'terms'}},
 {path:'r/:token',loadComponent:()=>import('./features/public/report-viewer.page').then(m=>m.ReportViewerPage)},
 {path:'auth/login',loadComponent:()=>import('./features/auth/pages/login/login.page').then(m=>m.LoginPage)},
 {path:'auth/sign-in/:role',loadComponent:()=>import('./features/auth/pages/login/login.page').then(m=>m.LoginPage)},
 ...['recover','reset','invitation','security'].map(mode=>({path:'auth/'+mode,loadComponent:auth,data:{mode}})),
 {path:'auth/register',redirectTo:'auth/invitation',pathMatch:'full'}, {path:'auth/forgot-password',redirectTo:'auth/recover',pathMatch:'full'}, {path:'auth',redirectTo:'auth/login',pathMatch:'full'},
 {path:'super-admin',canActivate:[authGuard],canActivateChild:[authGuard],data:{role:'SUPER_ADMIN'},loadChildren:()=>import('./features/super-admin/super-admin.routes').then(m=>m.SUPER_ADMIN_ROUTES)},
 {path:'head',canActivate:[authGuard],canActivateChild:[authGuard],data:{role:'HEADMASTER'},loadChildren:()=>import('./features/headmaster/headmaster.routes').then(m=>m.HEADMASTER_ROUTES)},
 {path:'register',canActivate:[authGuard],canActivateChild:[authGuard],data:{role:'REGISTRAR'},loadChildren:()=>import('./features/registrar/registrar.routes').then(m=>m.REGISTRAR_ROUTES)},
 {path:'academic',canActivate:[authGuard],canActivateChild:[authGuard],data:{role:'ACADEMIC'},loadChildren:()=>import('./features/academic/academic.routes').then(m=>m.ACADEMIC_ROUTES)},
 {path:'teacher',canActivate:[authGuard],canActivateChild:[authGuard],data:{role:'TEACHER'},loadChildren:()=>import('./features/teacher/teacher.routes').then(m=>m.TEACHER_ROUTES)},
 {path:'bursar',canActivate:[authGuard],canActivateChild:[authGuard],data:{role:'BURSAR'},loadChildren:()=>import('./features/bursar/bursar.routes').then(m=>m.BURSAR_ROUTES)},
 {path:'workspace',canActivate:[authGuard],data:{roles:['SUPER_ADMIN','HEADMASTER','REGISTRAR','ACADEMIC','TEACHER','BURSAR']},loadComponent:()=>import('./features/live/workspace.page').then(m=>m.WorkspacePage)},
 {path:'**',redirectTo:'auth/login'}];
