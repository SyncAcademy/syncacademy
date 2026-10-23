import { inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
export const authGuard: CanActivateFn = async route => {
  const auth = inject(AuthService); const router = inject(Router);
  try {
    const me = await auth.refresh();
    if (auth.landing(me) === '/auth/security') return router.createUrlTree(['/auth/security']);
    const role = [...route.pathFromRoot].reverse().find(r=>r.data['role'])?.data['role'];
    const roles = [...route.pathFromRoot].reverse().find(r=>r.data['roles'])?.data['roles'] as string[] | undefined;
    if (role && role !== me.selectedRole) return router.createUrlTree([auth.landing(me)]);
    if (roles && !roles.includes(me.selectedRole)) return router.createUrlTree(['/auth/login']);
    return true;
  } catch (error) {
    auth.identity.set(null);
    const expired = error instanceof HttpErrorResponse && error.status === 401;
    if (!expired) return router.createUrlTree(['/auth/login']);
    const platformRoute = route.pathFromRoot.some(parent => parent.data['role'] === 'SUPER_ADMIN');
    return router.createUrlTree([platformRoute ? '/platform-access/login' : '/auth/login'], { queryParams: { session: 'expired' } });
  }
};
