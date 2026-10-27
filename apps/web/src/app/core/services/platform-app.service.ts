import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

export type AppFlavor = 'web' | 'parent' | 'teacher';

@Injectable({ providedIn: 'root' })
export class PlatformAppService {
  readonly isNative = signal<boolean>(Capacitor.isNativePlatform());
  readonly platform = signal<string>(Capacitor.getPlatform());
  readonly appFlavor = signal<AppFlavor>('web');
  readonly isInitialized = signal<boolean>(false);

  constructor() {
    void this.initialize();
  }

  private async initialize(): Promise<void> {
    if (typeof window === 'undefined') return;

    // Check URL or storage override for testing/dev in browser
    const params = new URLSearchParams(window.location.search);
    const paramFlavor = params.get('appFlavor') as AppFlavor | null;
    if (paramFlavor === 'parent' || paramFlavor === 'teacher') {
      this.appFlavor.set(paramFlavor);
      this.isInitialized.set(true);
      return;
    }

    if (Capacitor.isNativePlatform()) {
      try {
        const info = await App.getInfo();
        if (info.id.includes('parent')) {
          this.appFlavor.set('parent');
        } else if (info.id.includes('teacher')) {
          this.appFlavor.set('teacher');
        } else {
          this.appFlavor.set('web');
        }
      } catch {
        this.appFlavor.set('web');
      }
    } else {
      const stored = localStorage.getItem('syncacademy_app_flavor') as AppFlavor | null;
      if (stored === 'parent' || stored === 'teacher') {
        this.appFlavor.set(stored);
      } else {
        this.appFlavor.set('web');
      }
    }
    this.isInitialized.set(true);
  }

  setAppFlavor(flavor: AppFlavor): void {
    this.appFlavor.set(flavor);
    if (typeof window !== 'undefined') {
      localStorage.setItem('syncacademy_app_flavor', flavor);
    }
  }
}
