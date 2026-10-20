import 'zone.js/node';
import '@angular/compiler';
import assert from 'node:assert/strict';
import { signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, NavigationError, Router } from '@angular/router';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { Subject } from 'rxjs';
import { NetworkActivityService } from '../src/app/core/services/network-activity.service';
import { AppComponent } from '../src/app/app.component';

TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());

let nextTimerId = 1;
let timers = new Map<number, { callback: () => void; delay: number }>();
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: {
    setTimeout(callback: () => void, delay: number): number {
      const id = nextTimerId++;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimeout(id: number): void {
      timers.delete(id);
    },
  },
});

function createComponent(navigated = false): {
  component: AppComponent;
  events: { next: (event: unknown) => void };
} {
  timers = new Map();
  const observers = new Subject<unknown>();
  const router = { navigated, events: observers };
  const network = { active: signal(0), visible: signal(false), start: () => () => undefined };
  TestBed.configureTestingModule({
    providers: [
      { provide: DOCUMENT, useValue: {} },
      { provide: Router, useValue: router },
      { provide: NetworkActivityService, useValue: network },
    ],
  });
  const component = TestBed.runInInjectionContext(() => new AppComponent());
  return { component, events: observers };
}

function runTimer(delay: number): void {
  const timer = [...timers].find(([, value]) => value.delay === delay);
  assert.ok(timer, `expected a ${delay}ms timer`);
  timers.delete(timer[0]);
  timer[1].callback();
}

const initialNavigation = createComponent();
initialNavigation.component.ngOnInit();
assert.equal(initialNavigation.component.fadePreloader, false);
initialNavigation.events.next(new NavigationEnd(1, '/', '/'));
assert.equal(initialNavigation.component.fadePreloader, true, 'successful navigation starts exit immediately');
assert.equal(initialNavigation.component.showPreloader, true, 'preloader remains during its fade');
runTimer(500);
assert.equal(initialNavigation.component.showPreloader, false, 'preloader is removed after the 500ms fade');
TestBed.resetTestingModule();

const failedNavigation = createComponent();
failedNavigation.component.ngOnInit();
failedNavigation.events.next(new NavigationError(1, '/', new Error('Initial navigation failed.')));
assert.equal(failedNavigation.component.fadePreloader, true, 'navigation errors also dismiss the preloader');
runTimer(500);
assert.equal(failedNavigation.component.showPreloader, false);
TestBed.resetTestingModule();

const stuckInitialization = createComponent();
stuckInitialization.component.ngOnInit();
runTimer(15000);
assert.equal(stuckInitialization.component.entrySlow, true, 'watchdog exposes a recovery hint');
assert.equal(stuckInitialization.component.fadePreloader, true, 'watchdog prevents a stuck preloader');
runTimer(500);
assert.equal(stuckInitialization.component.showPreloader, false);
TestBed.resetTestingModule();

console.log('Preloader checks passed: immediate route-driven fade, navigation error recovery, 500ms exit and initialization watchdog.');
