import { Injectable, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { SplashScreen } from '@capacitor/splash-screen';
import { PlatformAppService } from './platform-app.service';

/**
 * Genuine native mobile platform integration for SyncAcademy Teacher and Parent apps.
 * Manages native navigation, system back button, status bar, keyboard resizing,
 * app lifecycle transitions, deep linking, and splash screen hiding.
 */
@Injectable({ providedIn: 'root' })
export class NativeMobileService {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly platformApp = inject(PlatformAppService);

  readonly isNative = signal<boolean>(Capacitor.isNativePlatform());
  readonly isAndroid = signal<boolean>(Capacitor.getPlatform() === 'android');
  readonly isIos = signal<boolean>(Capacitor.getPlatform() === 'ios');
  readonly isKeyboardVisible = signal<boolean>(false);
  readonly isOnline = signal<boolean>(typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' ? navigator.onLine : true);

  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    // 1. Network connectivity listeners
    window.addEventListener('online', () => this.isOnline.set(true));
    window.addEventListener('offline', () => this.isOnline.set(false));

    if (!Capacitor.isNativePlatform()) return;

    try {
      // 2. Status bar styling and safe areas
      await this.configureStatusBar();

      // 3. Android hardware system back button handling
      await this.configureBackButton();

      // 4. Keyboard handling
      await this.configureKeyboard();

      // 5. App lifecycle transitions (background/foreground)
      await this.configureAppLifecycle();

      // 6. Deep linking / verified app URL handling
      await this.configureDeepLinks();

      // 7. Hide splash screen once initialized
      await SplashScreen.hide().catch(() => undefined);
    } catch {
      // Graceful degradation on unsupported platforms or emulators
    }
  }

  private async configureStatusBar(): Promise<void> {
    try {
      if (this.isAndroid()) {
        await StatusBar.setOverlaysWebView({ overlay: false });
        // Parent app uses navy dark primary (#0F172A), Teacher app uses school/dark bar
        const isParent = this.platformApp.appFlavor() === 'parent';
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: isParent ? '#0F172A' : '#1E293B' });
      } else if (this.isIos()) {
        await StatusBar.setStyle({ style: Style.Dark });
      }
    } catch {
      // Fallback
    }
  }

  private async configureBackButton(): Promise<void> {
    if (!this.isAndroid()) return;

    try {
      await App.addListener('backButton', ({ canGoBack }) => {
        // If an open modal or alert dialog is present, close it first
        const openModal = document.querySelector('ion-modal.show-modal, .app-dialog-open, dialog[open]');
        if (openModal) {
          const closeButton = openModal.querySelector<HTMLButtonElement>('.dialog-close, [data-action="close"], .btn-cancel');
          if (closeButton) {
            closeButton.click();
            return;
          }
        }

        const currentUrl = this.router.url;
        const isRootPage =
          currentUrl === '/' ||
          currentUrl === '/parent' ||
          currentUrl === '/parent/home' ||
          currentUrl === '/parent/login' ||
          currentUrl === '/teacher' ||
          currentUrl === '/auth/login';

        if (isRootPage) {
          // If on root page of either app, exit the application
          void App.exitApp();
        } else if (canGoBack) {
          this.location.back();
        } else {
          // Fallback to top-level destination
          const fallback = this.platformApp.appFlavor() === 'parent' ? '/parent/home' : '/teacher';
          void this.router.navigate([fallback]);
        }
      });
    } catch {
      // Fallback
    }
  }

  private async configureKeyboard(): Promise<void> {
    try {
      await Keyboard.addListener('keyboardWillShow', () => {
        this.isKeyboardVisible.set(true);
      });

      await Keyboard.addListener('keyboardWillHide', () => {
        this.isKeyboardVisible.set(false);
      });
    } catch {
      // Fallback
    }
  }

  private async configureAppLifecycle(): Promise<void> {
    try {
      await App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          this.isOnline.set(typeof navigator.onLine === 'boolean' ? navigator.onLine : true);
        }
      });
    } catch {
      // Fallback
    }
  }

  private async configureDeepLinks(): Promise<void> {
    try {
      await App.addListener('appUrlOpen', (event) => {
        const urlString = event.url;
        if (!urlString) return;

        try {
          const parsed = new URL(urlString);
          const path = parsed.pathname;

          // Permitted deep-link targets:
          // /r/:token -> Public report viewer
          // /parent/activate -> Parent invitation activation
          // /auth/invitation -> Staff invitation acceptance
          if (
            path.startsWith('/r/') ||
            path.startsWith('/parent/activate') ||
            path.startsWith('/auth/invitation') ||
            path.startsWith('/parent/') ||
            path.startsWith('/teacher')
          ) {
            const queryParams: Record<string, string> = {};
            parsed.searchParams.forEach((val, key) => { queryParams[key] = val; });
            void this.router.navigate([path], { queryParams });
          }
        } catch {
          // Ignore malformed deep links
        }
      });
    } catch {
      // Fallback
    }
  }
}

