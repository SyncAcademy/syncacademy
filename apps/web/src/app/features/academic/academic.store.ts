import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { AcademicYearService } from '../../core/services/academic-year.service';
import { HeadDemoStore } from '../headmaster/head-demo.store';
import { DemoReport, ReportDemoStore } from '../headmaster/report-demo.store';
import { TeacherDemoStore, demoGrade } from '../teacher/teacher-demo.store';
import { RegistrarStore } from '../registrar/registrar.store';
import { TeacherAssignment } from '../teacher/teacher.models';

export interface Assessment { id: string; yearId: string; name: string; term: string; deadline: string; status: 'draft' | 'open' | 'closed'; }
export interface ExamSlot { id: string; yearId: string; assessmentId: string; className: string; subject: string; teacher: string; room: string; date: string; start: string; end: string; }
export interface SyllabusItem { id: string; yearId: string; assignmentId: string; topic: string; due: string; completed: boolean; }
export interface SupportPlan { id: string; yearId: string; studentNumber: string; student: string; className: string; subject: string; action: string; owner: string; due: string; status: 'open' | 'completed'; }
interface AuditEntry { id: string; yearId: string; at: string; message: string; }
interface AcademicState { assessments: Assessment[]; slots: ExamSlot[]; syllabus: SyllabusItem[]; support: SupportPlan[]; audit: AuditEntry[]; }
export interface ResultRow { assignmentId: string; className: string; subject: string; student: string; studentNumber: string; mark: number; passed?: boolean; grade: string; status: string; }
export interface ResultGroup { label: string; count: number; average: number; passRate: number; }

export function summarizeResults(rows: ResultRow[], key: 'className' | 'subject'): ResultGroup[] {
  return [...new Set(rows.map(r => r[key]))].sort().map(label => {
    const group = rows.filter(r => r[key] === label);
    return { label, count: group.length, average: group.reduce((s, r) => s + r.mark, 0) / group.length,
      passRate: group.filter(r => (r.passed ?? r.mark >= 35)).length / group.length * 100 };
  });
}

@Injectable({ providedIn: 'root' })
export class AcademicStore {
  private readonly registry = inject(RegistrarStore);
  readonly years = inject(AcademicYearService);
  readonly teacher = inject(TeacherDemoStore);
  readonly head = inject(HeadDemoStore);
  readonly reportStore = inject(ReportDemoStore);
  readonly year = this.years.academicYear;
  readonly readOnly = computed(()=>true);
  readonly storageAvailable = signal(true);
  private readonly state = signal<AcademicState>(this.restore());
  readonly assessments = computed(() => this.state().assessments.filter(a => a.yearId === this.year()?.id));
  private readonly assessmentChoice = signal('');
  readonly assessment = computed<Assessment | undefined>(() => this.assessments().find(a => a.id === this.assessmentChoice()) ?? this.assessments().find(a => a.status === 'open') ?? this.assessments()[0]);
  readonly yearAssignments = computed(() => this.teacher.state().assignments.filter(a => a.academicYearId === this.year()?.id));
  readonly assignments = computed(() => this.yearAssignments().filter(a => this.assessmentId(a) === this.assessment()?.id));
  readonly teachingAssignments = computed(() => this.head.assignments().filter(a => a.academicYearId === this.year()?.id));
  readonly classes = computed(() => this.head.classes().filter(c => (c.academicYearId ?? 'ay-1') === this.year()?.id));
  readonly slots = computed(() => this.state().slots.filter(s => s.yearId === this.year()?.id && s.assessmentId === this.assessment()?.id).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)));
  readonly syllabus = computed(() => this.state().syllabus.filter(s => s.yearId === this.year()?.id));
  readonly support = computed(() => this.state().support.filter(s => s.yearId === this.year()?.id));
  readonly audit = computed(() => this.state().audit.filter(s => s.yearId === this.year()?.id).slice(0, 12));
  readonly issues = computed(() => this.teacher.state().issues.map((issue, index) => ({ ...issue, index,
    assignment: this.yearAssignments().find(a => a.id === issue.assignmentId) })).filter(i => i.assignment));
  readonly openIssueCount = computed(() => this.issues().filter(i => !i.resolvedAt).length);
  readonly reports = computed(() => this.reportStore.forYear(this.year()?.id ?? '').filter(r => r.assessmentId === this.assessment()?.id));
  readonly attentionCount = computed(() => this.assignments().filter(a => a.assessmentProgress.status === 'submitted').length + this.openIssueCount());
  readonly results = computed<ResultRow[]>(() => this.assignments().flatMap(a => this.entries(a.id).filter(m => demoGrade(m.marksValue) !== null).map(m => ({
    assignmentId: a.id, className: this.classLabel(a), subject: a.subjectName, student: m.fullName,
    studentNumber: m.studentNumber, mark: m.marksValue!, grade: this.teacher.grade(a.id, m.marksValue)!, passed: m.marksValue! >= this.teacher.policyFor(a).passMark, status: a.assessmentProgress.status,
  }))));
  readonly approvedResults = computed(() => this.results().filter(r => r.status === 'approved'));
  readonly summary = computed(() => ({
    submissions: this.assignments().filter(a => a.assessmentProgress.status === 'submitted').length,
    approved: this.assignments().filter(a => a.assessmentProgress.status === 'approved').length,
    missing: this.assignments().reduce((sum, a) => sum + Math.max(0, a.studentCount - this.entries(a.id).filter(m => demoGrade(m.marksValue) !== null).length), 0),
    average: this.approvedResults().length ? this.approvedResults().reduce((s, r) => s + r.mark, 0) / this.approvedResults().length : null,
    coverage: this.syllabus().length ? this.syllabus().filter(s => s.completed).length / this.syllabus().length * 100 : 0,
  }));

  constructor() {}
  forYear(yearId: string) {
    const s = this.state();
    return { assessments: s.assessments.filter(r => r.yearId === yearId), slots: s.slots.filter(r => r.yearId === yearId), syllabus: s.syllabus.filter(r => r.yearId === yearId), support: s.support.filter(r => r.yearId === yearId), audit: s.audit.filter(r => r.yearId === yearId) };
  }
  selectAssessment(id: string): void { if (this.assessments().some(a => a.id === id)) this.assessmentChoice.set(id); }
  assessmentId(a: TeacherAssignment): string { return a.assessmentId ?? (a.academicYearId === 'ay-1' ? 'exam-2026-t2' : ''); }
  classLabel(a: TeacherAssignment): string { return a.classStream || a.className; }
  entries(id: string) { return this.assignments().some(a => a.id === id) ? (this.teacher.state().marks[id] ?? []).map(m => ({ ...m, grade: this.teacher.grade(id, m.marksValue) })) : []; }
  private id(prefix: string): string { return `${prefix}-${crypto.randomUUID()}`; }
  private log(message: string): void {
    this.state.update(s => ({ ...s, audit: [{ id: this.id('audit'), yearId: this.year()!.id, at: new Date().toISOString(), message }, ...s.audit] }));
  }
  private writable(): string | null { return this.readOnly() ? 'This academic year is read-only.' : null; }
  review(id: string, decision: 'approved' | 'returned', reason = ''): string | null {
    const blocked = this.writable(); if (blocked) return blocked;
    if (this.assessment()?.status === 'closed') return 'This assessment is closed.';
    const a = this.assignments().find(a => a.id === id);
    if (!a || a.assessmentProgress.status !== 'submitted') return 'Only submitted marks can be reviewed.';
    if (decision === 'returned' && reason.trim().length < 10) return 'Explain the required corrections in at least 10 characters.';
    const marks = this.entries(id);
    if (decision === 'approved' && (a.rosterStatus !== 'confirmed' || !a.studentCount || marks.length !== a.studentCount || marks.some(m => demoGrade(m.marksValue) === null))) return 'Confirm the roster and complete all valid marks before approval.';
    const at = new Date().toISOString();
    this.teacher.state.update(s => ({ ...s,
      assignments: s.assignments.map(item => item.id === id ? { ...item, assessmentProgress: { ...item.assessmentProgress,
        status: decision, approvedAt: decision === 'approved' ? at : null, returnReason: decision === 'returned' ? reason.trim() : null } } : item),
      notifications: [{ id: this.id('notification'), type: decision === 'approved' ? 'marks_approved' : 'marks_returned',
        relatedAssignmentId: id, read: false, createdAt: at,
        message: `${this.classLabel(a)} ${a.subjectName}: ${decision === 'approved' ? 'marks approved' : reason.trim()}.` }, ...s.notifications],
    }));
    this.log(`${this.classLabel(a)} / ${a.subjectName}: ${decision}${reason ? ` — ${reason.trim()}` : ''}`);
    return null;
  }
  saveAssessment(input: Omit<Assessment, 'id' | 'yearId' | 'status'>, id?: string): string | null {
    const blocked = this.writable(); if (blocked) return blocked;
    if (!input.name.trim() || !['Term 1', 'Term 2', 'Term 3'].includes(input.term) || !this.validDate(input.deadline)) return 'Enter a name, term, and deadline within the selected academic year.';
    if (this.assessments().some(a => a.id !== id && a.name.toLowerCase() === input.name.trim().toLowerCase() && a.term === input.term)) return 'This assessment already exists in the selected term.';
    if (id && !this.assessments().some(a => a.id === id && a.status !== 'closed')) return 'Closed assessments cannot be edited.';
    const record = { ...input, name: input.name.trim() };
    this.state.update(s => ({ ...s, assessments: id ? s.assessments.map(a => a.id === id ? { ...a, ...record } : a) : [...s.assessments, { ...record, id: this.id('exam'), yearId: this.year()!.id, status: 'draft' }] }));
    this.log(`${id ? 'Updated' : 'Created'} assessment: ${record.name}`); return null;
  }
  changeAssessment(id: string, status: 'open' | 'closed'): string | null {
    const blocked = this.writable(); if (blocked) return blocked;
    const a = this.assessments().find(a => a.id === id);
    if (!a || a.status === 'closed' || (status === 'open' && a.status !== 'draft') || (status === 'closed' && a.status !== 'open')) return 'This assessment transition is unavailable.';
    if (status === 'closed' && this.yearAssignments().some(item => this.assessmentId(item) === id && item.assessmentProgress.status !== 'approved')) return 'Approve all assigned submissions before closing this assessment.';
    this.state.update(s => ({ ...s, assessments: s.assessments.map(item => item.id === id ? { ...item, status } : item) }));
    this.log(`${a.name}: ${status}`); return null;
  }
  assignAssessment(id: string): string | null {
    const blocked = this.writable(); if (blocked) return blocked;
    const assessment = this.assessments().find(a => a.id === id && a.status === 'open');
    if (!assessment) return 'Open the assessment before assigning classes.';
    const key = (a: TeacherAssignment) => `${a.teacherId ?? 'demo-teacher'}|${this.classLabel(a)}|${a.subjectCode}`;
    const templates = new Map(this.yearAssignments().map(a => [key(a), a]));
    const existing = new Set(this.yearAssignments().filter(a => this.assessmentId(a) === id).map(key));

    let count = 0;
    for (const [templateKey, source] of templates) {
      if (existing.has(templateKey)) continue;
      const assignmentId = this.id('submission');
      const marks = (this.teacher.state().marks[source.id] ?? []).map((m, i) => ({ ...m, studentId: `${assignmentId}-${i}`, marksValue: null, grade: null, comments: '', lastSaved: null }));
      if (marks.length !== source.studentCount) continue;
      const assignment: TeacherAssignment = { ...source, gradingPolicy: undefined, id: assignmentId, assessmentId: id, assessmentName: `${assessment.term} / ${assessment.name}`,
        assessmentProgress: { total: source.studentCount, completed: 0, status: 'draft', submittedAt: null, approvedAt: null, returnReason: null } };
      this.teacher.state.update(s => ({ ...s, assignments: [...s.assignments, assignment], marks: { ...s.marks, [assignmentId]: marks } }));
      count++;
    }
    count += this.allocateNewTeaching(assessment);
    this.log(`${assessment.name}: ${count} class-subject submissions assigned`);
    return count ? null : 'All established class-subject rosters are already assigned to this assessment.';
  }
  private validDate(date: string): boolean { return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date && date >= this.year()!.startDate && date <= this.year()!.endDate; }
  saveSlot(input: Omit<ExamSlot, 'id' | 'yearId' | 'assessmentId'>): string | null {
    const blocked = this.writable(); if (blocked) return blocked;
    if (!this.assessment() || this.assessment()?.status === 'closed') return 'Select an open or draft assessment.';
    if (!this.classes().some(c => (c.stream || c.name) === input.className) || !this.head.subjects().some(s => s.name === input.subject) || !input.teacher.trim() || !input.room.trim() || !this.validDate(input.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.end) || input.end <= input.start) return 'Complete all fields with a valid class, subject, date, and an end time after the start time.';
    const norm = (value: string) => value.trim().toLowerCase();
    if (this.state().slots.some(s => s.yearId === this.year()?.id && s.date === input.date && input.start < s.end && input.end > s.start &&
      (norm(s.className) === norm(input.className) || norm(s.teacher) === norm(input.teacher) || norm(s.room) === norm(input.room)))) return 'Time conflict: this class, invigilator, or room already has an exam in that time slot.';
    this.state.update(s => ({ ...s, slots: [...s.slots, { ...input, teacher: input.teacher.trim(), room: input.room.trim(), id: this.id('slot'), yearId: this.year()!.id, assessmentId: this.assessment()!.id }] }));
    this.log(`Scheduled ${input.className} / ${input.subject} on ${input.date}`); return null;
  }
  removeSlot(id: string): void { if (!this.readOnly() && this.assessment()?.status !== 'closed' && this.slots().some(s => s.id === id)) this.state.update(s => ({ ...s, slots: s.slots.filter(slot => slot.id !== id) })); }
  saveTopic(assignmentId: string, topic: string, due: string): string | null {
    const blocked = this.writable(); if (blocked) return blocked;
    if (!this.teachingAssignments().some(a => a.id === assignmentId) || topic.trim().length < 3 || !this.validDate(due)) return 'Choose a teaching assignment, enter a topic, and set a date within this academic year.';
    this.state.update(s => ({ ...s, syllabus: [...s.syllabus, { id: this.id('topic'), yearId: this.year()!.id, assignmentId, topic: topic.trim(), due, completed: false }] })); return null;
  }
  async saveTeachingAssignment(teacherId:string,classId:string,subjectId:string):Promise<string|null>{try{await this.head.api.write('assignments',{membershipId:teacherId,classroomId:classId});return null;}catch(e){return this.head.api.auth.error(e);}}
  private allocateNewTeaching(assessment: Assessment): number {
    let count = 0;
    // Newly created allocations use registry rosters; retain legacy assessment fixtures unchanged.
    for (const allocation of this.teachingAssignments().filter(a => a.status === 'active' && a.id.startsWith('teaching-'))) {
      const subject = this.head.subjects().find(s => s.id === allocation.subjectId)!;
      if (this.yearAssignments().some(a => this.assessmentId(a) === assessment.id && this.classLabel(a) === (allocation.classStream || allocation.className) && a.subjectCode === subject.code)) continue;
      const roster = this.registry.enrolmentsFor(assessment.yearId).filter(e => e.classId === allocation.classId && e.status === 'active');
      const id = this.id('submission');
      const assignment: TeacherAssignment = { id, classId: allocation.classId, subjectId: subject.id, teacherId: allocation.teacherId, teacherName: allocation.teacherName, className: allocation.className, classStream: allocation.classStream, subjectName: subject.name, subjectCode: subject.code, academicYearId: assessment.yearId, academicYearLabel: this.year()!.label, assessmentId: assessment.id, assessmentName: `${assessment.term} / ${assessment.name}`, studentCount: roster.length, rosterStatus: 'pending', assessmentProgress: { total: roster.length, completed: 0, status: 'draft', submittedAt: null, approvedAt: null, returnReason: null } };
      const marks = roster.map(e => ({ studentId: e.studentId, studentNumber: this.registry.student(e.studentId)!.number, fullName: e.studentName, gender: this.registry.student(e.studentId)!.gender, marksValue: null, grade: null, comments: '', lastSaved: null }));
      this.teacher.state.update(s => ({ ...s, assignments: [...s.assignments, assignment], marks: { ...s.marks, [id]: marks } })); count++;
    }
    return count;
  }
  toggleTopic(id: string): void { if (!this.readOnly() && this.syllabus().some(t => t.id === id)) this.state.update(s => ({ ...s, syllabus: s.syllabus.map(t => t.id === id ? { ...t, completed: !t.completed } : t) })); }
  resolveIssue(index: number, resolution: string): string | null {
    const blocked = this.writable(); if (blocked) return blocked;
    const issue = this.issues().find(i => i.index === index && !i.resolvedAt);
    if (!issue || resolution.trim().length < 10) return 'Select an open issue and describe its resolution in at least 10 characters.';
    const at = new Date().toISOString();
    this.teacher.state.update(s => ({ ...s, issues: s.issues.map((item, i) => i === index ? { ...item, resolvedAt: at, resolution: resolution.trim() } : item),
      notifications: [{ id: this.id('notification'), type: 'roster_issue_resolved', relatedAssignmentId: issue.assignmentId,
        read: false, createdAt: at, message: `Roster issue resolved: ${resolution.trim()}` }, ...s.notifications] }));
    this.log(`Resolved roster issue: ${resolution.trim()}`); return null;
  }
  saveSupport(input: Omit<SupportPlan, 'id' | 'yearId' | 'status'>): string | null {
    const blocked = this.writable(); if (blocked) return blocked;
    if (!input.studentNumber || !input.student.trim() || !input.className || !input.subject || input.action.trim().length < 10 || !input.owner.trim() || !this.validDate(input.due)) return 'Complete the student details, support action (at least 10 characters), owner, and review date.';
    this.state.update(s => ({ ...s, support: [...s.support, { ...input, id: this.id('support'), yearId: this.year()!.id, status: 'open' }] })); return null;
  }
  completeSupport(id: string): void { if (!this.readOnly() && this.support().some(p => p.id === id)) this.state.update(s => ({ ...s, support: s.support.map(p => p.id === id ? { ...p, status: 'completed' } : p) })); }
  readiness(className: string): string | null {
    const assignments = this.assignments().filter(a => this.classLabel(a) === className);
    if (!assignments.length || assignments.some(a => a.assessmentProgress.status !== 'approved')) return 'Awaiting approval of all assigned subjects.';
    const numbers = this.entries(assignments[0].id).map(m => m.studentNumber).sort().join('|');
    if (assignments.some(a => this.entries(a.id).length !== a.studentCount || this.entries(a.id).some(m => demoGrade(m.marksValue) === null) || this.entries(a.id).map(m => m.studentNumber).sort().join('|') !== numbers)) return 'Reconcile student lists and missing marks across subjects.';
    return null;
  }
  prepareReports(className: string): string | null {
    const blocked = this.writable() ?? this.readiness(className); if (blocked) return blocked;
    const assignments = this.assignments().filter(a => this.classLabel(a) === className);
    const records: DemoReport[] = this.entries(assignments[0].id).map(m => ({
      id: `academic-${this.assessment()!.id}-${encodeURIComponent(className)}-${m.studentNumber}`,
      academicYearId: this.year()!.id, assessmentId: this.assessment()!.id, student: m.fullName, studentNumber: m.studentNumber,
      className, period: `${this.year()!.label} · ${this.assessment()!.term} · ${this.assessment()!.name}`,
      academicApproved: true, status: 'generated', recipients: [],
      results: assignments.map(a => { const entry = this.entries(a.id).find(e => e.studentNumber === m.studentNumber)!; return { subject: a.subjectName, mark: entry.marksValue!, grade: this.teacher.grade(a.id, entry.marksValue)! }; }),
    }));
    const count = this.reportStore.receiveAcademicReports(records);
    this.log(`${className}: ${count} student reports prepared for headmaster review`); return null;
  }
  private restore():AcademicState{return {assessments:[],slots:[],syllabus:[],support:[],audit:[]};}
  private seedSchoolResults():void {}
}
