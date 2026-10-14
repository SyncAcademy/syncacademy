import { Component } from '@angular/core';

@Component({
  selector: 'app-loading-skeleton', standalone: true,
  template: `<section class="loading-skeleton" aria-label="Loading content" aria-busy="true">
    <div class="loading-skeleton__heading"><span class="loading-skeleton__line loading-skeleton__line--title"></span><span class="loading-skeleton__line loading-skeleton__line--subtitle"></span></div>
    <div class="loading-skeleton__cards"><span></span><span></span><span></span></div>
    <div class="loading-skeleton__table"><span></span><span></span><span></span><span></span><span></span></div>
  </section>`,
})
export class LoadingSkeletonComponent {}
