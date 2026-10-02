import { Injectable, computed, inject } from '@angular/core';
import { HeadDemoStore } from '../headmaster/head-demo.store';
import { RegistrarStore } from '../registrar/registrar.store';
import { AcademicYearService } from '../../core/services/academic-year.service';
import { GradingPolicyService } from '../../core/services/grading-policy.service';
import { ClassTeacherService } from '../../core/services/class-teacher.service';
import { SchoolClass } from '../headmaster/head.models';

@Injectable({ providedIn: 'root' })
export class AcademicSetupStore {
  readonly classTeachers = inject(ClassTeacherService);
  readonly years = inject(AcademicYearService);
  readonly head = inject(HeadDemoStore);
  readonly registry = inject(RegistrarStore);
  readonly grading = inject(GradingPolicyService);
  readonly year = this.years.academicYear;
  readonly readOnly = computed(() => this.years.readOnly('academic'));
  readonly classes = computed(() => this.head.classes().filter(c => (c.academicYearId ?? 'ay-1') === this.year()?.id));
  readonly teachers = computed(() => this.head.staff().filter(s => s.role === 'teacher'));
  readonly pending = computed(() => this.head.pending().filter(s => s.requestedRole === 'teacher'));
  readonly teacherInvitations = computed(() => this.head.invitations().filter(invitation => invitation.role === 'teacher'));
  readonly policy = computed(() => this.grading.forYear(this.year()?.id ?? ''));
  subjects(classId: string) { return this.head.mappings().filter(m => m.classId === classId); }
  private blocked(){return 'This workflow is not available yet. No changes were saved.';}
  private used(c: SchoolClass): boolean {
    return this.classTeachers.history().some(a => a.classId === c.id) || this.registry.hasClassRecords(c.id) || c.studentCount > 0 || this.head.assignments().some(a => a.classId === c.id) ||
      this.registry.teacher.state().assignments.some(a => a.academicYearId === (c.academicYearId ?? 'ay-1') && (a.classStream || a.className) === (c.stream || c.name));
  }
  async saveClass(input:{name:string;stream:string;capacity:number;status:string;subjectIds:string[]},id?:string):Promise<string|null>{if(id)return 'Class editing is not available yet.';try{await this.head.api.write('classes',{name:input.stream.trim()?input.name.trim()+' '+input.stream.trim():input.name,yearId:this.year()?.id});return null;}catch(e){return this.head.api.auth.error(e);}}
  deleteClass(id: string): string | null {
    const blocked = this.blocked(); if (blocked) return blocked;
    const c = this.classes().find(c => c.id === id);
    if (!c || c.enrolmentStatus !== 'draft' || this.used(c)) return 'Only unused draft classes can be deleted.';
    this.head.classes.update(list => list.filter(c => c.id !== id)); this.head.mappings.update(list => list.filter(m => m.classId !== id)); return null;
  }
  saveSubject(name: string, code: string): string | null {
    const blocked = this.blocked(); if (blocked) return blocked;
    if (!name.trim() || !code.trim()) return 'Enter a subject name and code.';
    if (this.head.subjects().some(s => s.code.toLowerCase() === code.trim().toLowerCase() || s.name.toLowerCase() === name.trim().toLowerCase())) return 'This subject already exists.';
    this.head.subjects.update(list => [...list, { id: `subject-${crypto.randomUUID()}`, name: name.trim(), code: code.trim().toUpperCase() }]); return null;
  }
  async inviteTeacher(name: string, email: string, expiresInMinutes: number): Promise<{ error: string | null; expiresAt?: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    if (name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return { error: 'Provide a full name and valid email address.' };
    const existingStaff = this.head.staff().some(person => person.email.toLowerCase() === normalizedEmail);
    const existingRequest = this.head.pending().some(person => person.email.toLowerCase() === normalizedEmail);
    const existingInvitation = this.teacherInvitations().some(invitation => invitation.email?.toLowerCase() === normalizedEmail && invitation.status === 'active' && Date.parse(invitation.expiresAt) > Date.now());
    if (existingStaff || existingRequest || existingInvitation) return { error: 'An account or pending teacher invitation already uses this email.' };
    try {
      const invitation = await this.head.api.write('invitations', { role: 'TEACHER', name: name.trim(), email: normalizedEmail, expiresInMinutes });
      return { error: null, expiresAt: invitation.expiresAt };
    } catch (error) {
      return { error: this.head.api.auth.error(error) };
    }
  }
  verifyTeacher(id: string, note: string): string | null {
    const blocked = this.blocked(); if (blocked) return blocked;
    if (!this.pending().some(t => t.id === id) || note.trim().length < 10) return 'Choose a pending teacher and describe the contact check in at least 10 characters.';
    this.head.pending.update(list => list.map(t => t.id === id ? { ...t, phoneVerified: true, verificationNote: note.trim() } : t)); return null;
  }
  prepareClasses(targetYearId: string): string | null {
    const target = this.years.years().find(y => y.id === targetYearId);
    if (!this.year() || !target || target.status === 'closed' || target.startDate <= this.year()!.startDate) return 'Choose a later editable target year.';
    const existing = this.head.classes().filter(c => c.academicYearId === targetYearId);
    const copies = this.classes().filter(c => !existing.some(e => e.name === c.name && e.stream === c.stream)).map(c => ({ source: c.id, record: { ...c, id: `class-${crypto.randomUUID()}`, academicYearId: targetYearId, studentCount: 0, enrolmentStatus: 'draft' as const } }));
    if (!copies.length) return 'No new class structures to copy.';
    this.head.classes.update(list => [...list, ...copies.map(c => c.record)]);
    const mappings = this.head.mappings();
    this.head.mappings.update(list => [...list, ...copies.flatMap(c => mappings.filter(m => m.classId === c.source).map(m => ({ ...m, id: `mapping-${crypto.randomUUID()}`, classId: c.record.id })))]); return null;
  }
}
