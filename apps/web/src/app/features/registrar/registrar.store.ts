import { SchoolApiService } from '../../core/services/school-api.service';
import { Injectable, computed, inject } from '@angular/core';
import { AcademicYearService } from '../../core/services/academic-year.service';
import { HeadStore } from '../headmaster/head.store';
import { TeacherStore } from '../teacher/teacher.store';

export interface StudentProfile { id: string; number: string; name: string; gender: 'M' | 'F' | ''; birthDate: string; address: string; admittedYearId: string; }
export interface Enrolment { id: string; studentId: string; studentName: string; yearId: string; classId: string; status: 'active' | 'transferred_out' | 'withdrawn' | 'graduated'; joined: string; }

/** Read projections shared by existing school dashboards. Mutations use the registry API. */
@Injectable({ providedIn: 'root' })
export class RegistrarStore {
  readonly api = inject(SchoolApiService);
  readonly years = inject(AcademicYearService);
  readonly head = inject(HeadStore);
  readonly teacher = inject(TeacherStore);
  readonly year = computed(() => this.api.role() === 'HEADMASTER' ? this.years.headYear() : this.api.role() === 'ACADEMIC' ? this.years.academicYear() : this.years.registerYear());
  readonly readOnly = computed(() => !this.year() || !this.api.data()?.permissions?.registrar);
  readonly allStudents = computed<StudentProfile[]>(() => (this.api.data()?.students || []).map((s: any) => ({ id: s.id, number: s.admissionNumber, name: s.name, gender: s.gender || '', birthDate: s.dateOfBirth?.slice(0, 10) || '', address: s.address || '', admittedYearId: s.enrollments[0]?.classroom.yearId || '' })));
  readonly allEnrolments = computed<Enrolment[]>(() => (this.api.data()?.students || []).flatMap((s: any) => s.enrollments.map((e: any) => ({ id: e.id, studentId: s.id, studentName: s.name, yearId: e.classroom.yearId, classId: e.classroomId, status: e.status, joined: e.createdAt }))));
  readonly classes = computed(() => this.classesFor(this.year()?.id || ''));
  readonly enrolments = computed(() => this.enrolmentsFor(this.year()?.id || ''));
  readonly pending = computed(() => this.admissionsFor(this.year()?.id || '').filter((a: any) => a.status === 'pending'));
  readonly unassigned = computed(() => this.allStudents().filter(s => !this.enrolments().some(e => e.studentId === s.id)));
  readonly attentionCount = computed(() => this.pending().length + this.unassigned().length + this.openIssues());
  readonly openIssues = computed(() => (this.api.data()?.registryIssues || []).filter((i: any) => i.assignment.classroom.yearId === this.year()?.id).length);
  classesFor(yearId: string) { return this.head.classes().filter(c => c.academicYearId === yearId); }
  enrolmentsFor(yearId: string) { return this.allEnrolments().filter(e => e.yearId === yearId); }
  admissionsFor(yearId: string): any[] { return (this.api.data()?.registryAdmissions || []).filter((a: any) => a.yearId === yearId); }
  hasClassRecords(classId: string) { return this.allEnrolments().some(e => e.classId === classId); }
  student(id: string) { return this.allStudents().find(s => s.id === id); }
  className(id: string) { return this.head.classes().find(c => c.id === id)?.name || 'Unassigned'; }
}
