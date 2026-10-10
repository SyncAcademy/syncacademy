import { HttpInterceptorFn } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

/** Small, shared indication of slow network work; page data stays visible during refreshes. */
@Injectable({ providedIn: 'root' })
export class NetworkActivityService {
  private pending = 0;
  private showTimer?: ReturnType<typeof setTimeout>;
  private slowTimer?: ReturnType<typeof setTimeout>;
  readonly active = signal(0);
  readonly visible = signal(false);
  readonly slow = signal(false);

  start(): () => void {
    this.pending++;
    this.active.set(this.pending);
    if (this.pending === 1) {
      this.showTimer = setTimeout(() => this.visible.set(true), 300);
      this.slowTimer = setTimeout(() => this.slow.set(true), 8000);
    }
    let ended = false;
    return () => {
      if (ended) return;
      ended = true;
      if (--this.pending === 0) {
        clearTimeout(this.showTimer);
        clearTimeout(this.slowTimer);
        this.visible.set(false);
        this.slow.set(false);
      }
      this.active.set(this.pending);
    };
  }
}

export const networkActivityInterceptor: HttpInterceptorFn = (request, next) => {
  const finish = inject(NetworkActivityService).start();
  return next(request).pipe(finalize(finish));
};
