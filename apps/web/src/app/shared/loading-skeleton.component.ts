import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading-skeleton', standalone: true,
  template: `<section class="loading-skeleton" [attr.aria-label]="label" aria-busy="true">
    <div class="loading-skeleton__heading"><span class="loading-skeleton__line loading-skeleton__line--title"></span><span class="loading-skeleton__line loading-skeleton__line--subtitle"></span></div>
    <div class="loading-skeleton__cards"><span></span><span></span><span></span></div>
    <div class="loading-skeleton__table"><span></span><span></span><span></span><span></span><span></span></div>
    <p class="loading-skeleton__label">{{ label }}</p>
  </section>`,
})
export class LoadingSkeletonComponent { @Input() label = 'Loading records…'; }
