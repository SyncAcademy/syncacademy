import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AcademicYearService } from '../../core/services/academic-year.service';
import { SchoolApiService } from '../../core/services/school-api.service';
import { HeadPageHeaderComponent } from '../headmaster/shared/head-page-header.component';
import { LoadingSkeletonComponent } from '../../shared/loading-skeleton.component';

interface SubjectClassCard {
  id: string;
  name: string;
  studentCount: number;
  subjects: { id: string; name: string; code: string }[];
}

interface SubjectRosterStudent {
  enrollmentId: string;
  version: number;
  studentId: string;
  name: string;
  admissionNumber: string;
  subjectIds: string[];
}

@Component({
  selector: 'app-student-subjects',
  standalone: true,
  imports: [CommonModule, FormsModule, HeadPageHeaderComponent, LoadingSkeletonComponent],
  templateUrl: './student-subjects.page.html',
  styleUrls: ['./student-subjects.page.scss'],
})
export class StudentSubjectsPage {
  private readonly routeData = toSignal(inject(ActivatedRoute).data);
  private readonly years = inject(AcademicYearService);
  readonly api = inject(SchoolApiService);
  readonly audience = computed<'academic' | 'teacher'>(() => this.routeData()?.['audience'] === 'teacher' ? 'teacher' : 'academic');
  readonly year = computed(() => this.years.selected(this.audience()));
  readonly yearContext = computed(() => ({ id: this.year()?.id ?? '', closed: this.year()?.status === 'closed' }), {
    equal: (previous, current) => previous.id === current.id && previous.closed === current.closed,
  });
  readonly title = computed(() => this.audience() === 'teacher' ? 'Student Subjects' : 'Manage Student Subjects');
  readonly description = computed(() => this.audience() === 'teacher'
    ? 'Review your class roster and adjust the subjects each student takes.'
    : 'Choose a class to review its students and manage their individual subject selections.');
  readonly classes = signal<SubjectClassCard[]>([]);
  readonly selectedClassId = signal('');
  readonly students = signal<SubjectRosterStudent[]>([]);
  readonly loadingClasses = signal(false);
  readonly loadingStudents = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly search = signal('');
  readonly classSearch = signal('');
  readonly page = signal(1);
  readonly pageSize = 25;
  readonly editingEnrollmentId = signal('');
  readonly editingSubjects = signal<string[]>([]);
  readonly yearClosed = signal(false);
  private classesGeneration = 0;
  private studentsGeneration = 0;
  readonly selectedClass = computed(() => this.classes().find(classroom => classroom.id === this.selectedClassId()));
  readonly filteredClasses = computed(() => {
    const q = this.classSearch().trim().toLowerCase();
    return this.classes().filter(classroom => !q || `${classroom.name} ${classroom.subjects.map(subject => `${subject.name} ${subject.code}`).join(' ')}`.toLowerCase().includes(q));
  });
  readonly filteredStudents = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.students().filter(student => !q || `${student.name} ${student.admissionNumber}`.toLowerCase().includes(q));
  });
  readonly pages = computed(() => Math.max(1, Math.ceil(this.filteredStudents().length / this.pageSize)));
  readonly visibleStudents = computed(() => this.filteredStudents().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize));
  readonly readOnly = computed(() => !this.year());

  constructor() {
    effect(() => {
      const schoolId = this.api.schoolId();
      const { id: yearId, closed } = this.yearContext();
      const role = this.api.role();
      untracked(() => {
        this.classesGeneration++;
        this.studentsGeneration++;
        this.classes.set([]);
        this.students.set([]);
        this.selectedClassId.set('');
        this.search.set('');
        this.classSearch.set('');
        this.page.set(1);
        this.editingEnrollmentId.set('');
        this.error.set('');
        this.notice.set('');
        this.yearClosed.set(closed);
        if (schoolId && yearId && ['ACADEMIC', 'HEADMASTER', 'TEACHER'].includes(role)) {
          void this.loadClasses(schoolId, yearId);
        }
      });
    });
    effect(() => { this.search(); this.page.set(1); });
    effect(() => { if (this.page() > this.pages()) this.page.set(this.pages()); });
  }

  private async loadClasses(schoolId: string, yearId: string): Promise<void> {
    const generation = ++this.classesGeneration;
    this.loadingClasses.set(true);
    this.error.set('');
    try {
      const query = new URLSearchParams({ yearId });
      const result: any = await this.api.auth.request('GET', `schools/${schoolId}/registry/student-subjects?${query}`);
      if (generation !== this.classesGeneration || schoolId !== this.api.schoolId() || yearId !== this.year()?.id) return;
      this.classes.set(result.classes ?? []);
      this.yearClosed.set(!!result.year?.closed);
    } catch (error) {
      if (generation === this.classesGeneration) this.error.set(this.api.auth.error(error));
    } finally {
      if (generation === this.classesGeneration) this.loadingClasses.set(false);
    }
  }

  async openClass(classroomId: string): Promise<void> {
    if (this.busy()) return;
    this.selectedClassId.set(classroomId);
    this.students.set([]);
    this.search.set('');
    this.page.set(1);
    this.editingEnrollmentId.set('');
    this.notice.set('');
    await this.loadStudents(classroomId);
  }

  backToClasses(): void {
    if (this.busy()) return;
    this.studentsGeneration++;
    this.selectedClassId.set('');
    this.students.set([]);
    this.editingEnrollmentId.set('');
    this.search.set('');
    this.page.set(1);
  }

  private async loadStudents(classroomId: string): Promise<void> {
    const schoolId = this.api.schoolId();
    const yearId = this.year()?.id;
    if (!schoolId || !yearId) return;
    const generation = ++this.studentsGeneration;
    this.loadingStudents.set(true);
    this.error.set('');
    try {
      const query = new URLSearchParams({ yearId, classroomId });
      const result: any = await this.api.auth.request('GET', `schools/${schoolId}/registry/student-subjects?${query}`);
      if (generation !== this.studentsGeneration || classroomId !== this.selectedClassId() || schoolId !== this.api.schoolId() || yearId !== this.year()?.id) return;
      this.classes.set(result.classes ?? this.classes());
      this.students.set(result.students ?? []);
      this.yearClosed.set(!!result.year?.closed);
    } catch (error) {
      if (generation === this.studentsGeneration) this.error.set(this.api.auth.error(error));
    } finally {
      if (generation === this.studentsGeneration) this.loadingStudents.set(false);
    }
  }

  startEditing(student: SubjectRosterStudent): void {
    if (this.readOnly() || this.busy()) return;
    this.error.set('');
    this.notice.set('');
    this.editingEnrollmentId.set(student.enrollmentId);
    this.editingSubjects.set([...student.subjectIds]);
  }

  toggleSubject(subjectId: string): void {
    const current = this.editingSubjects();
    this.editingSubjects.set(current.includes(subjectId) ? current.filter(id => id !== subjectId) : [...current, subjectId]);
  }

  cancelEditing(): void {
    if (this.busy()) return;
    this.editingEnrollmentId.set('');
    this.editingSubjects.set([]);
    this.error.set('');
  }

  async saveSubjects(student: SubjectRosterStudent): Promise<void> {
    if (this.busy() || this.readOnly() || this.editingEnrollmentId() !== student.enrollmentId) return;
    const classroomId = this.selectedClassId();
    const schoolId = this.api.schoolId();
    const yearId = this.year()?.id;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      await this.api.write(`registry/enrollments/${student.enrollmentId}/subjects`, {
        version: student.version,
        subjectIds: this.editingSubjects(),
      }, 'PATCH');
      if (schoolId === this.api.schoolId() && yearId === this.year()?.id && classroomId === this.selectedClassId()) {
        this.editingEnrollmentId.set('');
        this.editingSubjects.set([]);
        await this.loadStudents(classroomId);
        this.notice.set(`Subjects updated for ${student.name}.`);
      }
    } catch (error) {
      this.error.set(this.api.auth.error(error));
    } finally {
      this.busy.set(false);
    }
  }

  selectedSubjects(student: SubjectRosterStudent) {
    return (this.selectedClass()?.subjects ?? []).filter(subject => student.subjectIds.includes(subject.id));
  }

  visibleSubjects(classroom: SubjectClassCard) {
    return classroom.subjects.slice(0, 4);
  }

  remainingSubjectCount(classroom: SubjectClassCard): number {
    return Math.max(0, classroom.subjects.length - 4);
  }

  changePage(value: number): void {
    this.page.set(Math.min(this.pages(), Math.max(1, value)));
    this.editingEnrollmentId.set('');
  }
}
