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
const api = { data: signal<any>({ years: [current, previous] }) };
TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
TestBed.configureTestingModule({ providers: [
  { provide: RendererFactory2, useValue: { begin() {}, end() {}, whenRenderingDone: () => Promise.resolve() } },
  { provide: DOCUMENT, useValue: { body: null, querySelectorAll: () => [] } },
  { provide: SchoolApiService, useValue: api },
] });
const years = TestBed.inject(AcademicYearService); TestBed.flushEffects();
assert.equal(years.headYear()?.id, 'current'); assert.equal(years.bursarYear()?.id, 'current');
years.select('bursar', 'previous'); years.select('teacher', 'previous');
assert.equal(years.bursarYear()?.id, 'previous');
assert.equal(years.headYear()?.id, 'current', 'history selection does not change other roles');
assert.equal(years.readOnly('bursar'), false); assert.equal(years.readOnly('teacher'), false); assert.equal(years.readOnly('head'), false);
assert.equal(years.termName('head', 'Term 1'), 'Opening term'); assert.equal(years.termName('teacher', 'Term 1'), 'Previous term');
api.data.set({ years: [{ ...current }, { ...previous }] }); TestBed.flushEffects();
assert.equal(years.bursarYear()?.id, 'previous', 'refresh preserves selection');
years.select('teacher', 'missing'); assert.equal(years.teacherYear()?.id, 'previous');
api.data.set(null); TestBed.flushEffects();
assert.equal(years.headYear(), undefined); assert.equal(years.bursarYear(), undefined); assert.equal(years.readOnly('bursar'), true);
api.data.set({ years: [{ ...current, id: 'other-school-year' }] }); TestBed.flushEffects();
assert.equal(years.bursarYear()?.id, 'other-school-year', 'school change cannot retain an inaccessible year');
TestBed.resetTestingModule();
console.log('Academic-year checks passed: configured terms, historical edits, independent selections, refresh and school switching.');
