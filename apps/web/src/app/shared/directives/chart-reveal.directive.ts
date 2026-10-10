import { AfterViewInit, Directive, ElementRef, NgZone, OnDestroy, inject } from '@angular/core';

/** Draw existing bar charts once they enter the viewport, including charts rendered after filtering. */
@Directive({ selector: '[appChartReveal]', standalone: true })
export class ChartRevealDirective implements AfterViewInit, OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);
  private observer?: IntersectionObserver;
  private mutations?: MutationObserver;
  private readonly selector = '.bar-track .bar-fill, .grade-track > div, .progress-bar > div, .chart-body .bar-group .bar';

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.zone.runOutsideAngular(() => {
      this.observer = new IntersectionObserver(entries => {
        for (const entry of entries) if (entry.isIntersecting) {
          const bar = entry.target as HTMLElement;
          bar.dataset['chartReveal'] = 'visible';
          this.observer?.unobserve(bar);
        }
      }, { threshold: 0.15 });
      this.mutations = new MutationObserver(() => this.scan());
      this.mutations.observe(this.host.nativeElement, { childList: true, subtree: true });
      this.scan();
    });
  }

  ngOnDestroy(): void { this.mutations?.disconnect(); this.observer?.disconnect(); }

  private scan(): void {
    for (const bar of Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>(this.selector))) {
      if (bar.dataset['chartReveal']) continue;
      bar.dataset['chartReveal'] = 'pending';
      this.observer?.observe(bar);
    }
  }
}
