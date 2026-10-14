import 'zone.js/node';
import '@angular/compiler';
import assert from 'node:assert/strict';
import { signal, RendererFactory2 } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { AcademicYearService } from '../src/app/core/services/academic-year.service';
import { SchoolApiService } from '../src/app/core/services/school-api.service';
const current = { id: 'current', name: '2026', startsAt: '2026-01-01', endsAt: '2026-12-31', closed: false, terms: [{ key: 'Term 1', name: 'Opening term', startsAt: '2026-01-01', endsAt: '2026-06-30' }] };
const previous = { id: 'previous', name: '2025', startsAt: '2025-01-01', endsAt: '2025-12-31', closed: true, terms: [{ key: 'Term 1', name: 'Previous term', startsAt: '2025-01-01', endsAt: '2025-06-30' }] };
const saved = new Map<string,string>();
(globalThis as any).window = { localStorage: { getItem: (key:string) => saved.get(key) ?? null, setItem: (key:string,value:string) => { saved.set(key,value); } } };
const api = { data: signal<any>({ years: [current, previous] }), schoolId: signal('school-one'), auth: { identity: signal({ id: 'user-one' }) } };
TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
TestBed.configureTestingModule({ providers: [
  { provide: RendererFactory2, useValue: { begin() {}, end() {}, whenRenderingDone: () => Promise.resolve() } },
  { provide: DOCUMENT, useValue: { body: null, querySelectorAll: () => [] } },
  { provide: SchoolApiService, useValue: api },
] });
const years = TestBed.inject(AcademicYearService); TestBed.flushEffects();
assert.equal(years.headYear()?.id, 'current'); assert.equal(years.bursarYear()?.id, 'current');
years.select('bursar', 'previous'); years.select('teacher', 'previous');
assert.equal(saved.get('syncacademy:selected-year:user-one:school-one:bursar'), 'previous', 'Apply persists the selected year');
assert.equal(years.bursarYear()?.id, 'previous');
assert.equal(years.headYear()?.id, 'current', 'history selection does not change other roles');
assert.equal(years.readOnly('bursar'), false); assert.equal(years.readOnly('teacher'), false); assert.equal(years.readOnly('head'), false);
assert.equal(years.termName('head', 'Term 1'), 'Opening term'); assert.equal(years.termName('teacher', 'Term 1'), 'Previous term');
api.data.set({ years: [{ ...current }, { ...previous }] }); TestBed.flushEffects();
assert.equal(years.bursarYear()?.id, 'previous', 'refresh preserves selection');
api.schoolId.set('school-two'); assert.equal(years.bursarYear()?.id, 'current', 'another school has its own selection');
api.schoolId.set('school-one'); assert.equal(years.bursarYear()?.id, 'previous', 'returning to a school restores its selection');
years.select('teacher', 'missing'); assert.equal(years.teacherYear()?.id, 'previous');
api.data.set(null); TestBed.flushEffects();
assert.equal(years.headYear(), undefined); assert.equal(years.bursarYear(), undefined); assert.equal(years.readOnly('bursar'), true);
api.data.set({ years: [{ ...current, id: 'other-school-year' }] }); TestBed.flushEffects();
assert.equal(years.bursarYear()?.id, 'other-school-year', 'school change cannot retain an inaccessible year');
TestBed.resetTestingModule();
TestBed.configureTestingModule({ providers: [
  { provide: RendererFactory2, useValue: { begin() {}, end() {}, whenRenderingDone: () => Promise.resolve() } },
  { provide: DOCUMENT, useValue: { body: null, querySelectorAll: () => [] } },
  { provide: SchoolApiService, useValue: api },
] });
const reloaded = TestBed.inject(AcademicYearService); TestBed.flushEffects();
api.data.set({ years: [current, previous] }); TestBed.flushEffects();
assert.equal(reloaded.bursarYear()?.id, 'previous', 'page reload restores the saved year');
console.log('Academic-year checks passed: persisted year selection, refresh, role and school isolation.');
