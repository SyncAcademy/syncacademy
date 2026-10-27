import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, ActionPerformed } from '@capacitor/push-notifications';
import { Preferences } from '@capacitor/preferences';
import { Router } from '@angular/router';
import { ParentAuthService } from './parent-auth.service';

@Injectable({ providedIn: 'root' })
export class NativePushService {
  private parentAuth = inject(ParentAuthService);
  private router = inject(Router);

  async init(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const permission = await PushNotifications.requestPermissions();
      if (permission.receive === 'granted') {
        await PushNotifications.register();
      }

      await PushNotifications.addListener('registration', async (token: Token) => {
        await this.registerDeviceToken(token.value);
      });

      await PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        const data = action.notification.data;
        if (data?.kind === 'ANNOUNCEMENT') {
          void this.router.navigate(['/parent/announcements']);
        } else if (data?.kind === 'RESULT') {
          void this.router.navigate(['/parent/results']);
        } else {
          void this.router.navigate(['/parent/notifications']);
        }
      });
    } catch {
      // Graceful fallback on devices without Google Play or permissions
    }
  }

  private async registerDeviceToken(tokenValue: string): Promise<void> {
    if (!this.parentAuth.isAuthenticated()) return;

    try {
      let { value: installationId } = await Preferences.get({ key: 'syncacademy_installation_id' });
      if (!installationId) {
        installationId = crypto.randomUUID();
        await Preferences.set({ key: 'syncacademy_installation_id', value: installationId });
      }

      const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
      await this.parentAuth.request('POST', 'parent/push/devices', {
        installationId,
        fid: tokenValue,
        platform,
      });
    } catch {
      // Ignore background push registration failures
    }
  }
}
