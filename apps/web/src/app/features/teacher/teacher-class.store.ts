import { Injectable, computed, inject } from '@angular/core';
import { AcademicStore } from '../academic/academic.store';
import { TeacherDemoStore } from './teacher-demo.store';
import { RegistrarStore } from '../registrar/registrar.store';
import { ClassTeacherService } from '../../core/services/class-teacher.service';
import { AttendanceService } from '../../core/services/attendance.service';
@Injectable({ providedIn: 'root' })
export class TeacherClassStore {
  readonly teacher = inject(TeacherDemoStore);
  readonly academic = inject(AcademicStore);
  readonly registry = inject(RegistrarStore);
  readonly roles = inject(ClassTeacherService);
  readonly attendance = inject(AttendanceService);
  readonly year = this.teacher.selectedYear;
  readonly classes = computed(() => this.roles.classesFor(this.teacher.teacherId, this.year()?.id ?? ''));
  readonly assessments = computed(() => this.academic.forYear(this.year()?.id ?? '').assessments);
  readonly attendanceHistory = computed(() => this.attendance.revisions(this.year()?.id ?? '').filter(s => this.classes().some(c => c.id === s.classId)));
  readonly sheets = computed(() => this.attendance.forYear(this.year()?.id ?? '').filter(s => this.classes().some(c => c.id === s.classId)));
  readonly ownAssignments = this.teacher.assignments;
  readonly classAssignments = computed(() => this.teacher.state().assignments.filter(a => a.academicYearId === this.year()?.id && this.classes().some(c => a.classId ? a.classId === c.id : (a.classStream || a.className) === (c.stream || c.name))));
  results(classMode: boolean) {
    return (classMode ? this.classAssignments() : this.ownAssignments()).flatMap(a => (this.teacher.state().marks[a.id] ?? []).flatMap(m => {
      const grade = this.teacher.grade(a.id, m.marksValue); if (grade === null || m.marksValue === null) return [];
      return [{ assignmentId: a.id, assessmentId: this.academic.assessmentId(a), className: a.classStream || a.className, subject: a.subjectName, student: m.fullName, studentNumber: m.studentNumber, mark: m.marksValue, grade, passed: m.marksValue >= this.teacher.policyFor(a).passMark, status: a.assessmentProgress.status }];
    }));
  }
  roster(classId: string) {
    if (!this.classes().some(c => c.id === classId)) return [];
    return this.registry.enrolmentsFor(this.year()?.id ?? '').filter(e => e.classId === classId && e.status === 'active').map(e => ({ id: e.studentId, name: e.studentName, number: this.registry.student(e.studentId)!.number }));
  }
}
