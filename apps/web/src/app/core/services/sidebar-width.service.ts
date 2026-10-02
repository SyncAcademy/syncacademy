import { Inject, Injectable, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';

const DEFAULT_WIDTH = 270;
const MIN_WIDTH = 270;
const ABSOLUTE_MAX_WIDTH = 420;
const STORAGE_KEY = 'syncacademy-sidebar-width';

@Injectable({ providedIn: 'root' })
export class SidebarWidthService {
  readonly width = signal(DEFAULT_WIDTH);

  get minWidth(): number {
    return MIN_WIDTH;
  }

  get maxWidth(): number {
    const viewportWidth = this.document.defaultView?.innerWidth ?? 1280;
    return Math.max(
      MIN_WIDTH,
      Math.floor(Math.min(ABSOLUTE_MAX_WIDTH, viewportWidth * 0.35) / 10) * 10,
    );
  }

  constructor(@Inject(DOCUMENT) private document: Document) {
    const storage = this.document.defaultView?.localStorage;
    let savedWidth = DEFAULT_WIDTH;

    try {
      const storedValue = storage?.getItem(STORAGE_KEY);
      if (storedValue) savedWidth = Number(storedValue);
    } catch {
      savedWidth = DEFAULT_WIDTH;
    }

    this.setWidth(savedWidth, false);
    this.document.defaultView?.addEventListener('resize', () => {
      this.setWidth(this.width(), false);
    });
  }

  setWidth(value: number, persist = true): void {
    const width = Math.min(this.maxWidth, Math.max(MIN_WIDTH, Math.round(value / 10) * 10));
    this.width.set(width);
    this.document.documentElement.style.setProperty('--sidebar-size', `${width}px`);

    if (persist) {
      try {
        this.document.defaultView?.localStorage.setItem(STORAGE_KEY, String(width));
      } catch {
        // Keep the in-session preference when browser storage is unavailable.
      }
    }
  }
}