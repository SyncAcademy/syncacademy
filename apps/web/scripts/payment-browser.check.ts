import 'zone.js';
import { DialogFocusDirective } from '../src/app/shared/directives/dialog-focus.directive';
import '@angular/compiler';

import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { computed, ElementRef, signal, RendererFactory2 } from '@angular/core';
import { ActivatedRoute, provideRouter } from '@angular/router';
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
  schoolId: signal(schoolId), schoolName: () => 'Test School',
  role: signal('BURSAR'),
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
const year = { id: yearId, label: '2026', status: 'active', startDate: '2026-01-01', endDate: '2026-12-31' };
const yearService = {
  bursarYear: signal(year),
  readOnly: () => false,
};
const registrar = {
  classesFor: () => [{ id: 'class-1', name: 'Form 1A' }, {id:'class-2', name:'Form 2A'}],
  enrolmentsFor: () => [{ id: 'enrolment-1', studentId: 'student-1', studentName: 'Test Student', yearId, classId: 'class-1', status: 'active' }, {id:'enrolment-2', studentId:'student-2', studentName:'Other Student', yearId, classId:'class-2', status:'active'}],
  student: (id: string) => ({ id, name: id === 'student-1' ? 'Test Student' : 'Other Student', number:id === 'student-1' ? 'ST-001' : 'ST-002' }),
  className: (id: string) => id === 'class-1' ? 'Form 1A' : 'Form 2A',
};

// Supply constructor metadata that Angular AOT normally emits (esbuild runs this fixture in JIT mode).
(DialogFocusDirective as any).ctorParameters = () => [{type: ElementRef}];
(ThousandsSeparatorDirective as any).ctorParameters = () => [{type: ElementRef}];
TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
TestBed.configureTestingModule({
  imports: [BursarPage],
  providers: [provideRouter([]),
    { provide: ActivatedRoute, useValue: { data: of({ section: 'payments', title: 'Payments' }) } },
    { provide: SchoolApiService, useValue: api },
    { provide: AcademicYearService, useValue: yearService },
    { provide: RegistrarStore, useValue: registrar },
  ],
});
const store = TestBed.inject(BursarStore);


ledgerRows.charges.push({...ledgerRows.charges[0], id:'charge-2', feeId:'fee-2', name:'Meals', amount:20000});
const passed: string[] = [];
const check = (value: unknown, label: string) => { if (!value) throw new Error(label); passed.push(label); };
const settle = async () => { await new Promise(resolve => setTimeout(resolve, 50)); fixture.detectChanges(); };
let fixture: any;
(async () => {
  fixture = TestBed.createComponent(BursarPage);
  document.body.appendChild(fixture.nativeElement);
  fixture.detectChanges(); await store.loadYear(yearId); await settle();
  const page = fixture.componentInstance as BursarPage;
  page.detailId.set('student-1');
  check(page.ledger()[0]?.id==='payment-1' && page.ledger().at(-1)?.at==='2026-01-01T00:00:00.000Z','Student transaction history shows newest entries first');
  page.detailId.set('');
  page.open('payment'); await settle();
  check(document.querySelectorAll('.student-choice').length === 2, 'Students from all classes visible');
  check(!document.querySelector('select[name="studentId"]'), 'No student dropdown');
  const search = document.querySelector('#payment-search') as HTMLInputElement;
  search.value = 'missing'; search.dispatchEvent(new Event('input', {bubbles:true})); await settle();
  check(document.querySelectorAll('.student-choice').length === 0, 'Search empty state');
  search.value = 'ST-001'; search.dispatchEvent(new Event('input', {bubbles:true})); await settle();
  check(document.querySelectorAll('.student-choice').length === 1, 'Admission number search');
  search.value = ''; search.dispatchEvent(new Event('input', {bubbles:true})); await settle();
  const classFilter = document.querySelector('#payment-class') as HTMLSelectElement;
  classFilter.value = 'class-2'; classFilter.dispatchEvent(new Event('change', {bubbles:true})); await settle();
  check(document.querySelectorAll('.student-choice').length === 1 && document.querySelector('.student-choice')!.textContent!.includes('Other Student'), 'Class filter narrows school list');
  classFilter.value = ''; classFilter.dispatchEvent(new Event('change', {bubbles:true})); await settle();
  check(document.querySelectorAll('.student-choice').length === 2, 'All classes restores school list');
  search.value = 'ST-001'; search.dispatchEvent(new Event('input', {bubbles:true})); await settle();
  (document.querySelector('.student-choice') as HTMLButtonElement).click(); await settle();
  check(!!document.querySelector('.selected-student'), 'Selected student identity visible');
  check(document.querySelectorAll('.fee-choice').length === 2, 'Multiple assigned fees offered');
  (Array.from(document.querySelectorAll('.fee-choice')).find(label => label.textContent?.includes('Tuition'))!.querySelector('input') as HTMLInputElement).click(); await settle();
  check(!!document.querySelector('#finance-payment-amount'), 'Installment fields appear after fee selection');
  const dialog = document.querySelector('dialog')!;
  const panel = dialog.querySelector('form')!;
  check(dialog.matches(':modal'), 'Payment form in browser top layer');
  const rect = panel.getBoundingClientRect();
  check(rect.left >= 0 && rect.right <= innerWidth + 1 && rect.top >= 0 && rect.bottom <= innerHeight + 1, 'Payment form fits viewport');
  check(panel.scrollWidth <= panel.clientWidth + 1, 'No horizontal overflow');
  const amount = document.querySelector('#finance-payment-amount') as HTMLInputElement;
  amount.value = '12500'; amount.dispatchEvent(new Event('input', {bubbles:true})); await settle();
  check(page.paymentValid(), 'Valid installment accepted');
  check(!(document.querySelector('button[type="submit"]') as HTMLButtonElement).disabled, 'Save enabled for valid installment');
  page.close(); page.editPayment('payment-1'); await settle();
  check(document.querySelector('#finance-dialog-title')?.textContent === 'Edit payment', 'Edit opens correction form');
  check((document.querySelector('#correction-reason') as HTMLTextAreaElement)?.required, 'Reason is required');
  (Array.from(document.querySelectorAll('.fee-choice')).find(label => label.textContent?.includes('Tuition'))!.querySelector('input') as HTMLInputElement).click(); await settle();
  const editAmount = document.querySelector('#finance-payment-amount') as HTMLInputElement;
  editAmount.value = '45000'; editAmount.dispatchEvent(new Event('input', {bubbles:true})); await settle();
  check((document.querySelector('button[type="submit"]') as HTMLButtonElement).disabled, 'Cannot correct without reason');
  const reason = document.querySelector('#correction-reason') as HTMLTextAreaElement;
  reason.value = 'Correcting the received amount.'; reason.dispatchEvent(new Event('input', {bubbles:true})); await settle();
  check(!(document.querySelector('button[type="submit"]') as HTMLButtonElement).disabled, 'Valid correction can be saved');
  (window as any).paymentFixture = {page, fixture};
  document.body.dataset.testResult = JSON.stringify({passed});
})().catch(error => { document.body.dataset.testResult = JSON.stringify({failed:String(error), passed}); });
