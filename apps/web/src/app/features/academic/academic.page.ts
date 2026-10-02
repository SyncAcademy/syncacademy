import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { HeadPageHeaderComponent } from '../headmaster/shared/head-page-header.component';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import { AcademicStore, Assessment, ResultRow, summarizeResults } from './academic.store';
import { demoGrade } from '../teacher/teacher-demo.store';

@Component({
  selector: 'app-academic-page', standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HeadPageHeaderComponent, DialogFocusDirective],
  templateUrl: './academic.page.html', styleUrls: ['./academic.page.scss'],
})
export class AcademicPage {
  readonly store = inject(AcademicStore);
  private readonly route = inject(ActivatedRoute);
  private readonly data = toSignal(this.route.data);
  readonly section = computed(() => this.data()?.['section'] ?? 'dashboard');
  readonly title = computed(() => this.data()?.['title'] ?? 'Overview');
  readonly descriptions: Record<string, string> = {
    dashboard: 'Review academic progress, coordinate teachers, and keep results moving.',
    'marks-review': 'Inspect student marks, approve complete submissions, or return corrections to the teacher.',
    assessments: 'Plan assessments, set deadlines, and manage the review cycle.',
    timetable: 'Schedule exams and invigilators with class, room, and time conflict checks.',
    'teaching-assignments': 'Coordinate teachers, classes, and subjects for the selected academic year.',
    curriculum: 'Track planned topics and syllabus completion across teaching assignments.',
    'academic-reports': 'Compare class and subject performance using the recorded student results.',
    'student-reports': 'Prepare approved results for headmaster review and report release.',
    'roster-issues': 'Review teacher-reported student list issues and record how they were resolved.',
    interventions: 'Identify students needing support and track follow-up actions.',
    settings: 'Review the grading policy and academic workflow used by this school.',
  };
  readonly classFilter = signal('all');
  readonly subjectFilter = signal('all');
  readonly statusFilter = signal('all');
  readonly search = signal('');
  readonly reportScope = signal('approved');
  readonly notice = signal('');
  readonly error = signal('');
  readonly dialog = signal('');
  readonly detailId = signal('');
  form: Record<string, string> = {};
  readonly classes = computed(() => [...new Set([...this.store.assignments().map(a => this.store.classLabel(a)), ...this.store.classes().map(c => c.stream || c.name)])].sort());
  readonly subjects = computed(() => [...new Set(this.store.assignments().map(a => a.subjectName))].sort());
  readonly filteredAssignments = computed(() => this.store.assignments().filter(a =>
    (this.classFilter() === 'all' || this.store.classLabel(a) === this.classFilter()) &&
    (this.statusFilter() === 'all' || a.assessmentProgress.status === this.statusFilter()) &&
    `${a.subjectName} ${this.store.classLabel(a)} ${a.teacherName ?? 'John Mwangi'}`.toLowerCase().includes(this.search().toLowerCase())));
  readonly review = computed(() => this.store.assignments().find(a => a.id === this.detailId()));
  readonly reviewMarks = computed(() => this.store.entries(this.detailId()));
  readonly results = computed(() => this.store.results().filter(r =>
    (this.reportScope() === 'all' || r.status === 'approved') &&
    (this.classFilter() === 'all' || r.className === this.classFilter()) &&
    (this.subjectFilter() === 'all' || r.subject === this.subjectFilter()) &&
    `${r.student} ${r.studentNumber}`.toLowerCase().includes(this.search().toLowerCase())));
  readonly classResults = computed(() => summarizeResults(this.results(), 'className'));
  readonly subjectResults = computed(() => summarizeResults(this.results(), 'subject'));
  readonly grades = computed(() => Array.from(new Set([...this.store.teacher.grading.forYear(this.store.year()?.id ?? '').bands.map(b => b.label), ...this.results().map(r => r.grade)])).map(label => ({ label, count: this.results().filter(r => r.grade === label).length })));
  readonly resultAverage = computed(() => this.results().length ? this.results().reduce((s, r) => s + r.mark, 0) / this.results().length : null);
  readonly passRate = computed(() => this.results().length ? this.results().filter(r => (r.passed ?? r.mark >= 35)).length / this.results().length * 100 : null);
  readonly atRisk = computed(() => this.store.approvedResults().filter(r => r.mark < 50));
  readonly reportClasses = computed(() => [...new Set(this.store.assignments().map(a => this.store.classLabel(a)))].sort());
  readonly teaching = computed(() => this.store.teachingAssignments().filter(a => `${a.teacherName} ${a.classStream || a.className} ${a.subjectName}`.toLowerCase().includes(this.search().toLowerCase())));
  readonly availableSubjects = computed(() => this.store.head.subjects());
  readonly issues = computed(() => this.store.issues().filter(i => this.statusFilter() === 'all' || (this.statusFilter() === 'resolved' ? !!i.resolvedAt : !i.resolvedAt)));
  readonly preview = computed(() => this.store.reports().find(r => r.id === this.detailId()));
  constructor() {
    effect(() => {
      this.store.year(); this.store.assessment(); this.section();
      this.classFilter.set('all'); this.subjectFilter.set('all'); this.statusFilter.set('all'); this.search.set('');
      this.close(); this.notice.set('');
    });
  }
  valid(mark: number | null): boolean { return demoGrade(mark) !== null; }
  completed(id: string): number { return this.store.entries(id).filter(m => this.valid(m.marksValue)).length; }
  topicLabel(id: string): string { const a = this.store.teachingAssignments().find(a => a.id === id); return a ? `${a.classStream || a.className} / ${a.subjectName} / ${a.teacherName}` : 'Assignment unavailable'; }
  open(mode: string, id = ''): void {
    this.error.set(''); this.detailId.set(id); this.form = {}; this.dialog.set(mode);
    if (mode === 'assessment' && id) { const a = this.store.assessments().find(a => a.id === id)!; this.form = { name: a.name, term: a.term, deadline: a.deadline }; }
    if (mode === 'assessment' && !id) this.form = { term: 'Term 2' };
  }
  close(): void { this.dialog.set(''); this.detailId.set(''); this.error.set(''); this.form = {}; }
  private finish(error: string | null, message: string): void { if (error) this.error.set(error); else { this.close(); this.notice.set(message); } }
  decide(decision: 'approved' | 'returned'): void { this.finish(this.store.review(this.detailId(), decision, this.form['reason'] ?? ''), decision === 'approved' ? 'Marks approved. The teacher can see the updated status.' : 'Marks returned with your feedback.'); }
  async save(): Promise<void> {
    const f = this.form;
    if (this.dialog() === 'assessment') this.finish(this.store.saveAssessment({ name: f['name'] ?? '', term: f['term'] ?? '', deadline: f['deadline'] ?? '' }, this.detailId() || undefined), 'Assessment saved.');
    if (this.dialog() === 'slot') this.finish(this.store.saveSlot({ className: f['className'] ?? '', subject: f['subject'] ?? '', teacher: f['teacher'] ?? '', room: f['room'] ?? '', date: f['date'] ?? '', start: f['start'] ?? '', end: f['end'] ?? '' }), 'Exam scheduled.');
    if (this.dialog() === 'topic') this.finish(this.store.saveTopic(f['assignmentId'] ?? '', f['topic'] ?? '', f['due'] ?? ''), 'Syllabus topic added.');
    if (this.dialog() === 'issue') this.finish(this.store.resolveIssue(Number(this.detailId()), f['resolution'] ?? ''), 'Issue resolved and teacher notified.');
    if (this.dialog() === 'support') this.finish(this.store.saveSupport({ studentNumber: f['studentNumber'] ?? '', student: f['student'] ?? '', className: f['className'] ?? '', subject: f['subject'] ?? '', action: f['action'] ?? '', owner: f['owner'] ?? '', due: f['due'] ?? '' }), 'Support plan saved.');
    if (this.dialog() === 'assignment') this.finish(await this.store.saveTeachingAssignment(f['teacherId'] ?? '', f['classId'] ?? '', f['subjectId'] ?? ''), 'Teaching assignment created.');
  }
  changeAssessment(a: Assessment): void { this.finish(this.store.changeAssessment(a.id, a.status === 'draft' ? 'open' : 'closed'), 'Assessment status updated.'); }
  assignAssessment(a: Assessment): void { this.finish(this.store.assignAssessment(a.id), 'Existing class rosters assigned. Teachers can now enter marks for this assessment.'); }
  prepare(className: string): void { this.finish(this.store.prepareReports(className), 'Reports prepared for headmaster review. Guardian details must be verified before delivery.'); }
  addSupport(row: ResultRow): void { this.open('support'); this.form = { studentNumber: row.studentNumber, student: row.student, className: row.className, subject: row.subject }; }
  resetFilters(): void { this.classFilter.set('all'); this.subjectFilter.set('all'); this.search.set(''); this.statusFilter.set('all'); }
  exportResults(): void {
    this.download('academic-results', ['Academic year', 'Assessment', 'Class', 'Subject', 'Student number', 'Student', 'Mark', 'Grade', 'Status'], this.results().map(r => [this.store.year()?.label ?? '', this.store.assessment()?.name ?? '', r.className, r.subject, r.studentNumber, r.student, r.mark, r.grade, r.status]));
  }
  exportTimetable(): void { this.download('exam-timetable', ['Date', 'Start', 'End', 'Class', 'Subject', 'Invigilator', 'Room'], this.store.slots().map(s => [s.date, s.start, s.end, s.className, s.subject, s.teacher, s.room])); }
  private download(name: string, headers: string[], rows: (string | number)[][]): void {
    const cell = (value: string | number) => { let text = String(value); if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`; return `"${text.replace(/"/g, '""')}"`; };
    const csv = [headers, ...rows].map(row => row.map(cell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `${name}-${this.store.year()?.label ?? 'year'}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  print(): void { window.print(); }
}
