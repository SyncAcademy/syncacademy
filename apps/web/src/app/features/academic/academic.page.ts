import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { HeadPageHeaderComponent } from '../headmaster/shared/head-page-header.component';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import { AcademicStore, Assessment, ResultRow, summarizeResults } from './academic.store';
import { gradeMark } from '../teacher/teacher.store';
import { TeacherPickerComponent } from '../../shared/teacher-picker.component';
import { summarizeStudents } from './student-result-summary';
import { reportAverage } from '../headmaster/report.store';
import { newestFirst } from '../../shared/recent-records';

@Component({
  selector: 'app-academic-page', standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HeadPageHeaderComponent, DialogFocusDirective, TeacherPickerComponent],
  templateUrl: './academic.page.html', styleUrls: ['./academic.page.scss'],
})
export class AcademicPage {
  readonly reportAverage = reportAverage;
  readonly store = inject(AcademicStore);
  private readonly route = inject(ActivatedRoute);
  private readonly data = toSignal(this.route.data);
  readonly section = computed(() => this.data()?.['section'] ?? 'dashboard');
  readonly title = computed(() => this.data()?.['title'] ?? 'Overview');
  readonly descriptions: Record<string, string> = {
    dashboard: 'Review academic progress, coordinate teachers, and keep results moving.',
    'marks-review': 'Inspect student marks, approve complete submissions, or return corrections to the teacher.',
    assessments: 'Create an exam, open it, then choose exactly which classes will enter marks.',
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
  readonly listPage=signal(1);
  pageItems<T>(rows:T[]):T[]{return rows.slice((this.listPage()-1)*25,this.listPage()*25);}
  readonly reportScope = signal('approved');
  readonly notice = signal('');
  readonly error = signal('');
  readonly dialog = signal('');
  readonly saving = signal(false);
  readonly detailId = signal('');
  readonly allocationClassIds = signal<string[]>([]);
  form: Record<string, string> = {};
  reassignTeacher: Record<string,string> = {};
  readonly classes = computed(() => [...new Set([...this.store.assignments().map(a => this.store.classLabel(a)), ...this.store.classes().map(c => c.stream || c.name)])].sort());
  readonly subjects = computed(() => [...new Set(this.store.assignments().map(a => a.subjectName))].sort());
  readonly activeTeachers = computed(() => this.store.head.staff().filter(t => t.role === 'teacher' && t.status === 'active').map(t => ({id:t.id,fullName:t.fullName,email:t.email})));
  readonly filteredAssignments = computed(() => newestFirst(this.store.assignments().filter(a =>
    (this.classFilter() === 'all' || this.store.classLabel(a) === this.classFilter()) &&
    (this.statusFilter() === 'all' || a.assessmentProgress.status === this.statusFilter()) &&
    `${a.subjectName} ${this.store.classLabel(a)} ${a.teacherName ?? 'Teacher'}`.toLowerCase().includes(this.search().toLowerCase())), a => a.assessmentProgress.approvedAt ?? a.assessmentProgress.submittedAt ?? a.createdAt));
  readonly review = computed(() => this.store.assignments().find(a => a.id === this.detailId()));
  readonly reviewMarks = computed(() => this.store.entries(this.detailId()));
  readonly reviewScoredCount = computed(() => this.reviewMarks().filter(m => this.valid(m.marksValue)).length);
  readonly reviewAverage = computed(() => { const scores=this.reviewMarks().filter(m => this.valid(m.marksValue)).map(m => m.marksValue!); return scores.length ? scores.reduce((sum,score)=>sum+score,0)/scores.length : null; });
  readonly results = computed(() => this.store.results().filter(r =>
    (this.reportScope() === 'all' || r.status === 'approved') &&
    (this.classFilter() === 'all' || r.className === this.classFilter()) &&
    (this.subjectFilter() === 'all' || r.subject === this.subjectFilter()) &&
    `${r.student} ${r.studentNumber}`.toLowerCase().includes(this.search().toLowerCase())));
  readonly studentResults = computed(() => summarizeStudents(this.store.results().filter(r =>
    (this.reportScope() === 'all' || r.status === 'approved') &&
    (this.classFilter() === 'all' || r.className === this.classFilter()) &&
    (this.subjectFilter() === 'all' || r.subject === this.subjectFilter()))).filter(student =>
      `${student.student} ${student.studentNumber}`.toLowerCase().includes(this.search().trim().toLowerCase())));
  readonly classResults = computed(() => summarizeResults(this.results(), 'className'));
  readonly classResultCards = computed(() => this.store.classes().filter(c => this.classFilter() === 'all' || (c.stream || c.name) === this.classFilter()).map(c => ({ id:c.id, name:c.stream || c.name, summary:this.classResults().find(row => row.label === (c.stream || c.name)) })));
  classIdForName(name:string):string { return this.store.classes().find(c => (c.stream || c.name) === name)?.id ?? ''; }
  readonly subjectResults = computed(() => summarizeResults(this.results(), 'subject'));
  readonly grades = computed(() => Array.from(new Set([...this.store.teacher.grading.forYear(this.store.year()?.id ?? '').bands.map(b => b.label), ...this.results().map(r => r.grade)])).map(label => ({ label, count: this.results().filter(r => r.grade === label).length })));
  readonly resultAverage = computed(() => this.results().length ? this.results().reduce((s, r) => s + r.mark, 0) / this.results().length : null);
  readonly passRate = computed(() => this.results().length ? this.results().filter(r => (r.passed ?? r.mark >= 35)).length / this.results().length * 100 : null);
  readonly allAtRisk = computed(() => this.store.approvedResults().filter(r => r.mark < 50 && `${r.student} ${r.studentNumber} ${r.className} ${r.subject}`.toLowerCase().includes(this.search().toLowerCase())));
  readonly atRisk = computed(() => this.allAtRisk().filter(r => this.classFilter() === 'all' || r.className === this.classFilter()));
  readonly allSupportPlans = computed(() => this.store.support().filter(p=>`${p.student} ${p.className} ${p.subject} ${p.owner}`.toLowerCase().includes(this.search().toLowerCase())));
  readonly supportPlans=computed(()=>this.allSupportPlans().filter(p=>this.classFilter()==='all'||p.className===this.classFilter()));
  readonly assessments=computed(()=>this.store.assessmentsForTerm().filter(a=>`${a.name} ${this.store.years.termName('academic', a.term)}`.toLowerCase().includes(this.search().toLowerCase())));
  readonly allocationCards = computed(() => this.store.classes().map(classroom => {
    const assignedSubjects = this.store.teachingAssignments().filter(assignment => assignment.classId === classroom.id && !!assignment.subjectId && assignment.status === 'active');
    const allocated = this.store.yearAssignments().filter(assignment => assignment.assessmentId === this.detailId() && assignment.classId === classroom.id);
    return { id: classroom.id, name: classroom.stream || classroom.name, students: classroom.studentCount, subjects: assignedSubjects.length, allocated: allocated.length, remaining: Math.max(0, assignedSubjects.length - allocated.length) };
  }));
  readonly availableAllocationIds = computed(() => this.allocationCards().filter(card => card.remaining > 0).map(card => card.id));
  allocatedClasses(assessmentId: string): number { return new Set(this.store.yearAssignments().filter(assignment => assignment.assessmentId === assessmentId).map(assignment => assignment.classId)).size; }
  allocatedSubjects(assessmentId: string): number { return this.store.yearAssignments().filter(assignment => assignment.assessmentId === assessmentId).length; }
  toggleAllocationClass(id: string): void { this.allocationClassIds.update(ids => ids.includes(id) ? ids.filter(current => current !== id) : [...ids, id]); }
  readonly slots=computed(()=>this.store.slots().filter(s=>`${s.className} ${s.subject} ${s.teacher} ${s.room}`.toLowerCase().includes(this.search().toLowerCase())));
  readonly topics=computed(()=>this.store.syllabus().filter(t=>`${t.topic} ${this.topicLabel(t.assignmentId)}`.toLowerCase().includes(this.search().toLowerCase())));
  readonly allPreparedReports=computed(()=>this.store.reports().filter(r=>`${r.student} ${r.studentNumber} ${r.className}`.toLowerCase().includes(this.search().toLowerCase())));
  readonly preparedReports=computed(()=>this.allPreparedReports().filter(r=>this.classFilter()==='all'||r.className===this.classFilter()));
  readonly reportClasses = computed(() => [...new Set([...this.store.assignments().map(a => this.store.classLabel(a)), ...this.store.reports().map(r => r.className)])].sort());
  readonly reportClassCards = computed(() => this.reportClasses().map(name => ({ name, count: this.allPreparedReports().filter(r => r.className === name).length, pending: this.allPreparedReports().filter(r => r.className === name && r.status === 'generated').length, readiness: this.store.readiness(name) })).filter(c => !this.search().trim() || c.count > 0 || c.name.toLowerCase().includes(this.search().trim().toLowerCase())));
  readonly interventionClasses = computed(() => [...new Set([...this.allAtRisk().map(r => r.className), ...this.allSupportPlans().map(p => p.className)])].sort().map(name => ({ name, atRisk: this.allAtRisk().filter(r => r.className === name).length, support: this.allSupportPlans().filter(p => p.className === name).length })));
  readonly teaching = computed(() => this.store.teachingAssignments().filter(a => `${a.teacherName} ${a.classStream || a.className} ${a.subjectName}`.toLowerCase().includes(this.search().toLowerCase())));
  readonly availableSubjects = computed(() => this.store.head.subjects());
  readonly issues = computed(() => this.store.issues().filter(i => (this.statusFilter() === 'all' || (this.statusFilter() === 'resolved' ? !!i.resolvedAt : !i.resolvedAt)) && `${i.description} ${i.issueType}`.toLowerCase().includes(this.search().toLowerCase())));
  readonly listCount=computed(()=>({ 'marks-review':this.filteredAssignments().length,assessments:this.assessments().length,timetable:this.slots().length,'teaching-assignments':this.teaching().length,curriculum:this.topics().length,'academic-reports':this.classFilter()==='all'?this.classResults().length:this.studentResults().length,'student-reports':this.classFilter()==='all'?this.reportClassCards().length:this.preparedReports().length,'roster-issues':this.issues().length,interventions:this.classFilter()==='all'?this.interventionClasses().length:Math.max(this.atRisk().length,this.supportPlans().length) } as Record<string,number>)[this.section()]??0);
  readonly listPages=computed(()=>Math.max(1,Math.ceil(this.listCount()/25)));
  readonly preview = computed(() => this.store.reports().find(r => r.id === this.detailId()));
  readonly pageContext=computed(()=>`${this.store.remote.context()}:${this.store.assessment()?.id}:${this.section()}`);
  constructor() {
    effect(() => {
      this.pageContext();
      untracked(()=>{
      this.classFilter.set('all'); this.subjectFilter.set('all'); this.statusFilter.set('all'); this.search.set('');
      this.close(); this.notice.set(''); });
    });
    effect(()=>{this.section();this.search();this.classFilter();this.subjectFilter();this.statusFilter();this.reportScope();this.listPage.set(1);});
  }
  valid(mark: number | null): boolean { return gradeMark(mark) !== null; }
  completed(id: string): number { return this.store.entries(id).filter(m => this.valid(m.marksValue) || m.noMark === true).length; }
  topicLabel(id: string): string { const a = this.store.teachingAssignments().find(a => a.id === id); return a ? `${a.classStream || a.className} / ${a.subjectName} / ${a.teacherName}` : 'Assignment unavailable'; }
  offeredSubjects(classId: string) { return this.store.head.mappings().filter(m => m.classId === classId); }
  open(mode: string, id = ''): void {
    if(this.store.remote.busy() || this.saving())return;
    this.error.set(''); this.detailId.set(id); this.form = {}; this.dialog.set(mode);
    if (mode === 'assessment' && id) { const a = this.store.assessments().find(a => a.id === id)!; this.form = { name: a.name, term: a.term, deadline: a.deadline }; }
    if (mode === 'assessment' && !id) this.form = { term: this.store.selectedTerm() || this.store.year()?.terms[0]?.key || '' };
    if (mode === 'allocation') this.allocationClassIds.set([]);
  }
  close(): void { if(this.store.remote.busy() || this.saving())return; this.dialog.set(''); this.detailId.set(''); this.error.set(''); this.form = {}; }
  private finish(error: string | null, message: string): void { if (error) this.error.set(error); else { this.close(); this.notice.set(message); } }
  async decide(decision: 'approved' | 'returned'): Promise<void> { this.finish(await this.store.review(this.detailId(), decision, this.form['reason'] ?? ''), decision === 'approved' ? 'Marks approved. The teacher can see the updated status.' : 'Marks returned with your feedback.'); }
  async reassignSupport(id:string):Promise<void>{const teacherMembershipId=this.reassignTeacher[id];if(!teacherMembershipId){this.error.set('Choose a teacher to reassign this plan.');return;}this.error.set('');const error=await this.store.reassignSupport(id,teacherMembershipId);if(error)this.error.set(error);else{delete this.reassignTeacher[id];this.notice.set('Support plan reassigned. The new teacher can respond.');}}
  async save(): Promise<void> {
    const f = this.form;
    if (this.dialog() === 'assessment') this.finish(await this.store.saveAssessment({ name: f['name'] ?? '', term: f['term'] ?? '', deadline: f['deadline'] ?? '' }, this.detailId() || undefined), 'Assessment saved.');
    if (this.dialog() === 'allocation') {
      if (!this.allocationClassIds().length) { this.error.set('Choose at least one class.'); return; }
      this.finish(await this.store.assignAssessment(this.detailId(), this.allocationClassIds()), 'Selected classes assigned. Their subject teachers can confirm rosters and enter marks.');
    }
    if (this.dialog() === 'slot') this.finish(await this.store.saveSlot({ className: f['className'] ?? '', subject: f['subject'] ?? '', teacher: f['teacher'] ?? '', room: f['room'] ?? '', date: f['date'] ?? '', start: f['start'] ?? '', end: f['end'] ?? '' }), 'Exam scheduled.');
    if (this.dialog() === 'topic') this.finish(await this.store.saveTopic(f['assignmentId'] ?? '', f['topic'] ?? '', f['due'] ?? ''), 'Syllabus topic added.');
    if (this.dialog() === 'issue') this.finish(await this.store.resolveIssue(Number(this.detailId()), f['resolution'] ?? ''), 'Issue resolved and teacher notified.');
    if (this.dialog() === 'support') this.finish(await this.store.saveSupport({ studentNumber: f['studentNumber'] ?? '', className: f['className'] ?? '', subject: f['subject'] ?? '', action: f['action'] ?? '', teacherMembershipId: f['teacherMembershipId'] ?? '', due: f['due'] ?? '' }), 'Support plan assigned. The teacher can accept or reject it.');
    if (this.dialog() === 'assignment') {
      if(this.saving())return;
      this.saving.set(true);
      const error=await this.store.saveTeachingAssignment(f['teacherId'] ?? '', f['classId'] ?? '', f['subjectId'] ?? '');
      this.saving.set(false);
      this.finish(error, 'Teaching assignment created.');
    }
  }
  async changeAssessment(a: Assessment): Promise<void> { this.finish(await this.store.changeAssessment(a.id, a.status === 'open' ? 'closed' : 'open'), 'Assessment status updated.'); }
  async prepare(className: string): Promise<void> { this.finish(await this.store.prepareReports(className), 'Reports prepared for headmaster review.'); }
  async removeSlot(id:string):Promise<void>{this.finish(await this.store.removeSlot(id),'Exam removed from the timetable.');}
  async toggleTopic(id:string):Promise<void>{this.finish(await this.store.toggleTopic(id),'Syllabus progress updated.');}
  addSupport(row: ResultRow): void { this.open('support'); this.form = { studentNumber: row.studentNumber, className: row.className, subject: row.subject }; }
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
