import { Injectable, effect, inject, signal } from '@angular/core';
import { AcademicYearService } from './academic-year.service';
import { ClassTeacherService } from './class-teacher.service';
import { RegistrarStore } from '../../features/registrar/registrar.store';
import { TeacherDemoStore } from '../../features/teacher/teacher-demo.store';
export const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Late', 'Excused'] as const;
export type AttendanceStatus = typeof ATTENDANCE_STATUSES[number];
export interface AttendanceEntry { studentId: string; student: string; number: string; status: AttendanceStatus; note: string; }
export interface AttendanceSheet { id: string; yearId: string; classId: string; date: string; entries: AttendanceEntry[]; teacherId: string; teacherName?: string; savedAt: string; revision: number; reason: string; }
@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly years = inject(AcademicYearService);
  private readonly roles = inject(ClassTeacherService);
  private readonly registry = inject(RegistrarStore);
  private readonly teacher = inject(TeacherDemoStore);
  private readonly records = signal<AttendanceSheet[]>(this.restore());
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
  save(classId: string, date: string, entries: AttendanceEntry[], reason = ''): string | null {
    const year = this.years.teacherYear();
    if (!year || this.years.readOnly('teacher') || !this.roles.classesFor(this.teacher.teacherId, year.id).some(c => c.id === classId)) return 'Only the assigned class teacher can record attendance in an editable year.';
    const timestamp = Date.parse(date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date || date < year.startDate || date > year.endDate || date > new Date().toISOString().slice(0, 10)) return 'Choose a valid, non-future date within this academic year.';
    const roster = this.roster(classId, date); const saved = this.forYear(year.id).find(s => s.classId === classId && s.date === date);
    if (!roster.length || entries.length !== roster.length || new Set(entries.map(e => e.studentId)).size !== roster.length || roster.some(r => !entries.some(e => e.studentId === r.studentId)) || entries.some(e => !ATTENDANCE_STATUSES.includes(e.status) || typeof e.note !== 'string')) return 'Record a valid attendance status for every student on this date’s roster.';
    if (saved && reason.trim().length < 10) return 'Explain the attendance correction in at least 10 characters.';
    const snapshot = roster.map(r => { const input = entries.find(e => e.studentId === r.studentId)!; return { ...r, status: input.status, note: input.note.trim() }; });
    this.records.update(list => [...list, { id: crypto.randomUUID(), yearId: year.id, classId, date, entries: snapshot, teacherId: this.teacher.teacherId, teacherName: this.registry.head.staff().find(t => t.id === this.teacher.teacherId)?.fullName ?? 'Teacher', savedAt: new Date().toISOString(), revision: (saved?.revision ?? 0) + 1, reason: reason.trim() }]); return null;
  }
  private restore():AttendanceSheet[]{return [];}
}
