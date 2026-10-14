import 'zone.js/node';
import '@angular/compiler';
import assert from 'node:assert/strict';
import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { computed, ElementRef, signal, RendererFactory2 } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { BursarPage } from '../src/app/features/bursar/bursar.page';
import { AcademicYearService } from '../src/app/core/services/academic-year.service';
import { SchoolApiService } from '../src/app/core/services/school-api.service';
import { RegistrarStore } from '../src/app/features/registrar/registrar.store';
import { BursarStore } from '../src/app/features/bursar/bursar.store';
import { amountValue, formatThousands, ThousandsSeparatorDirective } from '../src/app/shared/directives/thousands-separator.directive';

const yearId = 'year-1';
const schoolId = 'school-1';
const pastDue = '2020-02-01';
const feeRows = [{
  id: 'fee-1', yearId, classroomId: 'class-1', term: 'Term 1', name: 'Tuition',
  amount: 100000, dueDate: `${pastDue}T00:00:00.000Z`, locked: true,
}];
const ledgerRows = {
  charges: [{
    id: 'charge-1', yearId, feeId: 'fee-1', studentId: 'student-1', classroomId: 'class-1',
    term: 'Term 1', name: 'Tuition', amount: 100000, dueDate: `${pastDue}T00:00:00.000Z`,
    createdAt: '2026-01-01T00:00:00.000Z', student: { name: 'Test Student', admissionNumber: 'ST-001' },
  }],
  payments: [{
    id: 'payment-1', yearId, studentId: 'student-1', term: 'Term 1', amount: 40000,
    method: 'Bank transfer', reference: 'TX-001', date: '2026-02-02T00:00:00.000Z',
    createdAt: '2026-02-02T10:00:00.000Z', receipt: 'SA-2026-00001', voidAt: null,
    voidReason: null, student: { name: 'Test Student', admissionNumber: 'ST-001' },
  }],
  adjustments: [{
    id: 'adjustment-1', yearId, studentId: 'student-1', term: 'Term 1',
    amount: -10000, kind: 'Scholarship', reason: 'Approved school scholarship.',
    createdAt: '2026-01-15T00:00:00.000Z',
  }],
};
const requests: { method: string; path: string; payload?: unknown }[] = [];
const api = {
  schoolId: signal(schoolId),
  role: signal('BURSAR'),
  schoolRevisionNotice:signal(0),
  auth: {
    identity: signal({ id: 'bursar-1' }),
    request: async (method: string, path: string, payload?: unknown) => {
      requests.push({ method, path, payload });
      if (path.endsWith('/finance/fees?yearId=' + yearId)) return feeRows;
      if (path.endsWith('/finance/ledger?yearId=' + yearId)) return ledgerRows;
      throw new Error(`Unexpected API request: ${method} ${path}`);
    },
    error: (error: unknown) => error instanceof Error ? error.message : 'Request failed.',
  },
  write: async (path: string, payload: unknown, method = 'POST') => {
    requests.push({ method, path, payload });
    return { id: 'payment-1' };
  },
};
const year = { id: yearId, label: '2026', status: 'active', startDate: '2026-01-01', endDate: '2026-12-31',terms:[{key:'Term 1',name:'Term 1',startsAt:'2026-01-01',endsAt:'2026-03-31'}] };
const yearService = {
  bursarYear: signal(year),
  registerYear: signal(year),
  readOnly: () => false,
};
const registrar = {
  classesFor: () => [{ id: 'class-1', name: 'Form 1A' }],
  enrolmentsFor: () => [{ id: 'enrolment-1', studentId: 'student-1', studentName: 'Test Student', yearId, classId: 'class-1', status: 'active' }],
  student: () => ({ id: 'student-1', name: 'Test Student', number: 'ST-001' }),
  className: (id: string) => id === 'class-1' ? 'Form 1A' : 'Unassigned',
};

TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
TestBed.configureTestingModule({
  providers: [
    { provide: RendererFactory2, useValue: { begin() {}, end() {}, whenRenderingDone: () => Promise.resolve() } },
    { provide: ActivatedRoute, useValue: { data: of({ section: 'payments', title: 'Payments' }),queryParams:of({}),snapshot:{queryParamMap:{get:()=>null}} } },
    { provide: DOCUMENT, useValue: { body: null, querySelectorAll: () => [] } },
    { provide: SchoolApiService, useValue: api },
    { provide: AcademicYearService, useValue: yearService },
    { provide: RegistrarStore, useValue: registrar },
  ],
});
const store = TestBed.inject(BursarStore);

assert.equal(formatThousands('1234'), '1,234');
assert.equal(formatThousands('1234567890'), '1,234,567,890');
assert.equal(formatThousands('1,234,567'), '1,234,567');
assert.equal(amountValue('1,234,567'), 1234567);
assert.equal(amountValue(''), 0);
const numericInput = {
  value: '1234',
  selectionStart: 4,
  disabled: false,
  setSelectionRange(start: number) { this.selectionStart = start; },
} as HTMLInputElement;
const separator = new ThousandsSeparatorDirective(new ElementRef(numericInput));
let inputModel = '';
separator.registerOnChange(value => inputModel = value);
separator.formatInput();
assert.equal(numericInput.value, '1,234');
assert.equal(inputModel, '1234');
assert.equal(numericInput.selectionStart, 5);

await store.loadYear(yearId);
assert.equal(store.fees().length, 1);
assert.equal(store.fees()[0].classId, 'class-1');
assert.equal(store.fees()[0].due, pastDue);
assert.equal(store.charges()[0].student, 'Test Student');
assert.equal(store.payments()[0].receipt, 'SA-2026-00001');
assert.equal(store.adjustments()[0].amount, -10000);
assert.deepEqual(store.summary(), { charged: 100000, adjustments: -10000, expected: 90000, paid: 40000, balance: 50000, overdue: 50000 });
assert.equal(store.accounts()[0].name, 'Test Student');
assert.equal(store.accounts()[0].balance, 50000);
ledgerRows.payments[0].amount=45000;api.schoolRevisionNotice.set(1);TestBed.flushEffects();await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(store.payments()[0].amount,45000,'a school change updates an already-open finance cache');
ledgerRows.payments[0].amount=40000;api.schoolRevisionNotice.set(2);TestBed.flushEffects();await new Promise(resolve=>setTimeout(resolve,0));

assert.equal(await store.saveFee({ classId: 'class-1', term: 'Term 1', name: 'Tuition', amount: 100000, due: pastDue }), null);
const createFee = requests.find(request => request.path === 'finance/fees' && request.method === 'POST');
assert.deepEqual(createFee?.payload, {
  classroomId: 'class-1', term: 'Term 1', name: 'Tuition', amount: 100000, dueDate: pastDue, yearId,
});
assert.equal(await store.applyFee('fee-1'), null);
assert.equal(await store.recordPayment({ studentId: 'student-1', term: 'Term 1', amount: 1000, method: 'Cash', reference: '', date: '2026-02-02' }), null);
assert.equal(await store.adjust({ studentId: 'student-1', term: 'Term 1', amount: 1000, kind: 'Discount', reason: 'Approved discount.' }), null);

const apiWrites = requests.filter(request => request.path.startsWith('finance/'));
assert.deepEqual(apiWrites.map(request => request.path), [
  'finance/fees',
  'finance/fees/fee-1/apply',
  'finance/payments',
  'finance/adjustments',
]);
assert.ok(requests.some(request => request.path === `schools/${schoolId}/finance/ledger?yearId=${yearId}`));

await store.saveFee({ classId: 'class-1', term: 'Term 1', name: 'Edited', amount: 100000, due: pastDue }, 'fee-1');
const edit = requests.find(r => r.method === 'PATCH');
assert.equal('classroomId' in (edit!.payload as object), false, 'fee edits must match the API schema');
assert.equal(store.lastPaymentId(), 'payment-1');
await store.saveFee({ classId: '', classIds: ['class-1', 'class-2'], term: 'Term 1', name: 'Contribution', amount: 5000, due: pastDue });
const bulkWrite = requests.filter(r => r.path === 'finance/fees').at(-1)!;
assert.deepEqual((bulkWrite.payload as any).classroomIds, ['class-1', 'class-2']);
assert.equal('classroomId' in (bulkWrite.payload as object), false);
api.auth.identity.set({ id: 'bursar-2' });
assert.equal(store.payments().length, 0, 'a new login must not inherit another login cache');
await store.loadYear(yearId);
assert.equal(store.payments().length, 1, 'new staff can load school history');
api.schoolId.set('school-2');
assert.equal(store.payments().length, 0, 'school switch hides previous ledger immediately');
api.schoolId.set(schoolId);
api.role.set('TEACHER');
assert.equal(store.payments().length, 0, 'role switch hides finance cache');
api.role.set('BURSAR');
const page = TestBed.runInInjectionContext(() => new BursarPage());
TestBed.flushEffects(); await store.loadYear(yearId);
page.open('payment', 'student-1'); page.form['amount'] = '12500';
page.open('account', 'student-1');
assert.equal(page.accountCharges().length, 1);
assert.equal(page.accountPeriods()[0].balance, 50000);
page.open('fee'); page.toggleClass('class-1'); page.toggleClass('class-2');
assert.deepEqual(page.selectedClasses(), ['class-1', 'class-2']);
page.toggleClass('class-1'); assert.deepEqual(page.selectedClasses(), ['class-2']);
page.open('payment', 'student-1'); page.form['amount'] = '12500';
yearService.bursarYear.set({ ...year }); TestBed.flushEffects();
assert.equal(page.dialog(), 'payment', 'workspace refresh must not close an unfinished form');
assert.equal(page.form['amount'], '12500');
page.busy.set(true); page.close();
assert.equal(page.dialog(), 'payment', 'an in-flight save cannot be dismissed');
page.busy.set(false);
page.open('payment');
page.search.set('unrelated page filter'); page.classId.set('other-class');
assert.equal(page.paymentStudents().length, 1, 'payment picker is independent of page search and filters');
page.filterPaymentStudents('ST-001'); assert.equal(page.paymentStudents().length, 1);
page.filterPaymentStudents('no-match'); assert.equal(page.paymentStudents().length, 0);
page.filterPaymentStudents(''); page.filterPaymentStudents('other-class', true); assert.equal(page.paymentStudents().length, 0);
page.filterPaymentStudents('', true); assert.equal(page.paymentStudents().length, 1);
page.selectPaymentStudent('student-1'); page.selectPaymentCharge('charge-1');
assert.equal(page.form['term'], 'Term 1');
assert.equal(store.payable(page.paymentCharge()!), 50000, 'legacy payments and discounts cap available fee payment');
page.form['amount'] = '50,001'; assert.equal(page.paymentValid(), false);
page.form['amount'] = '12,500'; assert.equal(page.paymentValid(), true);
page.selectPaymentStudent(''); assert.equal(page.paymentCharge(), undefined, 'changing student resets fee');
assert.equal(page.paymentValid(), false);
page.selectPaymentStudent('student-1'); page.selectPaymentCharge('charge-1'); page.form['amount'] = '12,500';
await page.save();
assert.equal((requests.filter(r => r.path === 'finance/payments').at(-1)!.payload as any).chargeId, 'charge-1');
page.editPayment('payment-1');
assert.equal(page.correctionId(), 'payment-1');
assert.equal(page.form['amount'], '40000');
page.selectPaymentCharge('charge-1');
assert.equal(page.paymentAvailable(page.paymentCharge()!), 90000, 'editing adds back original period payment');
page.form['amount'] = '45000'; page.form['reason'] = 'Correcting the received amount.';
await page.save();
assert.equal(requests.filter(r => r.path === 'finance/payments/payment-1/correct').length, 1);
assert.equal((requests.find(r => r.path === 'finance/payments/payment-1/correct')!.payload as any).reason, 'Correcting the received amount.');
api.schoolId.set('school-2'); TestBed.flushEffects();
assert.equal(page.dialog(), '', 'switching school closes a form tied to the previous school');

api.schoolId.set(schoolId); api.role.set('REGISTRAR');
yearService.registerYear.set({ ...year, id:'registrar-year' });
assert.equal(store.year()?.id, 'registrar-year', 'registrar finance follows the registrar year selector');
api.role.set('BURSAR');
assert.equal(store.year()?.id, yearId, 'bursar keeps a separate year context');
TestBed.resetTestingModule();
console.log('Bursar checks passed: finance API mapping, school-year isolation, account totals, shared fee writes, applications, payments and adjustments.');
