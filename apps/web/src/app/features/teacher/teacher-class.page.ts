import { Component, computed, effect, inject, signal, untracked, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { TeacherClassStore } from './teacher-class.store';
import { HeadPageHeaderComponent } from '../headmaster/shared/head-page-header.component';
import { AttendanceEntry, AttendanceSheet, ATTENDANCE_STATUSES } from '../../core/services/attendance.service';
import { SchoolClass } from '../headmaster/head.models';
import { Assessment, summarizeResults } from '../academic/academic.store';
import { summarizeStudents } from '../academic/student-result-summary';
import { reportAverage } from '../headmaster/report.store';
import { AcademicYearService } from '../../core/services/academic-year.service';
@Component({ selector: 'app-teacher-class', standalone: true, imports: [CommonModule, FormsModule, RouterLink, HeadPageHeaderComponent], templateUrl: './teacher-class.page.html', styleUrls: ['../academic/academic.page.scss', './teacher-class.page.scss'] })
export class TeacherClassPage {
  readonly reportAverage = reportAverage;
  readonly store = inject(TeacherClassStore);
  readonly years = inject(AcademicYearService);
  private readonly data = toSignal(inject(ActivatedRoute).data);
  readonly section = computed(() => this.data()?.['section'] ?? 'class-overview');
  readonly title = computed(() => this.data()?.['title'] ?? 'My Class');
  readonly classMode = computed(() => this.section() !== 'subject-performance');
  readonly classId = signal(''); readonly examId = signal(''); readonly subject = signal(''); readonly studentNumber = signal(''); readonly status = signal('approved');
  readonly selectedTerm = signal('');
  readonly assessments = computed(() => this.store.assessments().filter(a => !this.selectedTerm() || a.term === this.selectedTerm()));
  selectTerm(term: string): void { this.selectedTerm.set(term); this.examId.set(''); this.reportAssessmentId.set(''); this.page.set(1); }
  readonly date = signal(new Date().toISOString().slice(0, 10)); readonly search = signal(''); readonly notice = signal(''); readonly error = signal(''); readonly page = signal(1); readonly saving = signal(false);
  /** Tracks whether the attendance form has unsaved changes, to prevent live-refresh from overwriting edits. */
  readonly attendanceDirty = signal(false);
  private draftRevision = 0;
  private draftContext = '';
  private draftRoster: { studentId: string; student: string; number: string }[] = [];
  private attendanceContext() { return `${this.store.teacher.api.auth.identity()?.id}:${this.store.teacher.api.schoolId()}:${this.store.year()?.id}:${this.selectedClass()?.id}:${this.date()}`; }
  @HostListener('window:beforeunload', ['$event']) beforeUnload(event: BeforeUnloadEvent) { if (this.attendanceDirty() || this.saving()) { event.preventDefault(); event.returnValue = ''; } }
  canLeave() { if (this.attendanceDirty() || this.saving()) { this.error.set('Save or discard your attendance draft before leaving.'); return false; } return true; }
  selectDate(value: string) { if (!this.canLeave()) return; this.date.set(value); this.notice.set(''); }
  setReason(value: string) { if (this.saving()) return; this.reason = value; this.attendanceDirty.set(true); }
  async discardAttendance() { if (this.saving()) return; await this.store.attendance.remote.load(); if (this.store.attendance.remote.error()) { this.error.set(this.store.attendance.remote.error()); return; } this.attendanceDirty.set(false); this.loadAttendanceDraft(); }
  private loadAttendanceDraft() {
    this.draftRoster = structuredClone(this.store.attendance.roster(this.selectedClass()?.id ?? '', this.date()));
    const saved = this.saved();
    this.draftRevision = saved?.revision ?? 0;
    this.draftContext = this.attendanceContext();
    this.entries = Object.fromEntries(this.draftRoster.map(r => { const entry = saved?.entries.find(e => e.studentId === r.studentId); return [r.studentId, { status: entry?.status ?? '', note: entry?.note ?? '' }]; }));
    this.reason = ''; this.error.set('');
  }
  readonly today = new Date().toISOString().slice(0, 10);
  readonly statuses = ATTENDANCE_STATUSES;
  readonly selectedClass = computed<SchoolClass | undefined>(() => this.store.classes().find(c => c.id === this.classId()) ?? this.store.classes()[0]);
  readonly classLabel = computed(() => this.classMode() ? this.selectedClass()?.stream || this.selectedClass()?.name || '' : this.classId());
  readonly ownClasses = computed(() => [...new Set(this.store.ownAssignments().map(a => a.classStream || a.className))]);
  readonly exam = computed<Assessment | undefined>(() => this.assessments().find(a => a.id === this.examId()) ?? this.assessments()[0]);
  readonly allResults = computed(() => this.store.results(this.classMode()).filter(r => this.assessments().some(a => a.id === r.assessmentId) && (!this.classLabel() || r.className === this.classLabel()) && (!this.subject() || r.subject === this.subject()) && (!this.studentNumber() || r.studentNumber === this.studentNumber()) && (!this.status() || r.status === this.status())));
  readonly results = computed(() => this.allResults().filter(r => r.assessmentId === this.exam()?.id && `${r.student} ${r.studentNumber}`.toLowerCase().includes(this.search().toLowerCase())));
  readonly studentResults = computed(() => summarizeStudents(this.store.results(true).filter(r => r.assessmentId === this.exam()?.id && r.className === this.classLabel() && (!this.subject() || r.subject === this.subject()) && (!this.status() || r.status === this.status()))).filter(student => (!this.studentNumber() || student.studentNumber === this.studentNumber()) && `${student.student} ${student.studentNumber}`.toLowerCase().includes(this.search().trim().toLowerCase())));
  readonly subjects = computed(() => [...new Set((this.classMode() ? this.store.classAssignments() : this.store.ownAssignments()).filter(a => !!a.subjectId && (!this.classLabel() || (a.classStream || a.className) === this.classLabel())).map(a => a.subjectName))].sort());
  readonly resultStudents = computed(() => [...new Map((this.classMode() ? this.roster() : this.store.ownAssignments().filter(a => !this.classLabel() || (a.classStream || a.className) === this.classLabel()).flatMap(a => this.store.teacher.roster(a.id).map(s => ({ number: s.studentNumber, name: s.fullName })))).map(s => [s.number, { number: s.number, name: s.name }])).values()].sort((a,b) => a.name.localeCompare(b.name)));
  readonly average = computed(() => this.results().length ? this.results().reduce((s, r) => s + r.mark, 0) / this.results().length : null);
  readonly subjectGroups = computed(() => summarizeResults(this.results(), 'subject'));
  readonly trend = computed(() => this.assessments().slice().sort((a, b) => a.deadline.localeCompare(b.deadline)).map(a => { const rows = this.allResults().filter(r => r.assessmentId === a.id); return { id: a.id, label: a.name, date: a.deadline, count: rows.length, average: rows.length ? rows.reduce((s, r) => s + r.mark, 0) / rows.length : null }; }));
  readonly roster = computed(() => this.store.roster(this.selectedClass()?.id ?? ''));
  readonly sheets = computed(() => this.store.sheets().filter(s => s.classId === this.selectedClass()?.id).sort((a, b) => b.date.localeCompare(a.date)));
  readonly recordedDatesPage = signal(1);
  readonly recordedDatesPageSize = 10;
  readonly recordedDatesPages = computed(() => Math.max(1, Math.ceil(this.sheets().length / this.recordedDatesPageSize)));
  readonly recordedDatesPageSheets = computed(() => this.sheets().slice((this.recordedDatesPage() - 1) * this.recordedDatesPageSize, this.recordedDatesPage() * this.recordedDatesPageSize));
  readonly revisions = computed(() => this.store.attendanceHistory().filter(s => s.classId === this.selectedClass()?.id && s.date === this.date()).sort((a, b) => b.revision - a.revision));
  readonly saved = computed(() => this.sheets().find(s => s.date === this.date()));
  readonly attendanceRoster = computed(() => this.attendanceDirty() ? this.draftRoster : this.store.attendance.roster(this.selectedClass()?.id ?? '', this.date()));
  readonly attendanceSummary = computed(() => { const entries = this.sheets().flatMap(s => s.entries); return { recorded: entries.length, attended: entries.filter(e => e.status === 'Present' || e.status === 'Late').length, absent: entries.filter(e => e.status === 'Absent').length }; });
  readonly support = computed(() => this.roster().map(s => ({ ...s, failed: this.store.results(true).filter(r => r.className === this.classLabel() && r.studentNumber === s.number && r.assessmentId === this.exam()?.id && r.status === 'approved' && !r.passed).length, absences: this.sheets().flatMap(s => s.entries).filter(e => e.studentId === s.id && e.status === 'Absent').length })).filter(s => s.failed || s.absences >= 3));
  readonly pages = computed(() => Math.max(1, Math.ceil((this.classMode() ? this.studentResults().length : this.results().length) / 25)));
  readonly reportAssessmentId = signal('');
  readonly classReports = computed(() => this.store.reports().filter(report => report.classId === this.selectedClass()?.id && this.assessments().some(a => a.id === report.assessmentId) && (!this.reportAssessmentId() || report.assessmentId === this.reportAssessmentId()) && `${report.student} ${report.studentNumber}`.toLowerCase().includes(this.search().trim().toLowerCase())).sort((a, b) => a.student.localeCompare(b.student)));
  reportCount(classId: string): number { return this.store.reports().filter(report => report.classId === classId).length; }
  classResultCount(classroom: SchoolClass): number { return this.store.results(true).filter(result => result.className === (classroom.stream || classroom.name) && result.assessmentId === this.exam()?.id && result.status === 'approved').length; }
  entries: Partial<Record<string, { status: string; note: string }>> = {}; reason = '';
  constructor() {
    effect(() => { this.store.year()?.id; this.section(); untracked(() => { this.classId.set(''); this.examId.set(''); this.reportAssessmentId.set(''); this.selectedTerm.set(''); this.subject.set(''); this.studentNumber.set(''); this.status.set('approved'); this.search.set(''); this.notice.set(''); this.error.set(''); }); });
    effect(() => { this.selectedClass()?.id; this.recordedDatesPage.set(1); });
    effect(() => { const pages = this.recordedDatesPages(); if (this.recordedDatesPage() > pages) this.recordedDatesPage.set(pages); });
    effect(() => { this.store.attendance.roster(this.selectedClass()?.id ?? '', this.date()); const saved = this.saved(); this.attendanceContext(); untracked(() => { if (this.saving()) return; if (this.attendanceDirty()) { if ((saved?.revision ?? 0) !== this.draftRevision || this.draftContext !== this.attendanceContext()) this.error.set('Attendance changed. Your draft is preserved. Review it before discarding and reloading.'); return; } this.loadAttendanceDraft(); }); });
    effect(() => { this.classId(); this.examId(); this.subject(); this.studentNumber(); this.status(); this.search(); this.page.set(1); });
    effect(() => { if (this.page() > this.pages()) this.page.set(this.pages()); });
  }
  selectClass(value: string): void { if(!this.canLeave())return; this.classId.set(value); this.subject.set(''); this.studentNumber.set(''); this.search.set(''); this.notice.set(''); }
  setAttendance(id: string, field: 'status' | 'note', value: string): void { if(this.saving())return; this.attendanceDirty.set(true); this.entries[id] = { status: '', note: '', ...this.entries[id], [field]: value }; }
  markPresent(): void { if(this.saving())return; for (const row of this.attendanceRoster()) this.setAttendance(row.studentId, 'status', 'Present'); }
  async save(): Promise<void> {
    if(this.saving() || this.store.teacher.readOnly())return;
    if (this.draftContext !== this.attendanceContext()) { this.error.set('Return to the original class, date and year to save this draft, or discard it.'); return; }
    if(!this.selectedClass() || !this.attendanceRoster().length){this.error.set('Choose a class with an attendance roster.');return;}
    const entries = this.attendanceRoster().map(r => ({ ...r, ...this.entries[r.studentId] })) as AttendanceEntry[];
    if(entries.some(entry=>!ATTENDANCE_STATUSES.includes(entry.status))){this.error.set('Choose an attendance status for every student.');return;}
    if(this.draftRevision > 0 && this.reason.trim().length<10){this.error.set('Explain the correction in at least 10 characters.');return;}
    this.saving.set(true);
    const error = await this.store.attendance.save(this.selectedClass()!.id, this.date(), entries, this.reason, this.draftRevision);
    this.saving.set(false);
    if (error) this.error.set(error); else { this.draftRevision++; this.attendanceDirty.set(false); this.reason = ''; this.error.set(''); this.notice.set('Attendance saved. Previous versions remain in the record history.'); }
  }
  attendanceRate(sheet: AttendanceSheet): number { return sheet.entries.length ? sheet.entries.filter(e => ['Present', 'Late'].includes(e.status)).length / sheet.entries.length * 100 : 0; }
}
