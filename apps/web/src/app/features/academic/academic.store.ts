import { AcademicDataService } from '../../core/services/academic-data.service';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AcademicYearService } from '../../core/services/academic-year.service';
import { HeadStore } from '../headmaster/head.store';
import { SchoolReport, ReportStore } from '../headmaster/report.store';
import { TeacherStore, gradeMark } from '../teacher/teacher.store';
import { RegistrarStore } from '../registrar/registrar.store';
import { TeacherAssignment } from '../teacher/teacher.models';
import { newestFirst } from '../../shared/recent-records';

export interface Assessment { id: string; yearId: string; name: string; term: string; deadline: string; createdAt?: string; status: 'draft' | 'open' | 'closed'; }
export interface ExamSlot { id: string; yearId: string; assessmentId: string; className: string; subject: string; teacher: string; room: string; date: string; start: string; end: string; createdAt?: string; }
export interface SyllabusItem { id: string; yearId: string; assignmentId: string; topic: string; due: string; completed: boolean; createdAt?: string; }
export interface SupportPlan { id: string; yearId: string; studentNumber: string; student: string; className: string; subject: string; action: string; owner: string; teacherId?: string; teacherMembershipId?: string; due: string; createdAt?: string; status: 'pending' | 'accepted' | 'rejected' | 'open' | 'completed'; responseReason?: string; respondedAt?: string | null; history?: {teacherId:string;teacherName:string;decision:'accepted'|'rejected';reason:string;at:string}[]; }
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
  readonly teacher = inject(TeacherStore);
  readonly head = inject(HeadStore);
  readonly reportStore = inject(ReportStore);
  readonly remote=inject(AcademicDataService);
  readonly year = this.years.academicYear;
  readonly readOnly = computed(()=>this.years.readOnly('academic') || this.remote.busy());
  readonly storageAvailable = signal(true);
  private readonly state = computed<AcademicState>(()=>this.remote.data());
  readonly assessments = computed(() => newestFirst(this.state().assessments.filter(a => a.yearId === this.year()?.id), a => a.createdAt));
  readonly selectedTerm = signal('');
  inSelectedTerm(date: string): boolean { const term = this.year()?.terms.find(item => item.key === this.selectedTerm()); return !this.selectedTerm() || !!term && date >= term.startsAt && date <= term.endsAt; }
  readonly assessmentsForTerm = computed(() => this.assessments().filter(a => !this.selectedTerm() || a.term === this.selectedTerm()));
  selectTerm(term: string): void { this.selectedTerm.set(term); this.assessmentChoice.set(''); }
  private readonly assessmentChoice = signal('');
  readonly assessment = computed<Assessment | undefined>(() => this.assessmentsForTerm().find(a => a.id === this.assessmentChoice()) ?? this.assessmentsForTerm()[0]);
  readonly yearAssignments = computed(() => this.teacher.state().assignments.filter(a => a.academicYearId === this.year()?.id));
  readonly assignments = computed(() => this.yearAssignments().filter(a => this.assessmentId(a) === this.assessment()?.id));
  readonly teachingAssignments = computed(() => this.head.assignments().filter(a => a.academicYearId === this.year()?.id));
  readonly classes = computed(() => this.head.classes().filter(c => (c.academicYearId ?? 'ay-1') === this.year()?.id));
  readonly slots = computed(() => newestFirst(this.state().slots.filter(s => s.yearId === this.year()?.id && s.assessmentId === this.assessment()?.id), s => s.date + 'T' + s.start));
  readonly syllabus = computed(() => newestFirst(this.state().syllabus.filter(s => s.yearId === this.year()?.id && this.inSelectedTerm(s.due)), s => s.createdAt));
  readonly support = computed(() => newestFirst(this.state().support.filter(s => s.yearId === this.year()?.id && this.inSelectedTerm(s.due)), s => s.createdAt));
  readonly audit = computed(() => this.state().audit.filter(s => s.yearId === this.year()?.id).slice(0, 12));
  readonly issues = computed(() => this.teacher.state().issues.map((issue, index) => ({ ...issue, index,
    assignment: this.yearAssignments().find(a => a.id === issue.assignmentId) })).filter(i => i.assignment));
  readonly openIssueCount = computed(() => (this.head.api.data()?.registryIssues || []).filter((i:any)=>i.assignment.classroom.yearId===this.year()?.id).length);
  readonly reports = computed(() => newestFirst(this.reportStore.forYear(this.year()?.id ?? '').filter(r => r.assessmentId === this.assessment()?.id), r => r.createdAt));
  readonly attentionCount = computed(() => this.assignments().filter(a => a.assessmentProgress.status === 'submitted').length + this.openIssueCount());
  readonly results = computed<ResultRow[]>(() => this.assignments().flatMap(a => this.entries(a.id).filter(m => gradeMark(m.marksValue) !== null).map(m => ({
    assignmentId: a.id, className: this.classLabel(a), subject: a.subjectName, student: m.fullName,
    studentNumber: m.studentNumber, mark: m.marksValue!, grade: this.teacher.grade(a.id, m.marksValue)!, passed: m.marksValue! >= this.teacher.policyFor(a).passMark, status: a.assessmentProgress.status,
  }))));
  readonly approvedResults = computed(() => this.results().filter(r => r.status === 'approved'));
  readonly summary = computed(() => ({
    submissions: this.assignments().filter(a => a.assessmentProgress.status === 'submitted').length,
    approved: this.assignments().filter(a => a.assessmentProgress.status === 'approved').length,
    missing: this.assignments().reduce((sum, a) => sum + Math.max(0, a.studentCount - ((a as any).resultStats?.count ?? this.entries(a.id).filter(m => gradeMark(m.marksValue) !== null).length)), 0),
    average: this.remote.data().view==='overview' ? this.overviewAverage() : this.approvedResults().length ? this.approvedResults().reduce((s, r) => s + r.mark, 0) / this.approvedResults().length : null,
    coverage: this.syllabus().length ? this.syllabus().filter(s => s.completed).length / this.syllabus().length * 100 : 0,
  }));

  private overviewAverage():number|null {
    const rows=this.assignments().filter(a=>a.assessmentProgress.status==='approved');
    const count=rows.reduce((n,a)=>n+((a as any).resultStats?.count??0),0);
    return count?rows.reduce((n,a)=>n+((a as any).resultStats?.sum??0),0)/count:null;
  }

  constructor() { effect(() => { this.year()?.id; untracked(() => this.selectTerm('')); }); }
  forYear(yearId: string) {
    const s = this.state();
    return { assessments: newestFirst(s.assessments.filter(r => r.yearId === yearId), r => r.createdAt), slots: newestFirst(s.slots.filter(r => r.yearId === yearId), r => r.date + 'T' + r.start), syllabus: newestFirst(s.syllabus.filter(r => r.yearId === yearId), r => r.createdAt), support: newestFirst(s.support.filter(r => r.yearId === yearId), r => r.createdAt), audit: s.audit.filter(r => r.yearId === yearId) };
  }
  selectAssessment(id: string): void { if (this.assessments().some(a => a.id === id)) this.assessmentChoice.set(id); }
  assessmentId(a: TeacherAssignment): string { return a.assessmentId ?? ''; }
  classLabel(a: TeacherAssignment): string { return a.classStream || a.className; }
  entries(id: string) { return this.assignments().some(a => a.id === id) ? (this.teacher.state().marks[id] ?? []).map(m => ({ ...m, grade: this.teacher.grade(id, m.marksValue) })) : []; }

  review(id:string,reason:string){return this.remote.command('review',{id,decision:'returned',reason});}
  reviewClass(assessmentId:string,classId:string){return this.remote.command('review-class',{assessmentId,classId});}
  saveAssessment(input:Omit<Assessment,'id'|'yearId'|'status'>,id?:string){return this.remote.command('assessment',{...input,...(id?{id}:{})});}
  changeAssessment(id:string,status:'open'|'closed'){return this.remote.command('assessment-status',{id,status});}
  assignAssessment(id:string,classIds:string[]){return this.remote.command('allocate',{id,classIds});}
  saveSlot(input:Omit<ExamSlot,'id'|'yearId'|'assessmentId'>){return this.remote.command('slot',{...input,assessmentId:this.assessment()?.id});}
  removeSlot(id:string){return this.remote.command('remove-slot',{id});}
  saveTopic(assignmentId:string,topic:string,due:string){return this.remote.command('topic',{assignmentId,topic,due});}
  toggleTopic(id:string){return this.remote.command('toggle-topic',{id});}
  resolveIssue(index:number,resolution:string){return Promise.resolve('Use the Roster Issues page to resolve registry issues.');}
  saveSupport(input:{studentNumber:string;className:string;subject:string;action:string;teacherMembershipId:string;due:string}){return this.remote.command('support',input);}
  completeSupport(id:string){return this.remote.command('complete-support',{id});}
  reassignSupport(id:string,teacherMembershipId:string){return this.remote.command('reassign-support',{id,teacherMembershipId});}
  readiness(className:string):string|null {
    const assessmentId=this.assessment()?.id;
    if(!assessmentId)return 'Choose an assessment first.';
    const rows=this.remote.data().submissions.filter((a:any)=>a.assessmentId===assessmentId&&a.className===className);
    if(!rows.length)return 'Assign the assessment to this class first.';
    if(rows.some((a:any)=>a.assessmentProgress.status!=='approved'))return 'Approve every submitted subject before preparing reports.';
    const classId=rows[0].classId;
    const enrollments=(this.head.api.data()?.students??[]).flatMap((student:any)=>student.enrollments.filter((enrollment:any)=>enrollment.classroomId===classId&&enrollment.status==='active').map((enrollment:any)=>({studentId:student.id,subjects:enrollment.subjects??[]})));
    if(!enrollments.length)return 'This class has no active students to report.';
    const complete=enrollments.every((enrollment:any)=>enrollment.subjects.every((subject:any)=>rows.some((row:any)=>row.subjectId===subject.subjectId&&row.entries?.some((mark:any)=>mark.studentId===enrollment.studentId&&(typeof mark.marksValue==='number'||mark.noMark===true)))));
    return complete?null:'Some enrolled subjects still need approved marks. Assign and approve those subjects first.';
  }
  prepareReports(className:string){return this.remote.command('reports',{className,assessmentId:this.assessment()?.id});}
  async saveTeachingAssignment(teacherId:string,classId:string,subjectId:string):Promise<string|null>{try{await this.head.api.write('assignments',{membershipId:teacherId,classroomId:classId,subjectId:subjectId||null});return null;}catch(e){return this.head.api.auth.error(e);}}
}
