import { AcademicDataService } from './academic-data.service';
import { Injectable, effect, inject, signal, computed } from '@angular/core';
import { AcademicYearService } from './academic-year.service';
import { ClassTeacherService } from './class-teacher.service';
import { RegistrarStore } from '../../features/registrar/registrar.store';
import { TeacherStore } from '../../features/teacher/teacher.store';
export const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Late', 'Excused'] as const;
export type AttendanceStatus = typeof ATTENDANCE_STATUSES[number];
export interface AttendanceEntry { studentId: string; student: string; number: string; status: AttendanceStatus; note: string; }
export interface AttendanceSheet { id: string; yearId: string; classId: string; date: string; entries: AttendanceEntry[]; teacherId: string; teacherName?: string; savedAt: string; revision: number; reason: string; }
@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly years = inject(AcademicYearService);
  private readonly roles = inject(ClassTeacherService);
  private readonly registry = inject(RegistrarStore);
  private readonly teacher = inject(TeacherStore);
  readonly remote=inject(AcademicDataService);
  private readonly records = computed<AttendanceSheet[]>(()=>this.remote.data().attendance);
  readonly storageAvailable = signal(true);
  constructor() {}
  forYear(yearId: string) { const rows = this.records().filter(r => r.yearId === yearId); return rows.filter(r => !rows.some(n => n.classId === r.classId && n.date === r.date && n.revision > r.revision)); }
  revisions(yearId: string) { return this.records().filter(r => r.yearId === yearId); }
  roster(classId: string, date: string) {
    const year = this.years.teacherYear();
    if (!year || !this.roles.classesFor(this.teacher.teacherId, year.id).some(c => c.id === classId)) return [];
    const saved = this.forYear(year.id).find(r => r.classId === classId && r.date === date);
    if (saved) return saved.entries.map(e => ({ studentId: e.studentId, student: e.student, number: e.number }));
    return this.registry.enrolmentsFor(year.id).filter(e => e.classId === classId && e.status === 'active' && e.joined.slice(0, 10) <= date).map(e => ({ studentId: e.studentId, student: e.studentName, number: this.registry.student(e.studentId)!.number }));
  }
  save(classId:string,date:string,entries:AttendanceEntry[],reason:string,revision:number):Promise<string|null>{return this.remote.command('attendance',{classId,date,reason,revision,entries:entries.map(e=>({studentId:e.studentId,status:e.status,note:e.note??''}))});}
}
