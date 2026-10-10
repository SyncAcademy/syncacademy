import { Directive, ElementRef, OnDestroy, effect, inject } from '@angular/core';
import { NetworkActivityService } from '../../core/services/network-activity.service';

/** Adds an inline spinner to the button that began an HTTP action. */
@Directive({ selector: '[appActionLoading]', standalone: true })
export class ActionLoadingDirective implements OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly network = inject(NetworkActivityService);
  private readonly pending = new Set<HTMLButtonElement>();
  private readonly onClick = (event: MouseEvent) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button') : null;
    if (!button || button.disabled || button.hasAttribute('aria-busy')) return;
    const count = this.network.active();
    window.setTimeout(() => {
      if (!button.isConnected || this.network.active() <= count) return;
      button.setAttribute('aria-busy', 'true');
      this.pending.add(button);
    }, 80);
  };
  private readonly onComplete = effect(() => {
    if (this.network.active()) return;
    for (const button of this.pending) button.removeAttribute('aria-busy');
    this.pending.clear();
  });

  constructor() { this.host.nativeElement.addEventListener('click', this.onClick, true); }
  ngOnDestroy(): void {
    this.host.nativeElement.removeEventListener('click', this.onClick, true);
    this.onComplete.destroy();
    for (const button of this.pending) button.removeAttribute('aria-busy');
  }
}
