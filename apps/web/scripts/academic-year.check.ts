import 'zone.js/node';
import '@angular/compiler';
import assert from 'node:assert/strict';
import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { AcademicYearService } from '../src/app/core/services/academic-year.service';
import { HeadDemoStore } from '../src/app/features/headmaster/head-demo.store';
import { TeacherDemoStore } from '../src/app/features/teacher/teacher-demo.store';
import { ReportDemoStore } from '../src/app/features/headmaster/report-demo.store';

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'sessionStorage', { value: {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
}, configurable: true });
TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
// Store-only checks flush effects explicitly; there is no browser DOM to render.
TestBed.configureTestingModule({ providers: [{ provide: DOCUMENT, useValue: { body: null, querySelectorAll: () => [] } }] });
const years = TestBed.inject(AcademicYearService);
const head = TestBed.inject(HeadDemoStore);
const teacher = TestBed.inject(TeacherDemoStore);
const reports = TestBed.inject(ReportDemoStore);
assert.equal(years.headYear()?.id, 'ay-1');
assert.equal(years.teacherYear()?.id, 'ay-1');
assert.ok(teacher.assignments().length > 0);
assert.ok(head.yearClasses().length > 0);
assert.ok(reports.reports().length > 0);
const draft = structuredClone(teacher.entries('ta-5'));
draft[0].marksValue = 77;
teacher.save('ta-5', draft);
assert.equal(teacher.entries('ta-5')[0].marksValue, 77, 'Current-year drafts remain editable');
const currentTeacher = JSON.stringify(teacher.state());
const currentReports = JSON.stringify(reports.reports());

years.select('head', 'ay-2');
assert.equal(head.yearClasses().length, 0);
assert.equal(head.yearAssignments().length, 0);
assert.equal(reports.reports().length, 0);
assert.equal(reports.stats().sent, 0);
assert.equal(years.teacherYear()?.id, 'ay-1');
assert.equal(years.years().find(y => y.status === 'active')?.id, 'ay-1');
reports.approve('report-1');
assert.equal(reports.send(['report-3']), 0);

years.select('teacher', 'ay-2');
assert.equal(teacher.assignments().length, 0);
assert.equal(teacher.stats().totalAssignments, 0);
assert.equal(teacher.entries('ta-1').length, 0);
assert.equal(teacher.roster('ta-1').length, 0);
teacher.save('ta-5', []);
teacher.confirmRoster('ta-1');
teacher.reportIssue('ta-1', { studentId: null, issueType: 'other', description: 'Blocked historical change' });
assert.equal(teacher.submit('ta-5'), false);
assert.equal(JSON.stringify(teacher.state()), currentTeacher);
years.select('teacher', 'ay-4');
assert.equal(years.teacherYear()?.id, 'ay-2', 'Teachers cannot select draft years');
years.select('teacher', 'missing');
assert.equal(years.teacherYear()?.id, 'ay-2');

years.select('head', 'ay-1');
years.select('teacher', 'ay-1');
assert.equal(JSON.stringify(reports.reports()), currentReports);
assert.equal(JSON.stringify(teacher.state()), currentTeacher);
// Existing records in a year that becomes closed remain readable but immutable.
years.years.update(list => list.map(y => y.id === 'ay-1' ? { ...y, status: 'closed' } : y));
assert.ok(teacher.entries('ta-1').length > 0);
assert.equal(teacher.readOnly(), true);
teacher.save('ta-5', []);
teacher.confirmRoster('ta-1');
assert.equal(teacher.submit('ta-5'), false);
reports.approve('report-1');
assert.equal(reports.send(['report-3']), 0);
assert.equal(JSON.stringify(teacher.state()), currentTeacher);
assert.equal(JSON.stringify(reports.reports()), currentReports);

years.select('head', 'ay-3');
years.select('teacher', 'ay-2');
TestBed.flushEffects();
assert.deepEqual(JSON.parse(storage.get('syncacademy.year-selection.v1')!), { head: 'ay-3', teacher: 'ay-2' });
// A new service instance restores the viewing context without changing activation.
const restored = TestBed.runInInjectionContext(() => new AcademicYearService());
assert.equal(restored.headYear()?.id, 'ay-3');
assert.equal(restored.teacherYear()?.id, 'ay-2');
years.years.update(list => list.filter(y => y.id !== 'ay-3'));
assert.notEqual(years.headYear()?.id, 'ay-3', 'Deleted selection falls back to an available year');
TestBed.flushEffects();
TestBed.resetTestingModule();
console.log('Academic-year checks passed: defaults, independent roles, filters, isolation, closed-year guards, persistence and fallback.');
