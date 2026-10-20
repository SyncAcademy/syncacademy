import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TransientMessagesDirective } from './shared/directives/transient-messages.directive';
import { NetworkActivityService } from './core/services/network-activity.service';
import { ChartRevealDirective } from './shared/directives/chart-reveal.directive';
import { ActionLoadingDirective } from './shared/directives/action-loading.directive';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  hostDirectives: [TransientMessagesDirective, ChartRevealDirective, ActionLoadingDirective]
})
export class AppComponent implements OnInit {
  readonly network = inject(NetworkActivityService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private finishNavigation?: () => void;
  private slowMessageTimer?: number;
  private initializationTimeout?: number;
  private exitTimer?: number;
  showPreloader = true;
  fadePreloader = false;
  entrySlow = false;
  private routeFinished = false;

  ngOnInit(): void {
    this.routeFinished = this.router.navigated;
    this.slowMessageTimer = window.setTimeout(() => {
      if (this.showPreloader && !this.routeFinished) this.entrySlow = true;
    }, 8000);
    this.initializationTimeout = window.setTimeout(() => {
      if (!this.routeFinished) {
        this.entrySlow = true;
        this.routeFinished = true;
        this.finishEntry();
      }
    }, 15000);
    if (this.routeFinished) this.finishEntry();
    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => {
      if (event instanceof NavigationStart) {
        this.finishNavigation?.();
        this.finishNavigation = this.network.start();
      }
      if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
        this.finishNavigation?.();
        this.finishNavigation = undefined;
        this.routeFinished = true;
        this.finishEntry();
      }
    });
    this.destroyRef.onDestroy(() => {
      this.finishNavigation?.();
      if (this.slowMessageTimer) window.clearTimeout(this.slowMessageTimer);
      if (this.initializationTimeout) window.clearTimeout(this.initializationTimeout);
      if (this.exitTimer) window.clearTimeout(this.exitTimer);
    });
  }

  private finishEntry(): void {
    if (!this.routeFinished || this.fadePreloader) return;
    this.fadePreloader = true;
    if (this.slowMessageTimer) window.clearTimeout(this.slowMessageTimer);
    if (this.initializationTimeout) window.clearTimeout(this.initializationTimeout);
    this.exitTimer = window.setTimeout(() => { this.showPreloader = false; }, 500);
  }
}
