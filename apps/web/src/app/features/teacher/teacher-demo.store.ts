import { SchoolApiService } from '../../core/services/school-api.service';
import { Injectable, computed, effect, signal, inject } from '@angular/core';
import { MOCK_ROSTER_STUDENTS, MOCK_TEACHER_ASSIGNMENTS, MOCK_TEACHER_NOTIFICATIONS } from './teacher-mock-data';
import { MarkEntry, RosterIssueReport, RosterStudent, TeacherAssignment, TeacherNotification } from './teacher.models';

import { AcademicYearService } from '../../core/services/academic-year.service';

import { GradingPolicyService, DEFAULT_GRADING, gradeWithPolicy } from '../../core/services/grading-policy.service';

import { HeadDemoStore } from '../headmaster/head-demo.store';

interface DemoIssue extends RosterIssueReport { assignmentId: string; createdAt: string; resolvedAt?: string; resolution?: string; }
interface TeacherDemoState {
  rosterArchives?: { assignmentId: string; archivedAt: string; entries: MarkEntry[] }[];
  assignments: TeacherAssignment[];
  marks: Record<string, MarkEntry[]>;
  issues: DemoIssue[];
  notifications: TeacherNotification[];
}

export function demoGrade(mark: number | null): string | null {
  if (mark === null || !Number.isFinite(mark) || mark < 0 || mark > 100) return null;
  return mark >= 80 ? 'A' : mark >= 65 ? 'B' : mark >= 50 ? 'C' : mark >= 35 ? 'D' : 'F';
}

@Injectable({ providedIn: 'root' })
export class TeacherDemoStore {
  readonly api=inject(SchoolApiService); get teacherId(){return this.api.auth.identity()?.id||"";}
  private readonly staffDirectory = inject(HeadDemoStore);
  readonly activeTeacher=computed(()=>!!this.api.auth.identity()?.memberships.some(m=>m.school.id===this.api.schoolId()&&m.role==='TEACHER'));
  readonly grading = inject(GradingPolicyService);
  policyFor(a: TeacherAssignment) { return ['submitted', 'approved'].includes(a.assessmentProgress.status) ? a.gradingPolicy ?? DEFAULT_GRADING : this.grading.forYear(a.academicYearId); }
  grade(id: string, mark: number | null) { const a = this.state().assignments.find(a => a.id === id); return a ? gradeWithPolicy(mark, this.policyFor(a)) : null; }
  readonly yearContext = inject(AcademicYearService);
  readonly selectedYear = this.yearContext.teacherYear;
  readonly readOnly=computed(()=>true);
  readonly period = computed(() => `${this.selectedYear()?.label ?? 'No academic year'} - Academic records`);
  private readonly key = 'syncacademy.teacher-demo.v2';
  readonly storageAvailable = signal(true);
  readonly state = signal<TeacherDemoState>(this.restore());
  readonly assignments = computed(() => this.state().assignments.filter(a => this.activeTeacher() && a.academicYearId === this.selectedYear()?.id && (!a.teacherId || a.teacherId === this.teacherId)));
  readonly notifications = computed(() => this.state().notifications.filter(n => n.relatedAssignmentId ? this.assignments().some(a => a.id === n.relatedAssignmentId) : n.createdAt.slice(0, 4) === this.selectedYear()?.startDate.slice(0, 4)));
  readonly unreadCount = computed(() => this.notifications().filter(n => !n.read).length);
  readonly stats = computed(() => {
    const list = this.assignments();
    return {
      totalAssignments: list.length, pendingRosters: list.filter(a => a.rosterStatus !== 'confirmed').length,
      draftsInProgress: list.filter(a => a.assessmentProgress.status === 'draft').length,
      submittedForReview: list.filter(a => a.assessmentProgress.status === 'submitted').length,
      approved: list.filter(a => a.assessmentProgress.status === 'approved').length,
      returned: list.filter(a => a.assessmentProgress.status === 'returned').length,
    };
  });
  constructor(){effect(()=>{const d=this.api.data();this.state.set({assignments:(d?.assignments||[]).filter((a:any)=>a.membership.user.id===this.teacherId).map((a:any)=>({id:a.id,classId:a.classroomId,teacherId:this.teacherId,teacherName:a.membership.user.name,className:a.classroom.name,classStream:null,subjectName:'Class assignment',subjectCode:'',academicYearId:a.classroom.yearId,academicYearLabel:a.classroom.year.name,studentCount:a.classroom._count.enrollments,rosterStatus:'pending',assessmentProgress:{total:0,completed:0,status:'draft',submittedAt:null,approvedAt:null,returnReason:null}})),marks:{},issues:[],notifications:[]});});}
  roster(id:string):RosterStudent[]{const a=this.assignments().find(a=>a.id===id);return a?(this.api.data()?.students||[]).filter((s:any)=>s.enrollments.some((e:any)=>e.classroomId===a.classId)).map((s:any)=>({id:s.id,studentNumber:s.admissionNumber,fullName:s.name,gender:s.gender||'',enrollmentStatus:'active'})):[];}
  entries(id: string): MarkEntry[] { return this.assignments().some(a => a.id === id) ? (this.state().marks[id] ?? []).map(m => ({ ...m, grade: this.grade(id, m.marksValue) })) : []; }
  save(id: string, entries: MarkEntry[]): void {
    const assignment = this.assignments().find(a => a.id === id);
    if (this.readOnly() || !assignment || ['submitted', 'approved'].includes(assignment.assessmentProgress.status)) return;
    const completed = entries.filter(m => demoGrade(m.marksValue) !== null).length;
    this.state.update(s => ({ ...s, marks: { ...s.marks, [id]: entries.map(m => ({ ...m, grade: this.grade(id, m.marksValue) })) }, assignments: s.assignments.map(a => a.id === id ? {
      ...a, assessmentProgress: { ...a.assessmentProgress, completed }
    } : a) }));
  }
  confirmRoster(id: string): void {
    if (this.readOnly() || !this.assignments().some(a => a.id === id)) return;
    this.state.update(s => ({ ...s, assignments: s.assignments.map(a => a.id === id ? { ...a, rosterStatus: 'confirmed' } : a) }));
  }
  reportIssue(id: string, issue: RosterIssueReport): void {
    if (this.readOnly() || !this.assignments().some(a => a.id === id)) return;
    this.state.update(s => ({ ...s, issues: [...s.issues, { ...issue, assignmentId: id, createdAt: new Date().toISOString() }] }));
  }
  submit(id: string): boolean {
    const assignment = this.assignments().find(a => a.id === id);
    const marks = this.entries(id);
    if (this.readOnly() || !assignment || assignment.rosterStatus !== 'confirmed' || !['draft', 'returned'].includes(assignment.assessmentProgress.status) ||
      marks.length !== assignment.studentCount || !marks.every(m => demoGrade(m.marksValue) !== null)) return false;
    this.state.update(s => ({ ...s, assignments: s.assignments.map(a => a.id === id ? {
      ...a, gradingPolicy: structuredClone(this.grading.forYear(a.academicYearId)), assessmentProgress: { ...a.assessmentProgress, status: 'submitted', submittedAt: new Date().toISOString(), returnReason: null }
    } : a) }));
    return true;
  }
  markRead(id?: string): void {
    this.state.update(s => ({ ...s, notifications: s.notifications.map(n => this.notifications().some(visible => visible.id === n.id) && (!id || n.id === id) ? { ...n, read: true } : n) }));
  }
  private restore():TeacherDemoState { return {assignments:[],marks:{},issues:[],notifications:[]}; }
}
