import 'zone.js/node';
import '@angular/compiler';
import assert from 'node:assert/strict';
import { signal, ɵsetDocument } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { SchoolApiService } from '../src/app/core/services/school-api.service';
import { TeacherStore } from '../src/app/features/teacher/teacher.store';
import { RegistrarPage } from '../src/app/features/registrar/registrar.page';
import { IMPORT_FIELDS, parseCsv, suggestMapping, importDate } from '../src/app/features/registrar/import-utils';
import { StudentImportPage } from '../src/app/features/registrar/student-import.page';
import { formatClassroomName } from '../src/app/features/academic/academic-setup.store';
import { displayClassName } from '../src/app/features/headmaster/head.models';
import ExcelJS from 'exceljs';

// Test-only server fixtures. The application does not import or seed these records.
const year = { id: 'year-current', name: 'Current year', startsAt: '2026-01-01', endsAt: '2026-12-31', closed: false };
const snapshot = () => ({ school: { id: 'school-a', name: 'Test school' }, years: [{ ...year }], classes: [{ id: 'class-a', name: 'Class A', yearId: year.id, year: { closed: false }, _count: { enrollments: 1 } }], students: [], members: [], assignments: [], invitations: [], permissions: { registrar: true } });
const routeData = new BehaviorSubject({ section: 'students', title: 'Students' });
const requests: { path: string; resolve: (value: any) => void }[] = [];
let deferred = false;
const writes: any[] = [];
const api = {
  schoolId: signal('school-a'), role: signal('REGISTRAR'), data: signal<any>(snapshot()), schoolName: () => 'Test school',
  auth: { identity: signal({id:'registrar-test'}), request: async (_method: string, path: string) => {
    if (deferred) return new Promise(resolve => requests.push({ path, resolve }));
    return path.includes('/summary?') ? { classes: [], active: 1 } : { items: [], total: 0 };
  }, error: (e: any) => e.message },
  async write(path: string, payload: unknown, method: string) { writes.push({ path, payload, method }); this.data.set(snapshot()); },
};
ɵsetDocument({ head: { querySelectorAll: () => [] }, body: null, querySelectorAll: () => [] } as unknown as Document);
TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
TestBed.configureTestingModule({ providers: [RegistrarPage,
  { provide: HttpClient, useValue: { post: () => { throw new Error('Unexpected HTTP request in this test'); } } },
  { provide: DOCUMENT, useValue: { body: null, querySelectorAll: () => [] } },
  { provide: SchoolApiService, useValue: api }, { provide: TeacherStore, useValue: {} },
  { provide: ActivatedRoute, useValue: { data: routeData, snapshot: { queryParamMap: { get: () => null } } } },
] });
const page = TestBed.inject(RegistrarPage);
const flush = () => TestBed.flushEffects();
const settle = async () => { flush(); await new Promise(resolve => setTimeout(resolve, 230)); flush(); };
await settle();
assert.equal(page.store.year()?.id, year.id);
page.filter('class', 'class-a');
assert.equal(page.canSendResults(), false, 'Registrar cannot send results');
assert.equal(page.eligibleForInvitation({ enrollments: [{ status: 'active', classroomId: 'class-a', classroom: { yearId: year.id } }] }), true);
assert.equal(page.eligibleForInvitation({ enrollments: [{ status: 'withdrawn', classroomId: 'class-a', classroom: { yearId: year.id } }] }), false);
await page.open('student');
page.form['name'] = 'Unsaved profile';
api.data.set(snapshot());
flush();
assert.equal(page.dialog(), 'student', 'Refreshing the workspace must not close an open editor in the same school/year');
assert.equal(page.form['name'], 'Unsaved profile');
assert.equal(page.classFilter(), 'class-a', 'Refresh preserves class filtering');
page.close();
await settle();
await page.open('student');
page.form = { name: 'Registered through form', admissionNumber: 'TEST-1', gender: '', dateOfBirth: '', address: '', classroomId: 'class-a' };
page.guardianRows[0] = { name: 'Shared parent', relationship: 'Mother', phone: '0712345678', whatsappPhone: '', email: '', isPrimary: true };
await page.save();
assert.equal(writes[0].path, 'registry/students');
assert.equal(writes[0].method, 'POST');
assert.equal(writes[0].payload.dateOfBirth, null);
assert.equal(writes[0].payload.guardians.length, 1);
assert.equal(writes[0].payload.guardians[0].relationship, 'Mother');
assert.equal(page.dialog(), '');
assert.match(page.notice(), /Saved successfully/);
await settle();
// A previous school's slow response must never overwrite the newly selected school.
deferred = true;
const oldLoad = page.load();
api.schoolId.set('school-b');
api.data.set({ ...snapshot(), school: { id: 'school-b', name: 'Another school' } });
flush();
for (const req of requests.splice(0)) req.resolve(req.path.includes('/summary?') ? { active: 999, classes: [] } : { items: [{ id: 'stale-record' }], total: 1 });
await oldLoad;
assert.equal(page.items().some(s => s.id === 'stale-record'), false);
assert.notEqual(page.summary()?.active, 999);
deferred = false;
await settle();
assert.equal(page.classFilter(), '');
api.role.set('ACADEMIC');
api.data.set({ ...snapshot(), permissions: { registrar: false, academic: true } });
flush();
assert.equal(page.canManage(), false);
assert.equal(page.canViewGuardians(), true);
assert.equal(page.canSendResults(), true);
assert.equal(page.store.readOnly(), true);
assert.equal(page.base(), '/academic');
TestBed.resetTestingModule();
assert.deepEqual(parseCsv('\ufeffName,Number,Extra\r\n"Asha, M.",001,"line one\nline two"\r\n'), [['Name','Number','Extra'],['Asha, M.','001','line one\nline two']]);
assert.deepEqual(parseCsv('Name;Number\n"Asha ""Test""";001', ';'), [['Name','Number'],['Asha "Test"','001']]);
assert.throws(() => parseCsv('Name,Number\n"Unclosed,1'), /not closed/);
assert.throws(() => parseCsv('Name\n"Closed"invalid'), /Malformed/);
assert.deepEqual(suggestMapping(['Student Full Name','Reg No','Sex','Fee Balance','Guardian Phone','Name']), ['name','admissionNumber','gender','','guardianPhone','']);
assert.equal(importDate('03/04/2012', 'DMY'), '2012-04-03');
assert.equal(importDate('03/04/2012', 'MDY'), '2012-03-04');
assert.equal(importDate('03/04/2012', 'ISO'), '03/04/2012');
assert.equal(importDate('2012-04-03', 'DMY'), '2012-04-03');
assert.equal(formatClassroomName('Form 1', 'A'), 'Form 1A');
assert.equal(formatClassroomName('Form 1', 'Form 1A'), 'Form 1A');
assert.equal(formatClassroomName('Form 1', 'Blue Stream'), 'Form 1 Blue Stream');
assert.equal(formatClassroomName('Form 1A', ''), 'Form 1A');
assert.equal(displayClassName('Form 1 A'), 'Form 1A');
assert.equal(displayClassName('Form 1A'), 'Form 1A');
assert.equal(displayClassName('Room A'), 'Room A');
assert.deepEqual(suggestMapping(IMPORT_FIELDS.map(f => f.label)), IMPORT_FIELDS.map(f => f.key), 'download template headings map back to every supported field');
api.role.set('REGISTRAR'); api.data.set(snapshot());
TestBed.configureTestingModule({ providers: [StudentImportPage,
  { provide: DOCUMENT, useValue: { body: null, querySelectorAll: () => [] } },
  { provide: SchoolApiService, useValue: api }, { provide: TeacherStore, useValue: {} },
] });
const importer = TestBed.inject(StudentImportPage); flush();
const wb = new ExcelJS.Workbook();
wb.addWorksheet('Students').addRows([['Student Full Name', 'Reg No', 'Guardian Phone', 'Unneeded'], ['Test Import', '001', '0712345678', 'ignored']]);
const file = new File([await wb.xlsx.writeBuffer() as any], 'students.xlsx');
await importer.upload({target: {files: [file], value: 'students.xlsx'}} as any);
assert.equal(importer.error(), '');
assert.deepEqual(importer.mappings(), ['name','admissionNumber','guardianPhone','']);
assert.equal(importer.rows()[0][1], '001');
assert.equal(importer.rows()[0][2], '0712345678');
assert.equal(importer.ignored(), 1);
const extensionlessFile = new File([await wb.xlsx.writeBuffer() as any], 'students');
await importer.upload({target: {files: [extensionlessFile], value: 'students'}} as any);
assert.equal(importer.error(), '', 'an Excel workbook is detected from its file signature without relying on the extension');
assert.equal(importer.rows()[0][1], '001');
const csvFile = new File(['Student Full Name,Reg No,Class\nCSV Student,002,Form 1'], 'students.csv', { type: 'text/csv' });
await importer.upload({target: {files: [csvFile], value: 'students.csv'}} as any);
assert.equal(importer.error(), '');
assert.equal(importer.rows()[0][0], 'CSV Student');
api.data.set(snapshot()); flush();
assert.equal(importer.rows().length, 1, 'workspace refresh must preserve the import preview within the same school/year');
api.schoolId.set('school-c'); flush();
assert.equal(importer.rows().length, 0, 'switching schools clears imported personal data and preview');
TestBed.resetTestingModule();
console.log('Registrar UI checks passed: editor persistence, multi-guardian registration, stale school responses, Academic guardian and results permissions, CSV quoting, aliases and date conversion.');
