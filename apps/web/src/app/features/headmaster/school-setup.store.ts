import { Injectable, computed, inject, signal } from '@angular/core';
import { AcademicYearService } from '../../core/services/academic-year.service';
import { SchoolApiService } from '../../core/services/school-api.service';
export interface SchoolSetupProfile { name: string; code: string; type: string; region: string; address: string; phone: string; email: string; }
export interface SetupStep { id: string; title: string; owner: string; description: string; detail: string; done: boolean; route: string; viewer: 'head' | 'academic' | 'register' | 'bursar'; available?: boolean; }
@Injectable({ providedIn: 'root' })
export class SchoolSetupStore {
  readonly years = inject(AcademicYearService);
  private readonly api = inject(SchoolApiService);
  readonly year = this.years.headYear;
  readonly storageAvailable = signal(true);
  readonly profile = computed<SchoolSetupProfile | null>(() => {
    const school = this.api.data()?.school;
    return school ? { name: school.name, code: school.code, region: school.region, type: '', address: '', phone: '', email: '' } : null;
  });
  readonly steps = computed<SetupStep[]>(() => {
    const data = this.api.data();
    const classes = (data?.classes || []).filter((c: any) => c.yearId === this.year()?.id);
    const teachers = (data?.members || []).filter((m: any) => m.role === 'TEACHER' && m.active);
    const assigned = classes.filter((c: any) => (data?.assignments || []).some((a: any) => a.classroomId === c.id && a.membership.active));
    const enrolled = classes.reduce((total: number, c: any) => total + c._count.enrollments, 0);
    return [
      { id: 'school', title: 'School information', owner: 'Headmaster', description: 'Review your registered school details below.', detail: this.profile()?.name || 'School details are loading.', done: !!this.profile(), route: '', viewer: 'head' },
      { id: 'year', title: 'Academic year', owner: 'Headmaster', description: 'Create the academic year and its start and end dates.', detail: this.year()?.label || 'No academic year created.', done: !!this.year(), route: '/head/academic-years', viewer: 'head' },
      { id: 'classes', title: 'Classes and subjects', owner: 'Headmaster', description: 'Create classes for the academic year. Subject configuration is not available yet.', detail: `${classes.length} classes created.`, done: classes.length > 0, route: '/head/classes-subjects', viewer: 'head' },
      { id: 'staff', title: 'Staff accounts', owner: 'Headmaster', description: 'Invite staff to accept their invitation and create an account.', detail: `${teachers.length} active teachers.`, done: teachers.length > 0, route: '/head/staff', viewer: 'head' },
      { id: 'assignments', title: 'Teaching responsibilities', owner: 'Headmaster', description: 'Assign accepted teachers to classes.', detail: `${assigned.length} of ${classes.length} classes have a teacher.`, done: classes.length > 0 && assigned.length === classes.length, route: '/head/teaching-assignments', viewer: 'head' },
      { id: 'students', title: 'Student registration', owner: 'Headmaster', description: 'Register students and enroll them in classes.', detail: `${enrolled} enrollments in this academic year.`, done: enrolled > 0, route: '/head/students', viewer: 'head' },
      { id: 'grading', title: 'Grading scheme', owner: 'Academic Master', description: 'Grade boundaries and pass marks require the grading backend.', detail: 'Not available yet.', done: false, route: '', viewer: 'academic', available: false },
    ];
  });
  readonly complete = computed(() => this.steps().filter(s => s.done).length);
  readonly progress = computed(() => Math.round(this.complete() / this.steps().length * 100));
}
