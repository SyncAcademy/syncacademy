import { AcademicDataService } from '../../core/services/academic-data.service';
import { SchoolApiService } from '../../core/services/school-api.service';
import { displayClassName } from '../headmaster/head.models';
import { Injectable, computed, effect, signal, inject } from '@angular/core';
import { MarkEntry, RosterIssueReport, RosterStudent, TeacherAssignment, TeacherNotification } from './teacher.models';

import { AcademicYearService } from '../../core/services/academic-year.service';

import { GradingPolicyService, DEFAULT_GRADING, gradeWithPolicy } from '../../core/services/grading-policy.service';

import { HeadStore } from '../headmaster/head.store';

interface TeacherIssue extends RosterIssueReport { assignmentId: string; createdAt: string; resolvedAt?: string; resolution?: string; }
interface TeacherState {
  rosterArchives?: { assignmentId: string; archivedAt: string; entries: MarkEntry[] }[];
  assignments: TeacherAssignment[];
  marks: Record<string, MarkEntry[]>;
  issues: TeacherIssue[];
  notifications: TeacherNotification[];
}

export function gradeMark(mark: number | null): string | null {
  if (mark === null || !Number.isFinite(mark) || mark < 0 || mark > 100) return null;
  return mark >= 80 ? 'A' : mark >= 65 ? 'B' : mark >= 50 ? 'C' : mark >= 35 ? 'D' : 'F';
}

@Injectable({ providedIn: 'root' })
export class TeacherStore {
  readonly api=inject(SchoolApiService); get teacherId(){return this.api.auth.identity()?.id||"";}
  private readonly staffDirectory = inject(HeadStore);
  readonly activeTeacher=computed(()=>!!this.api.auth.identity()?.memberships.some(m=>m.school.id===this.api.schoolId()&&m.role==='TEACHER'));
  readonly grading = inject(GradingPolicyService);
  policyFor(a: TeacherAssignment) { return ['submitted', 'approved'].includes(a.assessmentProgress.status) ? a.gradingPolicy ?? DEFAULT_GRADING : this.grading.forYear(a.academicYearId); }
  grade(id: string, mark: number | null) { const a = this.assignmentsById().get(id); return a ? gradeWithPolicy(mark, this.policyFor(a)) : null; }
  readonly yearContext = inject(AcademicYearService);
  readonly selectedYear = this.yearContext.teacherYear;
  readonly remote=inject(AcademicDataService);
  readonly readOnly=computed(()=>this.yearContext.readOnly('teacher'));
  readonly period = computed(() => `${this.selectedYear()?.label ?? 'No academic year'} - Academic records`);
  readonly storageAvailable = signal(true);
  readonly state = computed<TeacherState>(()=>this.buildState());
  private readonly assignmentsById = computed(() => new Map(this.state().assignments.map(a => [a.id, a])));
  readonly assignments = computed(() => this.state().assignments.filter(a => this.activeTeacher() && a.academicYearId === this.selectedYear()?.id && (!a.teacherId || a.teacherId === this.teacherId)));
  readonly notifications = computed(() => this.state().notifications.filter(n => n.relatedAssignmentId ? this.assignments().some(a => a.id === n.relatedAssignmentId) : n.createdAt.slice(0, 4) === this.selectedYear()?.startDate.slice(0, 4)));
  readonly unreadCount = computed(() => this.notifications().filter(n => !n.read).length);
  readonly stats = computed(() => {
    const list = this.assignments();
    return {
      totalAssignments: list.length, pendingRosters: list.filter(a => a.rosterStatus !== 'confirmed').length,
      draftsInProgress: list.filter(a => a.assessmentId && a.assessmentProgress.status === 'draft').length,
      submittedForReview: list.filter(a => a.assessmentId && a.assessmentProgress.status === 'submitted').length,
      approved: list.filter(a => a.assessmentId && a.assessmentProgress.status === 'approved').length,
      returned: list.filter(a => a.assessmentId && a.assessmentProgress.status === 'returned').length,
    };
  });
  private buildState():TeacherState {const d=this.api.data();const remote=this.remote.data();
   const assessed=remote.submissions.map((a:any)=>{ const exam=remote.assessments.find((item:any)=>item.id===a.assessmentId); const term=this.yearContext.years().find(year=>year.id===a.academicYearId)?.terms.find(item=>item.key===exam?.term); return {...a,entries:undefined,assessmentName:exam?`${term?.name ?? exam.term} / ${exam.name}`:a.assessmentName}; });
   const bases=(d?.assignments||[]).filter((a:any)=>a.membership.user.id===this.teacherId).map((a:any)=>({id:a.id,teachingId:a.id,classId:a.classroomId,teacherId:this.teacherId,teacherName:a.membership.user.name,className:a.classroom.name,classStream:null,subjectId:a.subjectId||undefined,subjectName:a.subject?.name||'Class roster',subjectCode:a.subject?.code||'',academicYearId:a.classroom.yearId,academicYearLabel:a.classroom.year.name,studentCount:(d?.students||[]).filter((s:any)=>s.enrollments.some((e:any)=>e.classroomId===a.classroomId&&(e.status==='active'||d?.years?.find((y:any)=>y.id===a.classroom.yearId)?.closed)&&(!a.subjectId||(e.subjects||[]).some((v:any)=>v.subjectId===a.subjectId)))).length,rosterStatus:a.confirmedAt?'confirmed':'pending',assessmentProgress:{total:0,completed:0,status:'draft',submittedAt:null,approvedAt:null,returnReason:null}}));
   return {assignments:[...bases,...assessed],marks:Object.fromEntries(remote.submissions.map((a:any)=>[a.id,a.entries])),issues:[],notifications:remote.notifications};
  }
  roster(id: string): RosterStudent[] {
    const assignment = this.assignments().find(a => a.id === id);
    if (!assignment) return [];
    if (assignment.assessmentId) return this.entries(id).map(m=>({id:m.studentId,studentNumber:m.studentNumber,fullName:m.fullName,gender:m.gender??'',enrollmentStatus:'active'}));
    return (this.api.data()?.students || []).flatMap((student: any) => {
      const enrollment = student.enrollments.find((e: any) => e.classroomId === assignment.classId &&
        (e.status === 'active' || this.selectedYear()?.status === 'closed') &&
        (!assignment.subjectId || (e.subjects || []).some((subject: any) => subject.subjectId === assignment.subjectId)));
      return enrollment ? [{ id: student.id, studentNumber: student.admissionNumber, fullName: student.name,
        gender: student.gender || '', enrollmentStatus: enrollment.status }] : [];
    });
  }
  entries(id: string): MarkEntry[] { return this.assignments().some(a => a.id === id) ? (this.state().marks[id] ?? []).map(m => ({ ...m, noMark: m.noMark ?? false, grade: this.grade(id, m.marksValue) })) : []; }
  async save(id:string,entries:MarkEntry[]):Promise<string|null>{const a=this.assignments().find(a=>a.id===id);return this.remote.command('marks',{id,revision:a?.revision,entries:entries.map(e=>({studentId:e.studentId,marksValue:e.marksValue,noMark:e.noMark??false,comments:e.comments??''}))});}
  confirmRoster(id:string){return this.remote.command('confirm-roster',{id});}
  submit(id:string):Promise<string|null>{const a=this.assignments().find(a=>a.id===id);return this.remote.command('submit',{id,revision:a?.revision});}
  markRead(id?:string){return this.remote.command('read-notifications',id?{id}:{});}
  private restore():TeacherState { return {assignments:[],marks:{},issues:[],notifications:[]}; }
}
