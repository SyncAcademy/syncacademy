import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PlatformAppService } from '../services/platform-app.service';

export const rootAppGuard: CanActivateFn = async () => {
  const platformApp = inject(PlatformAppService);
  const router = inject(Router);

  // Wait if initialization is still in flight
  if (!platformApp.isInitialized()) {
    await new Promise<void>(resolve => {
      const check = setInterval(() => {
        if (platformApp.isInitialized()) {
          clearInterval(check);
          resolve();
        }
      }, 30);
    });
  }

  const flavor = platformApp.appFlavor();
  if (flavor === 'parent') {
    return router.createUrlTree(['/parent']);
  }
  if (flavor === 'teacher') {
    return router.createUrlTree(['/teacher']);
  }
  return true;
};
