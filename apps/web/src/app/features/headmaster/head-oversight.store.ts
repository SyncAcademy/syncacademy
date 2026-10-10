import { Injectable, computed, inject } from '@angular/core';
import { AcademicYearService } from '../../core/services/academic-year.service';
import { BursarStore } from '../bursar/bursar.store';
import { AcademicStore, ResultRow } from '../academic/academic.store';
import { RegistrarStore } from '../registrar/registrar.store';
import { AttendanceService } from '../../core/services/attendance.service';
import { ClassTeacherService } from '../../core/services/class-teacher.service';
import { HeadStore } from './head.store';
import { AcademicDataService } from '../../core/services/academic-data.service';

/** Read projections only. Viewing oversight never changes another role's year. */
@Injectable({ providedIn: 'root' })
export class HeadOversightStore {
  readonly remote = inject(AcademicDataService);
  private readonly attendance = inject(AttendanceService);
  private readonly classTeachers = inject(ClassTeacherService);
  readonly attendanceSheets = computed(() => this.attendance.forYear(this.year()?.id ?? ''));
  classTeacherName(id: string) { return this.classTeachers.forClass(id, this.year()?.id ?? '')?.teacherName ?? 'Not assigned'; }
  private readonly years = inject(AcademicYearService);
  private readonly bursar = inject(BursarStore);
  private readonly academic = inject(AcademicStore);
  private readonly registry = inject(RegistrarStore);
  private readonly head = inject(HeadStore);
  readonly year = this.years.headYear;
  readonly finance = computed(() => this.bursar.forYear(this.year()?.id ?? ''));
  readonly accounts = computed(() => this.bursar.accountsFor(this.year()?.id ?? ''));
  readonly financeSummary = computed(() => this.bursar.totals(undefined, undefined, this.year()?.id ?? ''));
  readonly academicData = computed(() => this.academic.forYear(this.year()?.id ?? ''));
  readonly classes = computed(() => this.registry.classesFor(this.year()?.id ?? ''));
  readonly mappings = computed(() => this.head.mappings().filter(m => this.classes().some(c => c.id === m.classId)));
  readonly teaching = computed(() => this.head.assignments().filter(a => a.academicYearId === this.year()?.id));
  readonly enrolments = computed(() => this.registry.enrolmentsFor(this.year()?.id ?? ''));
  readonly admissions = computed(() => this.registry.admissionsFor(this.year()?.id ?? ''));
  readonly pendingStaff = computed(() => this.head.pending().length);
  readonly reports = computed(() => this.academic.reportStore.forYear(this.year()?.id ?? ''));
  readonly assignments = computed(() => this.academic.teacher.state().assignments.filter(a => a.academicYearId === this.year()?.id));
  readonly results = computed(() => this.assignments().flatMap(a => (this.academic.teacher.state().marks[a.id] ?? []).flatMap(m => {
    const grade = this.academic.teacher.grade(a.id, m.marksValue);
    if (!grade || m.marksValue === null) return [];
    return [{ assignmentId: a.id, assessmentId: this.academic.assessmentId(a), className: this.academic.classLabel(a), subject: a.subjectName, student: m.fullName, studentNumber: m.studentNumber, mark: m.marksValue, grade, passed: m.marksValue >= this.academic.teacher.policyFor(a).passMark, status: a.assessmentProgress.status } satisfies ResultRow & { assessmentId: string }];
  })));
  readonly academicSummary = computed(() => {
    const approved = this.results().filter(r => r.status === 'approved');
    return { submitted: this.assignments().filter(a => a.assessmentProgress.status === 'submitted').length,
      approved: this.assignments().filter(a => a.assessmentProgress.status === 'approved').length,
      average: approved.length ? approved.reduce((s, r) => s + r.mark, 0) / approved.length : null,
      passRate: approved.length ? approved.filter(r => r.passed).length / approved.length * 100 : null };
  });
  readonly activity = computed<{id:string;at:string;owner:string;actorName:string;message:string}[]>(() => {
    const financeActions = new Set(['FEE_CREATED', 'FEE_UPDATED', 'FEE_APPLIED', 'PAYMENT_RECORDED', 'PAYMENT_CORRECTED', 'PAYMENT_VOIDED', 'ADJUSTMENT_RECORDED']);
    const labels: Record<string, string> = {
      FEE_CREATED: 'Fee created', FEE_UPDATED: 'Fee details updated', FEE_APPLIED: 'Fee assigned to students',
      PAYMENT_RECORDED: 'Payment recorded', PAYMENT_CORRECTED: 'Payment receipt corrected', PAYMENT_VOIDED: 'Payment receipt voided', ADJUSTMENT_RECORDED: 'Student balance adjusted',
      ACADEMIC_YEAR_UPDATED: 'Academic year or term settings updated', ACADEMIC_YEAR_CLOSED: 'Academic year closed', ACADEMIC_YEAR_REOPENED: 'Academic year reopened',
      SUBJECT_CREATED: 'Subject added', SUBJECT_UPDATED: 'Subject details updated', STUDENT_ENROLLED: 'Student enrolled', TEACHER_ASSIGNED: 'Teacher assigned to a class',
      INVITATION_RESEND: 'Staff invitation resent', INVITATION_REVOKE: 'Staff invitation revoked', MEMBER_REACTIVATED: 'Staff access reactivated', MEMBER_SUSPENDED: 'Staff access suspended', MEMBER_ROLE_REMOVED: 'Staff role removed',
      REGISTRY_REGISTRATION: 'Student registered', REGISTRY_PROFILE: 'Student profile updated', REGISTRY_ENROLLMENT: 'Student enrolled in a class', REGISTRY_MOVEMENT: 'Student class placement updated',
      SCHOOL_PROFILE_UPDATED: 'School profile updated', STUDENT_IMPORT_RECORD_REMOVED: 'Student import record removed',
    };
    const friendly = (action: string) => labels[action] ?? action.toLowerCase().replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase());
    const platform = (this.head.api.data()?.audit || []).filter((a:any) => !a.action.startsWith('ACADEMIC_') || a.action.startsWith('ACADEMIC_YEAR_')).map((a: any) => ({
      id: a.id,
      at: a.createdAt,
      owner: financeActions.has(a.action)
        ? 'Bursar'
        : ({ BURSAR: 'Bursar', HEADMASTER: 'Headmaster', REGISTRAR: 'Registrar', ACADEMIC: 'Academic Master', TEACHER: 'Teacher' } as Record<string, string>)[a.role] ?? 'System',
      actorName: a.actor?.name ?? '',
      message: friendly(a.action),
    }));
    const academic = this.academicData().audit.map(a => ({ id:a.id, at:a.at, owner:'Academic Master', actorName:'', message:a.message }));
    return [...platform,...academic].sort((a,b)=>b.at.localeCompare(a.at));
  });
  loadFinance(yearId: string) { return this.bursar.loadYear(yearId, true); }
  accountsFor(term: string) { return this.bursar.accountsFor(this.year()?.id ?? '', term || undefined); }
  className(id: string) { return this.registry.className(id); }
}
