import { inject } from '@angular/core';
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
  } catch { auth.identity.set(null); return router.createUrlTree(['/auth/login']); }
};
