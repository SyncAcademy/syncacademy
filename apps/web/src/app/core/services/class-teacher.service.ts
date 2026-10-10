import { AcademicDataService } from './academic-data.service';
import { Injectable, effect, inject, signal, computed } from '@angular/core';
import { HeadStore } from '../../features/headmaster/head.store';
import { AcademicYearService } from './academic-year.service';
export interface ClassTeacherAssignment { id: string; yearId: string; classId: string; teacherId: string; membershipId?: string; teacherName: string; at: string; endedAt?: string; }
@Injectable({ providedIn: 'root' })
export class ClassTeacherService {
  private readonly head = inject(HeadStore);
  private readonly years = inject(AcademicYearService);
  readonly remote=inject(AcademicDataService);
  private readonly state = computed<ClassTeacherAssignment[]>(()=>this.remote.data().classTeachers);
  readonly history = this.state;
  readonly storageAvailable = signal(true);
  constructor() {}
  forClass(classId: string, yearId: string) { return this.state().find(a => a.classId === classId && a.yearId === yearId && !a.endedAt); }
  classesFor(teacherId: string, yearId: string) {

    return this.head.classes().filter(c => (c.academicYearId ?? 'ay-1') === yearId && this.forClass(c.id, yearId)?.teacherId === teacherId);
  }
  assign(classId:string,teacherId:string):Promise<string|null>{return this.remote.command('class-teacher',{classId,teacherId:teacherId||null});}
}
