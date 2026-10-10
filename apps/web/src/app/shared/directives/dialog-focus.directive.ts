import { AfterViewInit, Directive, ElementRef, HostListener, OnDestroy } from '@angular/core';

/** Focus containment for the portal's existing lightweight dialogs. */
@Directive({ selector: '[appDialogFocus]', standalone: true })
export class DialogFocusDirective implements AfterViewInit, OnDestroy {
  private previous = document.activeElement as HTMLElement | null;
  private timer?: ReturnType<typeof setTimeout>;
  private dialog?: HTMLDialogElement;
  private readonly cancel = (event: Event) => {
    // The component's Escape handler owns dismissal (and any save-in-progress guard).
    event.preventDefault();
  };
  constructor(private element: ElementRef<HTMLElement>) {}
  private controls(): HTMLElement[] {
    return Array.from(this.element.nativeElement.querySelectorAll<HTMLElement>(
      'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]'
    )).filter(el => el.getClientRects().length > 0);
  }
  ngAfterViewInit(): void {
    this.dialog = this.element.nativeElement.closest('dialog') ?? undefined;
    if (this.dialog) {
      this.dialog.classList.add('portal-dialog-layer');
      this.dialog.addEventListener('cancel', this.cancel);
      if (!this.dialog.open) this.dialog.showModal();
    }
    this.element.nativeElement.tabIndex = -1;
    this.timer = setTimeout(() => (this.controls()[0] ?? this.element.nativeElement).focus());
  }
  @HostListener('keydown', ['$event']) onKey(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const items = this.controls();
    if (!items.length) { event.preventDefault(); return; }
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === this.element.nativeElement)) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === this.element.nativeElement)) {
      event.preventDefault(); first.focus();
    }
  }
  ngOnDestroy(): void {
    clearTimeout(this.timer);
    this.dialog?.removeEventListener('cancel', this.cancel);
    this.dialog?.close();
    if (this.previous?.isConnected) this.previous.focus();
  }
}
