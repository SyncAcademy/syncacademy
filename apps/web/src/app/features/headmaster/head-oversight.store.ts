import { Injectable, computed, inject } from '@angular/core';
import { AcademicYearService } from '../../core/services/academic-year.service';
import { BursarStore } from '../bursar/bursar.store';
import { AcademicStore, ResultRow } from '../academic/academic.store';
import { RegistrarStore } from '../registrar/registrar.store';
import { AttendanceService } from '../../core/services/attendance.service';
import { ClassTeacherService } from '../../core/services/class-teacher.service';
import { HeadDemoStore } from './head-demo.store';

/** Read projections only. Viewing oversight never changes another role's year. */
@Injectable({ providedIn: 'root' })
export class HeadOversightStore {
  private readonly attendance = inject(AttendanceService);
  private readonly classTeachers = inject(ClassTeacherService);
  readonly attendanceSheets = computed(() => this.attendance.forYear(this.year()?.id ?? ''));
  classTeacherName(id: string) { return this.classTeachers.forClass(id, this.year()?.id ?? '')?.teacherName ?? 'Not assigned'; }
  private readonly years = inject(AcademicYearService);
  private readonly bursar = inject(BursarStore);
  private readonly academic = inject(AcademicStore);
  private readonly registry = inject(RegistrarStore);
  private readonly head = inject(HeadDemoStore);
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
  readonly activity=computed<{id:string;at:string;owner:string;message:string}[]>(()=> (this.head.api.data()?.audit || []).map((a:any)=>({id:a.id,at:a.createdAt,owner:a.actorId||'System',message:a.action+' · '+a.target})));
  accountsFor(term: string) { return this.bursar.accountsFor(this.year()?.id ?? '', term || undefined); }
  className(id: string) { return this.registry.className(id); }
}
