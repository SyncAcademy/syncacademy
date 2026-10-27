import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ParentAuthService } from '../services/parent-auth.service';

export const parentAuthGuard: CanActivateFn = async () => {
  const auth = inject(ParentAuthService);
  const router = inject(Router);

  // Wait for initial storage check if not yet completed
  if (!auth.isReady()) {
    await new Promise<void>(resolve => {
      const check = setInterval(() => {
        if (auth.isReady()) {
          clearInterval(check);
          resolve();
        }
      }, 50);
    });
  }

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/parent/login']);
  }

  return true;
};
