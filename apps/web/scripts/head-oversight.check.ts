import 'zone.js/node';
import '@angular/compiler';
import assert from 'node:assert/strict';
import { signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { HeadOversightStore } from '../src/app/features/headmaster/head-oversight.store';
import { BursarStore } from '../src/app/features/bursar/bursar.store';
import { AcademicStore } from '../src/app/features/academic/academic.store';
import { AcademicYearService } from '../src/app/core/services/academic-year.service';
import { RegistrarStore } from '../src/app/features/registrar/registrar.store';
import { AttendanceService } from '../src/app/core/services/attendance.service';
import { ClassTeacherService } from '../src/app/core/services/class-teacher.service';
import { HeadStore } from '../src/app/features/headmaster/head.store';
import { AcademicDataService } from '../src/app/core/services/academic-data.service';
const headYear = signal({ id: 'previous' }); const calls: string[] = [];
const records = { fees: [], charges: [], payments: [{ id: 'receipt-old', voidAt: '2025-12-01' }], adjustments: [] };
const api = { data: signal({ audit: [{ id: 'audit', action: 'PAYMENT_RECORDED', target: 'receipt-old', createdAt: '2025-03-01', role: 'BURSAR', actor: { name: 'Previous bursar' } }] }) };
const bursar = {
  forYear: (id: string) => id === 'previous' ? records : { fees: [], charges: [], payments: [], adjustments: [] },
  accountsFor: (id: string, term?: string) => id === 'previous' && term !== 'Term 2' ? [{ id: 'student', balance: 50000 }] : [],
  totals: (_student: unknown, _term: unknown, id: string) => ({ expected: id === 'previous' ? 50000 : 0, paid: 0, balance: id === 'previous' ? 50000 : 0 }),
  loadYear: async (id: string) => { calls.push(id); },
};
TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
TestBed.configureTestingModule({ providers: [
  { provide: DOCUMENT, useValue: { body: null, querySelectorAll: () => [] } },
  { provide: AcademicYearService, useValue: { headYear } },
  { provide: BursarStore, useValue: bursar },
  { provide: AcademicDataService, useValue: { loading: signal(false), error: signal(''),data:signal({view:'overview',submissions:[{assessmentProgress:{status:'approved'},resultStats:{count:2,sum:150,passed:1}},{assessmentProgress:{status:'submitted'},resultStats:{count:1,sum:50,passed:1}}]}) } },
  { provide: AcademicStore, useValue: { forYear: () => ({audit:[]}) } },
  { provide: RegistrarStore, useValue: { classesFor: () => [], enrolmentsFor: () => [], admissionsFor: () => [] } },
  { provide: AttendanceService, useValue: { forYear: () => [] } },
  { provide: ClassTeacherService, useValue: { forClass: () => undefined } },
  { provide: HeadStore, useValue: { api } },
] });
const head = TestBed.inject(HeadOversightStore);
assert.deepEqual(head.academicSummary(),{submitted:1,approved:1,average:75,passRate:50},'compact overview preserves dashboard totals without student mark arrays');
await head.loadFinance('previous'); assert.deepEqual(calls, ['previous']);
assert.equal(head.finance().payments[0].id, 'receipt-old'); assert.equal(head.financeSummary().balance, 50000);
assert.equal(head.accountsFor('Term 2').length, 0); assert.equal(head.activity()[0].actorName, 'Previous bursar');
const before = JSON.stringify(records); head.finance(); head.accounts(); head.financeSummary();
assert.equal(JSON.stringify(records), before, 'reads cannot alter historical transactions');
headYear.set({ id: 'current' }); assert.equal(head.finance().payments.length, 0); assert.equal(head.financeSummary().expected, 0);
TestBed.resetTestingModule();
console.log('Head oversight checks passed: shared finance, archived receipts, attribution, year isolation and non-mutating reads.');
