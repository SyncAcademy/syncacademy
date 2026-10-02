import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { TeacherClassStore } from './teacher-class.store';
import { HeadPageHeaderComponent } from '../headmaster/shared/head-page-header.component';
import { AttendanceEntry, AttendanceSheet, ATTENDANCE_STATUSES } from '../../core/services/attendance.service';
import { SchoolClass } from '../headmaster/head.models';
import { Assessment, summarizeResults } from '../academic/academic.store';
@Component({ selector: 'app-teacher-class', standalone: true, imports: [CommonModule, FormsModule, RouterLink, HeadPageHeaderComponent], templateUrl: './teacher-class.page.html', styleUrls: ['../academic/academic.page.scss', './teacher-class.page.scss'] })
export class TeacherClassPage {
  readonly store = inject(TeacherClassStore);
  private readonly data = toSignal(inject(ActivatedRoute).data);
  readonly section = computed(() => this.data()?.['section'] ?? 'class-overview');
  readonly title = computed(() => this.data()?.['title'] ?? 'My Class');
  readonly classMode = computed(() => this.section() !== 'subject-performance');
  readonly classId = signal(''); readonly examId = signal(''); readonly subject = signal(''); readonly studentNumber = signal(''); readonly status = signal('approved');
  readonly date = signal(new Date().toISOString().slice(0, 10)); readonly search = signal(''); readonly notice = signal(''); readonly error = signal(''); readonly page = signal(1);
  readonly today = new Date().toISOString().slice(0, 10);
  readonly statuses = ATTENDANCE_STATUSES;
  readonly selectedClass = computed<SchoolClass | undefined>(() => this.store.classes().find(c => c.id === this.classId()) ?? this.store.classes()[0]);
  readonly classLabel = computed(() => this.classMode() ? this.selectedClass()?.stream || this.selectedClass()?.name || '' : this.classId());
  readonly ownClasses = computed(() => [...new Set(this.store.ownAssignments().map(a => a.classStream || a.className))]);
  readonly exam = computed<Assessment | undefined>(() => this.store.assessments().find(a => a.id === this.examId()) ?? this.store.assessments().find(a => a.status === 'open') ?? this.store.assessments()[0]);
  readonly allResults = computed(() => this.store.results(this.classMode()).filter(r => (!this.classLabel() || r.className === this.classLabel()) && (!this.subject() || r.subject === this.subject()) && (!this.studentNumber() || r.studentNumber === this.studentNumber()) && (!this.status() || r.status === this.status())));
  readonly results = computed(() => this.allResults().filter(r => r.assessmentId === this.exam()?.id && `${r.student} ${r.studentNumber}`.toLowerCase().includes(this.search().toLowerCase())));
  readonly subjects = computed(() => [...new Set(this.store.results(this.classMode()).filter(r => !this.classLabel() || r.className === this.classLabel()).map(r => r.subject))]);
  readonly resultStudents = computed(() => [...new Map(this.store.results(this.classMode()).filter(r => !this.classLabel() || r.className === this.classLabel()).map(r => [r.studentNumber, { number: r.studentNumber, name: r.student }])).values()]);
  readonly average = computed(() => this.results().length ? this.results().reduce((s, r) => s + r.mark, 0) / this.results().length : null);
  readonly subjectGroups = computed(() => summarizeResults(this.results(), 'subject'));
  readonly trend = computed(() => this.store.assessments().slice().sort((a, b) => a.deadline.localeCompare(b.deadline)).map(a => { const rows = this.allResults().filter(r => r.assessmentId === a.id); return { id: a.id, label: a.name, date: a.deadline, count: rows.length, average: rows.length ? rows.reduce((s, r) => s + r.mark, 0) / rows.length : null }; }));
  readonly roster = computed(() => this.store.roster(this.selectedClass()?.id ?? ''));
  readonly sheets = computed(() => this.store.sheets().filter(s => s.classId === this.selectedClass()?.id).sort((a, b) => b.date.localeCompare(a.date)));
  readonly revisions = computed(() => this.store.attendanceHistory().filter(s => s.classId === this.selectedClass()?.id && s.date === this.date()).sort((a, b) => b.revision - a.revision));
  readonly saved = computed(() => this.sheets().find(s => s.date === this.date()));
  readonly attendanceRoster = computed(() => this.store.attendance.roster(this.selectedClass()?.id ?? '', this.date()));
  readonly attendanceSummary = computed(() => { const entries = this.sheets().flatMap(s => s.entries); return { recorded: entries.length, attended: entries.filter(e => e.status === 'Present' || e.status === 'Late').length, absent: entries.filter(e => e.status === 'Absent').length }; });
  readonly support = computed(() => this.roster().map(s => ({ ...s, failed: this.store.results(true).filter(r => r.className === this.classLabel() && r.studentNumber === s.number && r.assessmentId === this.exam()?.id && r.status === 'approved' && !r.passed).length, absences: this.sheets().flatMap(s => s.entries).filter(e => e.studentId === s.id && e.status === 'Absent').length })).filter(s => s.failed || s.absences >= 3));
  readonly pages = computed(() => Math.max(1, Math.ceil(this.results().length / 25)));
  entries: Partial<Record<string, { status: string; note: string }>> = {}; reason = '';
  constructor() {
    effect(() => { this.store.year()?.id; this.section(); untracked(() => { this.classId.set(''); this.examId.set(''); this.subject.set(''); this.studentNumber.set(''); this.status.set('approved'); this.search.set(''); this.notice.set(''); this.error.set(''); }); });
    effect(() => { const roster = this.attendanceRoster(); const saved = this.saved(); untracked(() => { this.entries = Object.fromEntries(roster.map(r => { const entry = saved?.entries.find(e => e.studentId === r.studentId); return [r.studentId, { status: entry?.status ?? '', note: entry?.note ?? '' }]; })); this.reason = ''; this.error.set(''); }); });
    effect(() => { this.classId(); this.examId(); this.subject(); this.studentNumber(); this.status(); this.search(); this.page.set(1); });
    effect(() => { if (this.page() > this.pages()) this.page.set(this.pages()); });
  }
  selectClass(value: string): void { this.classId.set(value); this.subject.set(''); this.studentNumber.set(''); this.notice.set(''); }
  setAttendance(id: string, field: 'status' | 'note', value: string): void { this.entries[id] = { status: '', note: '', ...this.entries[id], [field]: value }; }
  markPresent(): void { for (const row of this.attendanceRoster()) this.setAttendance(row.studentId, 'status', 'Present'); }
  save(): void {
    const entries = this.attendanceRoster().map(r => ({ ...r, ...this.entries[r.studentId] })) as AttendanceEntry[];
    const error = this.store.attendance.save(this.selectedClass()?.id ?? '', this.date(), entries, this.reason);
    if (error) this.error.set(error); else { this.error.set(''); this.notice.set('Attendance saved. Previous versions remain in the record history.'); }
  }
  attendanceRate(sheet: AttendanceSheet): number { return sheet.entries.length ? sheet.entries.filter(e => ['Present', 'Late'].includes(e.status)).length / sheet.entries.length * 100 : 0; }
}
