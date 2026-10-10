import { Injectable, computed, inject, signal } from '@angular/core';
import { AcademicYearService } from '../../core/services/academic-year.service';
import { SchoolApiService } from '../../core/services/school-api.service';
import { AcademicDataService } from '../../core/services/academic-data.service';
export interface SchoolSetupProfile { name: string; code: string; region: string; schoolType: string; address: string; phone: string; email: string; website: string; }
export interface SetupStep { id: string; title: string; owner: string; description: string; detail: string; done: boolean; route: string; viewer: 'head' | 'academic' | 'register' | 'bursar'; available?: boolean; }
@Injectable({ providedIn: 'root' })
export class SchoolSetupStore {
  readonly years = inject(AcademicYearService);
  private readonly api = inject(SchoolApiService);
  private readonly academic = inject(AcademicDataService);
  readonly year = this.years.headYear;
  readonly storageAvailable = signal(true);
  readonly profile = computed<SchoolSetupProfile | null>(() => {
    const school = this.api.data()?.school;
    return school ? { name: school.name, code: school.code, region: school.region, schoolType: school.schoolType??'', address: school.address??'', phone: school.phone??'', email: school.email??'', website: school.website??'' } : null;
  });
  readonly steps = computed<SetupStep[]>(() => {
    const data = this.api.data();
    const classes = (data?.classes || []).filter((c: any) => c.yearId === this.year()?.id);
    const teachers = (data?.members || []).filter((m: any) => m.role === 'TEACHER' && m.active && m.user.enabled);
    const offerings = (data?.classSubjects || []).filter((m:any)=>classes.some((c:any)=>c.id===m.classroomId));
    const assigned = offerings.filter((m:any)=>(data?.assignments||[]).some((a:any)=>a.classroomId===m.classroomId&&a.subjectId===m.subjectId&&a.membership.active&&a.membership.user.enabled));
    const enrolled = classes.reduce((total: number, c: any) => total + c._count.enrollments, 0);
    return [
      { id: 'school', title: 'School information', owner: 'Headmaster', description: 'Review your registered school details below.', detail: this.profile()?.name || 'School details are loading.', done: !!this.profile(), route: '', viewer: 'head' },
      { id: 'year', title: 'Academic year', owner: 'Headmaster', description: 'Create the academic year and its start and end dates.', detail: this.year()?.label || 'No academic year created.', done: !!this.year(), route: '/head/academic-years', viewer: 'head' },
      { id: 'classes', title: 'Classes and subjects', owner: 'Academic Master', description: 'Ask the Academic Master to create classes and select offered subjects. Review them here.', detail: `${classes.length} classes created.`, done: classes.length > 0 && classes.every((c:any)=>offerings.some((m:any)=>m.classroomId===c.id)), route: '/head/classes-subjects', viewer: 'head' },
      { id: 'staff', title: 'Staff accounts', owner: 'Headmaster', description: 'Invite staff to accept their invitation and create an account.', detail: `${teachers.length} active teachers.`, done: teachers.length > 0, route: '/head/staff', viewer: 'head' },
      { id: 'assignments', title: 'Teaching responsibilities', owner: 'Academic Master', description: 'Assign an accepted teacher to each offered class subject.', detail: `${assigned.length} of ${offerings.length} class subjects have a teacher.`, done: offerings.length > 0 && assigned.length === offerings.length, route: '/head/teaching-assignments', viewer: 'head' },
      { id: 'students', title: 'Student registration', owner: 'Headmaster', description: 'Register students and enroll them in classes.', detail: `${enrolled} enrollments in this academic year.`, done: enrolled > 0, route: '/head/students', viewer: 'head' },
      { id: 'grading', title: 'Grading scheme', owner: 'Academic Master', description: 'Set the grading bands and pass mark for this year.', detail: `Policy revision ${this.academic.data().policy?.revision ?? 1}.`, done: (this.academic.data().policy?.revision ?? 1) > 1, route: '/head/settings', viewer: 'head' },
    ];
  });
  readonly complete = computed(() => this.steps().filter(s => s.done).length);
  readonly progress = computed(() => Math.round(this.complete() / this.steps().length * 100));
}
