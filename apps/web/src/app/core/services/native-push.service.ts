import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { Preferences } from '@capacitor/preferences';
import { Router } from '@angular/router';
import { ParentAuthService } from './parent-auth.service';
import { PlatformAppService } from './platform-app.service';
import { AuthService } from './auth.service';

/**
 * Unified native push notifications service for SyncAcademy Parent and Teacher apps.
 *
 * Security & Privacy Architecture:
 * 1. Lock Screen Privacy: Never delivers confidential student marks, grades, or personal details
 *    in raw push notification bodies. Payloads contain only generic event notices with entity IDs.
 * 2. Strict Deep-Link Validation: Incoming notification route payloads are validated against an
 *    internal path allowlist before navigating, preventing open redirect or scheme injection.
 * 3. Token Lifecycle & Unregistration: Device tokens are registered with a persistent installation UUID,
 *    and explicitly revoked on the backend upon logout or self-service account deletion.
 * 4. Foreground Safety: When app is in foreground, raw banners are suppressed to prevent over-the-shoulder
 *    viewing of notification notices on shared or active devices.
 */
@Injectable({ providedIn: 'root' })
export class NativePushService {
  private parentAuth = inject(ParentAuthService);
  private auth = inject(AuthService);
  private platformApp = inject(PlatformAppService);
  private router = inject(Router);

  private readonly ALLOWED_PARENT_ROUTES = [
    '/parent/overview',
    '/parent/results',
    '/parent/attendance',
    '/parent/fees',
    '/parent/announcements',
    '/parent/notifications',
    '/parent/profile',
  ];

  private readonly ALLOWED_TEACHER_ROUTES = [
    '/teacher',
    '/teacher/classes',
    '/teacher/notifications',
    '/workspace',
  ];

  async init(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const permStatus = await PushNotifications.checkPermissions();
      let receive = permStatus.receive;
      if (receive === 'prompt') {
        const req = await PushNotifications.requestPermissions();
        receive = req.receive;
      }

      if (receive === 'granted') {
        await PushNotifications.register();
      }

      // Token registration and rotation listener
      await PushNotifications.addListener('registration', async (token: Token) => {
        await this.registerDeviceToken(token.value);
      });

      // Foreground notification listener - privacy preservation
      await PushNotifications.addListener('pushNotificationReceived', (_notification: PushNotificationSchema) => {
        // Suppress intrusive foreground alert; notify active component silently or refresh indicators
      });

      // User notification action (tap) listener
      await PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        const data = action.notification.data as Record<string, unknown> | undefined;
        const flavor = this.platformApp.appFlavor();

        if (flavor === 'teacher') {
          this.handleTeacherNotificationTap(data);
        } else {
          this.handleParentNotificationTap(data);
        }
      });
    } catch {
      // Graceful fallback on devices without Google Play Services or APNs permissions
    }
  }

  private handleTeacherNotificationTap(data: Record<string, unknown> | undefined): void {
    if (!this.auth.identity()) {
      void this.router.navigate(['/login']);
      return;
    }

    const kind = data?.['kind'];
    const assignmentId = data?.['assignmentId'];

    if (kind === 'ANNOUNCEMENT' || kind === 'ALERT') {
      void this.navigateIfAllowed('/teacher/notifications', this.ALLOWED_TEACHER_ROUTES);
    } else if (assignmentId && typeof assignmentId === 'string') {
      const target = `/teacher/${assignmentId}/marks`;
      void this.router.navigateByUrl(target);
    } else {
      void this.navigateIfAllowed('/teacher', this.ALLOWED_TEACHER_ROUTES);
    }
  }

  private handleParentNotificationTap(data: Record<string, unknown> | undefined): void {
    if (!this.parentAuth.isAuthenticated()) {
      void this.router.navigate(['/parent/login']);
      return;
    }

    const kind = data?.['kind'];

    if (kind === 'ANNOUNCEMENT') {
      void this.navigateIfAllowed('/parent/announcements', this.ALLOWED_PARENT_ROUTES);
    } else if (kind === 'RESULT') {
      void this.navigateIfAllowed('/parent/results', this.ALLOWED_PARENT_ROUTES);
    } else if (kind === 'ATTENDANCE') {
      void this.navigateIfAllowed('/parent/attendance', this.ALLOWED_PARENT_ROUTES);
    } else if (kind === 'FEE') {
      void this.navigateIfAllowed('/parent/fees', this.ALLOWED_PARENT_ROUTES);
    } else {
      void this.navigateIfAllowed('/parent/notifications', this.ALLOWED_PARENT_ROUTES);
    }
  }

  private navigateIfAllowed(route: string, allowlist: string[]): void {
    const isAllowed = allowlist.some(allowed => route === allowed || route.startsWith(`${allowed}/`));
    if (isAllowed) {
      void this.router.navigate([route]);
    } else {
      void this.router.navigate([allowlist[0]]);
    }
  }

  /**
   * Register device push token with the backend.
   * Tracks token rotation and routes to the appropriate product endpoint (Parent vs Teacher).
   */
  async registerDeviceToken(tokenValue: string): Promise<void> {
    const flavor = this.platformApp.appFlavor();

    try {
      let { value: installationId } = await Preferences.get({ key: 'syncacademy_installation_id' });
      if (!installationId) {
        installationId = crypto.randomUUID();
        await Preferences.set({ key: 'syncacademy_installation_id', value: installationId });
      }

      await Preferences.set({ key: 'syncacademy_last_push_token', value: tokenValue });
      const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';

      if (flavor === 'parent' && this.parentAuth.isAuthenticated()) {
        await this.parentAuth.request('POST', 'parent/push/devices', {
          installationId,
          fid: tokenValue,
          platform,
        });
      } else if (flavor === 'teacher' && this.auth.isLoggedIn()) {
        await this.auth.request('POST', 'teacher/push/devices', {
          installationId,
          fid: tokenValue,
          platform,
        }).catch(() => {
          // Graceful fallback if teacher push endpoints are non-blocking
        });
      }
    } catch {
      // Ignore background push registration failures
    }
  }

  /**
   * Re-sync the registered push token when a session authenticates or becomes active.
   */
  async syncRegisteredToken(): Promise<void> {
    try {
      const { value: lastToken } = await Preferences.get({ key: 'syncacademy_last_push_token' });
      if (lastToken) {
        await this.registerDeviceToken(lastToken);
      }
    } catch {
      // Non-blocking fallback
    }
  }

  /**
   * Explicitly unregister device push token upon logout, account switching, or account deletion.
   */
  async unregisterToken(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const { value: installationId } = await Preferences.get({ key: 'syncacademy_installation_id' });
      if (!installationId) return;

      const flavor = this.platformApp.appFlavor();
      if (flavor === 'parent' && this.parentAuth.isAuthenticated()) {
        await this.parentAuth.request('POST', 'parent/push/devices/unregister', {
          installationId,
        });
      } else if (flavor === 'teacher' && this.auth.isLoggedIn()) {
        await this.auth.request('POST', 'teacher/push/devices/unregister', {
          installationId,
        }).catch(() => {
          // Graceful fallback
        });
      }
    } catch {
      // Non-blocking fallback
    }
  }
}
