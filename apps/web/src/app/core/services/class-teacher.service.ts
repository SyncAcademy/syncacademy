import { Injectable, effect, inject, signal } from '@angular/core';
import { HeadDemoStore } from '../../features/headmaster/head-demo.store';
import { AcademicYearService } from './academic-year.service';
export interface ClassTeacherAssignment { id: string; yearId: string; classId: string; teacherId: string; teacherName: string; at: string; endedAt?: string; }
@Injectable({ providedIn: 'root' })
export class ClassTeacherService {
  private readonly head = inject(HeadDemoStore);
  private readonly years = inject(AcademicYearService);
  private readonly state = signal<ClassTeacherAssignment[]>(this.restore());
  readonly history = this.state.asReadonly();
  readonly storageAvailable = signal(true);
  constructor() {}
  forClass(classId: string, yearId: string) { return this.state().find(a => a.classId === classId && a.yearId === yearId && !a.endedAt); }
  classesFor(teacherId: string, yearId: string) {
    if (!this.head.staff().some(t => t.id === teacherId && t.role === 'teacher' && t.status === 'active')) return [];
    return this.head.classes().filter(c => (c.academicYearId ?? 'ay-1') === yearId && this.forClass(c.id, yearId)?.teacherId === teacherId);
  }
  assign(classId: string, teacherId: string): string | null {
    const year = this.years.academicYear();
    if (!year || this.years.readOnly('academic')) return 'The academic year is read-only.';
    if (!this.head.classes().some(c => c.id === classId && (c.academicYearId ?? 'ay-1') === year.id)) return 'Select a class in this academic year.';
    const teacher = this.head.staff().find(t => t.id === teacherId && t.role === 'teacher' && t.status === 'active');
    if (teacherId && !teacher) return 'Choose an active, approved teacher.';
    const current = this.forClass(classId, year.id);
    if (current?.teacherId === teacherId || (!current && !teacherId)) return 'The class teacher is unchanged.';
    const at = new Date().toISOString();
    this.state.update(list => [...list.map(a => a.id === current?.id ? { ...a, endedAt: at } : a), ...(teacher ? [{ id: crypto.randomUUID(), classId, yearId: year.id, teacherId, teacherName: teacher.fullName, at }] : [])]);
    return null;
  }
  private restore():ClassTeacherAssignment[]{return [];}
}
