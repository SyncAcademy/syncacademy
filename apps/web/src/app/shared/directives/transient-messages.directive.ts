import { AfterViewInit, Directive, ElementRef, NgZone, OnDestroy, inject } from '@angular/core';

/** Keeps feedback visible briefly even when a page leaves its signal populated. */
@Directive({ selector: '[appTransientMessages]', standalone: true })
export class TransientMessagesDirective implements AfterViewInit, OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);
  private observer?: MutationObserver;
  private readonly active = new Map<HTMLElement, { text: string; timer: number }>();
  private readonly selector = '[role="alert"], [role="status"], .portal-notice--error, .portal-notice--success, .success-banner, .error-banner, .form-error, .form-error-banner, .form-error-box, .alert-error, .alert-success';

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.observer = new MutationObserver(() => this.scan());
      this.observer.observe(this.host.nativeElement, { subtree: true, childList: true, characterData: true });
      this.scan();
    });
  }
  ngOnDestroy(): void {
    this.observer?.disconnect();
    for (const item of this.active.values()) clearTimeout(item.timer);
    this.active.clear();
  }
  private scan(): void {
    for (const [element, item] of this.active) if (!element.isConnected) { clearTimeout(item.timer); this.active.delete(element); }
    for (const element of Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>(this.selector))) {
      if (element.closest('.notification-bell__panel')) continue;
      const text = Array.from(element.childNodes).filter(node => !(node instanceof HTMLElement && node.classList.contains('transient-message__close'))).map(node => node.textContent ?? '').join('').trim();
      if (!text || (/^(loading|working|saving|checking|exporting)\b/i.test(text) && element.getAttribute('role') === 'status')) continue;
      if (element.closest('.error-state, .alert-card') || element.classList.contains('portal-notice--warning')) continue;
      const previous = this.active.get(element);
      if (previous?.text === text) continue;
      if (previous) clearTimeout(previous.timer);
      element.hidden = false;
      const isError = element.getAttribute('role') === 'alert' || /(^|\s)([^\s]*error[^\s]*)(\s|$)/i.test(element.className);
      if (isError && !element.querySelector('.transient-message__close')) {
        const close = document.createElement('button');
        close.type = 'button'; close.className = 'transient-message__close';
        close.setAttribute('aria-label', 'Dismiss error'); close.textContent = '×';
        close.addEventListener('click', () => { element.hidden = true; });
        element.appendChild(close);
      }
      element.classList.toggle('transient-message--error', isError);
      element.classList.add('transient-message');
      const timer = window.setTimeout(() => { element.hidden = true; }, 5000);
      this.active.set(element, { text, timer });
    }
  }
}
