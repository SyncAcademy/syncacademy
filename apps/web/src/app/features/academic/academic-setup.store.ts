import { AcademicDataService } from '../../core/services/academic-data.service';
import { Injectable, computed, inject } from '@angular/core';
import { HeadStore } from '../headmaster/head.store';
import { RegistrarStore } from '../registrar/registrar.store';
import { AcademicYearService } from '../../core/services/academic-year.service';
import { GradingPolicyService } from '../../core/services/grading-policy.service';
import { ClassTeacherService } from '../../core/services/class-teacher.service';
import { SchoolClass } from '../headmaster/head.models';

export function formatClassroomName(name: string, stream: string): string {
  const className = name.trim();
  const streamName = stream.trim();
  if (!streamName) return className;
  if (streamName.toLowerCase().startsWith(className.toLowerCase())) return streamName;
  return /^[a-z0-9]$/i.test(streamName) ? `${className}${streamName}` : `${className} ${streamName}`;
}

@Injectable({ providedIn: 'root' })
export class AcademicSetupStore {
  readonly classTeachers = inject(ClassTeacherService);
  readonly years = inject(AcademicYearService);
  readonly head = inject(HeadStore);
  readonly registry = inject(RegistrarStore);
  readonly grading = inject(GradingPolicyService);
  readonly remote=inject(AcademicDataService);
  readonly year = this.years.academicYear;
  readonly readOnly = computed(() => this.years.readOnly('academic'));
  readonly classes = computed(() => this.head.classes().filter(c => (c.academicYearId ?? 'ay-1') === this.year()?.id));
  readonly teachers = computed(() => this.head.staff().filter(s => s.role === 'teacher'));
  readonly pending = computed(() => this.head.pending().filter(s => s.requestedRole === 'teacher'));
  readonly teacherInvitations = computed(() => this.head.invitations().filter(invitation => invitation.role === 'teacher'));
  readonly policy = computed(() => this.grading.forYear(this.year()?.id ?? ''));
  subjects(classId: string) { return this.head.mappings().filter(m => m.classId === classId); }
  saveClass(input:{name:string;stream:string;subjectIds:string[]},id?:string){return this.remote.command('class',{name:formatClassroomName(input.name,input.stream),subjectIds:input.subjectIds,...(id?{id}:{})});}
  deleteClass(classId:string){return this.remote.command('delete-class',{classId});}
  async saveSubject(name:string,code:string,id?:string){try{await this.head.api.write(`registry/subjects${id ? '/' + id : ''}`,{name,code},id ? 'PATCH' : 'POST');return null;}catch(e){return this.head.api.auth.error(e);}}
  async inviteTeacher(name: string, email: string, expiresInMinutes: number): Promise<{ error: string | null; expiresAt?: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    if (name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return { error: 'Provide a full name and valid email address.' };
    const existingRequest = this.head.pending().some(person => person.email.toLowerCase() === normalizedEmail);
    const existingInvitation = this.teacherInvitations().some(invitation => invitation.email?.toLowerCase() === normalizedEmail && invitation.status === 'active' && Date.parse(invitation.expiresAt) > Date.now());
    if (existingRequest || existingInvitation) return { error: 'A pending teacher invitation already uses this email.' };
    try {
      const invitation = await this.head.api.write('invitations', { role: 'TEACHER', name: name.trim(), email: normalizedEmail, expiresInMinutes });
      return { error: null, expiresAt: invitation.expiresAt };
    } catch (error) {
      return { error: this.head.api.auth.error(error) };
    }
  }
  prepareClasses(targetYearId:string){return this.remote.command('copy-classes',{targetYearId});}
}
