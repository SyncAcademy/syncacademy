import { SchoolApiService } from '../../core/services/school-api.service';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { AcademicYearService } from '../../core/services/academic-year.service';
import { HeadDemoStore } from '../headmaster/head-demo.store';
import { TeacherDemoStore, demoGrade } from '../teacher/teacher-demo.store';
import { MOCK_ROSTER_STUDENTS } from '../teacher/teacher-mock-data';
import { ReportDemoStore } from '../headmaster/report-demo.store';

export interface StudentProfile { id: string; number: string; name: string; gender: 'M' | 'F' | '';  birthDate: string; address: string; admittedYearId: string; }
export interface Enrolment { id: string; studentId: string; studentName: string; yearId: string; classId: string; status: 'active' | 'transferred_out' | 'withdrawn' | 'graduated'; joined: string; }
export interface Admission { id: string; yearId: string; name: string; gender: 'M' | 'F'; birthDate: string; guardianName: string; phone: string; requestedClassId: string; status: 'pending' | 'accepted' | 'rejected'; note: string; createdAt: string; studentId?: string; }
export interface Guardian { id: string; name: string; relationship: string; phone: string; email: string; studentIds: string[]; verifiedAt: string | null; verificationNote: string; }
export interface RegistryEvent { id: string; yearId: string; studentId?: string; at: string; kind: string; message: string; }
interface RegistryState { students: StudentProfile[]; enrolments: Enrolment[]; admissions: Admission[]; guardians: Guardian[]; events: RegistryEvent[]; }
export interface StudentInput { number: string; name: string; gender: string; birthDate: string; address: string; }
export interface AdmissionInput { name: string; gender: string; birthDate: string; guardianName: string; phone: string; requestedClassId: string; }

@Injectable({ providedIn: 'root' })
export class RegistrarStore {
  readonly years = inject(AcademicYearService);
  readonly head = inject(HeadDemoStore);
  readonly teacher = inject(TeacherDemoStore);
  readonly reports = inject(ReportDemoStore);
  readonly year = computed(() => this.api.role() === 'HEADMASTER' ? this.years.headYear() : this.years.registerYear());
  readonly readOnly = computed(() => !this.year() || this.year()?.status === 'closed');
  readonly storageAvailable = signal(true);
  private readonly state = signal<RegistryState>(this.restore());
  readonly allStudents = computed(() => this.state().students);
  readonly allGuardians = computed(() => this.state().guardians);
  readonly classes = computed(() => this.classesFor(this.year()?.id ?? ''));
  readonly openClasses = computed(() => this.classes().filter(c => c.enrolmentStatus === 'open'));
  readonly enrolments = computed(() => this.state().enrolments.filter(e => e.yearId === this.year()?.id));
  readonly students = computed(() => this.allStudents().filter(s => s.admittedYearId === this.year()?.id || this.enrolments().some(e => e.studentId === s.id)));
  readonly admissions = computed(() => this.state().admissions.filter(a => a.yearId === this.year()?.id));
  readonly guardians = computed(() => this.allGuardians().filter(g => g.studentIds.some(id => this.students().some(s => s.id === id))));
  readonly events = computed(() => this.state().events.filter(e => e.yearId === this.year()?.id));
  readonly pending = computed(() => this.admissions().filter(a => a.status === 'pending'));
  readonly unassigned = computed(() => this.students().filter(s => !this.enrolments().some(e => e.studentId === s.id)));
  readonly attentionCount = computed(() => this.pending().length + this.unassigned().length + this.guardians().filter(g => !g.verifiedAt).length);
  readonly counts = computed(() => this.classes().map(c => ({ ...c, active: this.enrolments().filter(e => e.classId === c.id && e.status === 'active').length })));
  readonly stats = computed(() => ({ active: this.enrolments().filter(e => e.status === 'active').length,
    pending: this.pending().length, unassigned: this.unassigned().length,
    unverified: this.guardians().filter(g => !g.verifiedAt).length,
    noGuardian: this.students().filter(s => !this.guardians().some(g => g.studentIds.includes(s.id))).length,
  }));
  readonly api=inject(SchoolApiService); constructor(){effect(()=>{const students=this.api.data()?.students||[];this.state.set({students:students.map((s:any)=>({id:s.id,number:s.admissionNumber,name:s.name,gender:s.gender||'',birthDate:s.dateOfBirth?.slice(0,10)||'',address:s.address||'',admittedYearId:s.enrollments[0]?.classroom.yearId||''})),enrolments:students.flatMap((s:any)=>s.enrollments.map((e:any)=>({id:e.id,studentId:s.id,studentName:s.name,yearId:e.classroom.yearId,classId:e.classroomId,status:'active',joined:e.createdAt}))),admissions:[],guardians:[],events:[]});});}
  eventsFor(yearId: string) { return this.state().events.filter(e => e.yearId === yearId); }
  admissionsFor(yearId: string) { return this.state().admissions.filter(e => e.yearId === yearId); }
  enrolmentsFor(yearId: string) { return this.state().enrolments.filter(e => e.yearId === yearId); }
  classesFor(yearId: string) { return this.head.classes().filter(c => (c.academicYearId ?? 'ay-1') === yearId); }
  hasClassRecords(classId: string): boolean { return this.state().enrolments.some(e => e.classId === classId) || this.state().admissions.some(a => a.requestedClassId === classId); }
  classError(classId: string, yearId = this.year()?.id ?? '', additions = 1): string | null {
    const year = this.years.years().find(y => y.id === yearId);
    const c = this.classesFor(yearId).find(c => c.id === classId);
    if (!year || year.status === 'closed' || !c || c.enrolmentStatus !== 'open') return 'Choose a class opened for enrolment by the Academic Master.';
    const count = this.state().enrolments.filter(e => e.yearId === yearId && e.classId === classId && e.status === 'active').length;
    return c.capacity != null && count + additions > c.capacity ? 'This class does not have enough remaining capacity.' : null;
  }
  className(id: string): string { const c = this.head.classes().find(c => c.id === id); return c ? c.stream || c.name : 'Unassigned'; }
  student(id: string) { return this.allStudents().find(s => s.id === id); }
  enrolment(studentId: string) { return this.enrolments().find(e => e.studentId === studentId); }
  history(studentId: string) { return this.state().enrolments.filter(e => e.studentId === studentId); }
  archivedResults(studentId: string) {
    const number = this.student(studentId)?.number;
    return (this.teacher.state().rosterArchives ?? []).flatMap(archive => archive.entries.filter(entry => entry.studentNumber === number).map(entry => ({
      ...entry, archivedAt: archive.archivedAt, assignment: this.teacher.state().assignments.find(a => a.id === archive.assignmentId),
    })));
  }
  contacts(studentId: string) { return this.allGuardians().filter(g => g.studentIds.includes(studentId)); }
  private id(prefix: string) { return `${prefix}-${crypto.randomUUID()}`; }
  private blocked():string|null { return 'This workflow is not available yet. No changes were saved.'; }
  private date(date: string): boolean { return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date; }
  private phone(value: string): string { const clean = value.replace(/[\s()-]/g, ''); return /^0\d{9}$/.test(clean) ? `+255${clean.slice(1)}` : clean; }
  private validPhone(value: string): boolean { return /^\+[1-9]\d{7,14}$/.test(this.phone(value)); }
  private profileError(input: { name: string; gender: string; birthDate: string }): string | null {
    return input.name.trim().length < 3 || !['M', 'F'].includes(input.gender) || !this.date(input.birthDate) || input.birthDate >= new Date().toISOString().slice(0, 10) ? 'Enter a full name, gender, and valid past birth date.' : null;
  }
  private event(kind: string, message: string, studentId?: string, yearId = this.year()!.id): RegistryEvent { return { id: this.id('event'), yearId, studentId, at: new Date().toISOString(), kind, message }; }
  private nextNumber(): string { let n = this.allStudents().length + 1; while (this.allStudents().some(s => s.number === `SA-${this.year()!.label}-${String(n).padStart(5, '0')}`)) n++; return `SA-${this.year()!.label}-${String(n).padStart(5, '0')}`; }
  private syncCounts(): void {
    const yearId = this.year()!.id;
    this.head.classes.update(list => list.map(c => (c.academicYearId ?? 'ay-1') === yearId ? { ...c, studentCount: this.enrolments().filter(e => e.classId === c.id && e.status === 'active').length } : c));
  }
  async saveStudent(input:StudentInput,id?:string,classId=''):Promise<string|null>{ if(id)return 'Editing student profiles is not available yet.';try{await this.api.write('students',{name:input.name,admissionNumber:input.number,classroomId:classId,gender:input.gender||undefined,address:input.address,...(input.birthDate?{dateOfBirth:input.birthDate}:{})});return null;}catch(e){return this.api.auth.error(e);} }
  saveAdmission(input: AdmissionInput): string | null {
    const error = this.blocked() ?? this.profileError(input); if (error) return error;
    const classError = this.classError(input.requestedClassId); if (classError) return classError;
    if (input.guardianName.trim().length < 3 || !this.validPhone(input.phone) || !this.classes().some(c => c.id === input.requestedClassId)) return 'Enter a guardian name, valid phone number, and requested class.';
    if (this.admissions().some(a => a.name.toLowerCase() === input.name.trim().toLowerCase() && a.birthDate === input.birthDate && a.status !== 'rejected')) return 'An application for this name and birth date already exists in this year.';
    const admission: Admission = { ...input, id: this.id('application'), yearId: this.year()!.id, name: input.name.trim(), guardianName: input.guardianName.trim(), phone: this.phone(input.phone), gender: input.gender as 'M' | 'F', status: 'pending', note: '', createdAt: new Date().toISOString() };
    this.state.update(s => ({ ...s, admissions: [...s.admissions, admission], events: [this.event('admission', `Application received: ${admission.name}`), ...s.events] })); return null;
  }
  decideAdmission(id: string, decision: 'accepted' | 'rejected', classId: string, note: string): string | null {
    const error = this.blocked(); if (error) return error;
    const a = this.admissions().find(a => a.id === id && a.status === 'pending');
    if (!a) return 'Only pending applications can be reviewed.';
    if (!['accepted', 'rejected'].includes(decision)) return 'Choose an admission decision.';
    if (decision === 'rejected' && note.trim().length < 10) return 'Record a reason of at least 10 characters.';
    if (decision === 'accepted' && !this.classes().some(c => c.id === classId)) return 'Choose a class in the selected year.';
    if (decision === 'accepted') { const classError = this.classError(classId); if (classError) return classError; }
    const studentId = this.id('student');
    const student: StudentProfile = { id: studentId, number: this.nextNumber(), name: a.name, gender: a.gender, birthDate: a.birthDate, address: '', admittedYearId: this.year()!.id };
    const enrolment: Enrolment = { id: this.id('enrolment'), yearId: this.year()!.id, studentId, studentName: a.name, classId, status: 'active', joined: new Date().toISOString().slice(0, 10) };
    const guardian: Guardian = { id: this.id('guardian'), name: a.guardianName, phone: a.phone, relationship: 'Guardian', email: '', studentIds: [studentId], verifiedAt: null, verificationNote: '' };
    this.state.update(s => ({ ...s, admissions: s.admissions.map(item => item.id === id ? { ...item, status: decision, note: note.trim(), studentId: decision === 'accepted' ? studentId : undefined } : item),
      students: decision === 'accepted' ? [...s.students, student] : s.students,
      enrolments: decision === 'accepted' ? [...s.enrolments, enrolment] : s.enrolments,
      guardians: decision === 'accepted' ? [...s.guardians, guardian] : s.guardians,
      events: [this.event('admission', `${a.name}: application ${decision}${note ? ` — ${note.trim()}` : ''}`, decision === 'accepted' ? studentId : undefined), ...s.events] }));
    this.syncCounts(); if (decision === 'accepted') this.publishRoster(classId); return null;
  }
  enrol(studentId: string, classId: string): string | null {
    const error = this.blocked(); if (error) return error;
    const classError = this.classError(classId); if (classError) return classError;
    const student = this.student(studentId);
    if (!student || !this.classes().some(c => c.id === classId)) return 'Select a student and a class in this year.';
    if (this.enrolment(studentId)) return 'This student already has a record in this academic year. Use Transfers to change their class or status.';
    this.state.update(s => ({ ...s, enrolments: [...s.enrolments, { id: this.id('enrolment'), yearId: this.year()!.id, studentId, studentName: student.name, classId, status: 'active', joined: new Date().toISOString().slice(0, 10) }],
      events: [this.event('enrolment', `${student.name} enrolled in ${this.className(classId)}`, studentId), ...s.events] }));
    this.syncCounts(); this.publishRoster(classId); return null;
  }
  move(studentId: string, action: 'class_change' | 'transferred_out' | 'withdrawn' | 'graduated', classId: string, reason: string): string | null {
    const error = this.blocked(); if (error) return error;
    const enrolment = this.enrolment(studentId);
    if (!enrolment || enrolment.status !== 'active') return 'Select a currently enrolled student.';
    const sourceError = this.classError(enrolment.classId, this.year()!.id, 0); if (sourceError) return sourceError;
    if (action === 'class_change') { const targetError = this.classError(classId); if (targetError) return targetError; }
    if (!['class_change', 'transferred_out', 'withdrawn', 'graduated'].includes(action) || reason.trim().length < 10) return 'Choose an action and record a reason of at least 10 characters.';
    if (action === 'class_change' && (!this.classes().some(c => c.id === classId) || classId === enrolment.classId)) return 'Choose a different class in the selected year.';
    this.state.update(s => ({ ...s, enrolments: s.enrolments.map(e => e.id === enrolment.id ? { ...e, classId: action === 'class_change' ? classId : e.classId, status: action === 'class_change' ? 'active' : action } : e),
      events: [this.event('movement', `${enrolment.studentName}: ${this.className(enrolment.classId)} → ${action === 'class_change' ? this.className(classId) : action.replaceAll('_', ' ')}. ${reason.trim()}`, studentId), ...s.events] }));
    this.syncCounts(); this.publishRoster(enrolment.classId); if (action === 'class_change') this.publishRoster(classId); return null;
  }
  saveGuardian(input: { name: string; relationship: string; phone: string; email: string; studentId: string }, id?: string): string | null {
    const error = this.blocked(); if (error) return error;
    const previous = this.guardians().find(g => g.id === id);
    if ((id && !previous) || input.name.trim().length < 3 || !input.relationship.trim() || !this.validPhone(input.phone) || (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) || (!id && !this.students().some(s => s.id === input.studentId))) return 'Provide a guardian name, relationship, valid contact details, and a student in this year.';
    const phone = this.phone(input.phone);
    if (!id && this.allGuardians().some(g => g.phone === phone && g.name.toLowerCase() === input.name.trim().toLowerCase())) return 'This guardian already exists. Use Link existing guardian.';
    const changed = previous && (previous.phone !== phone || previous.name !== input.name.trim() || previous.email !== input.email.trim());
    const guardian: Guardian = { id: id ?? this.id('guardian'), name: input.name.trim(), relationship: input.relationship.trim(), phone, email: input.email.trim(), studentIds: previous?.studentIds ?? [input.studentId], verifiedAt: changed ? null : previous?.verifiedAt ?? null, verificationNote: changed ? '' : previous?.verificationNote ?? '' };
    this.state.update(s => ({ ...s, guardians: id ? s.guardians.map(g => g.id === id ? guardian : g) : [...s.guardians, guardian], events: [this.event('guardian', `${id ? 'Updated' : 'Added'} guardian ${guardian.name}`), ...s.events] }));
    this.syncReportContacts(); return null;
  }
  linkGuardian(guardianId: string, studentId: string): string | null {
    const error = this.blocked(); if (error) return error;
    const guardian = this.allGuardians().find(g => g.id === guardianId);
    if (!guardian || !this.students().some(s => s.id === studentId)) return 'Select a guardian and a student in this year.';
    if (guardian.studentIds.includes(studentId)) return 'This guardian is already linked to this student.';
    this.state.update(s => ({ ...s, guardians: s.guardians.map(g => g.id === guardianId ? { ...g, studentIds: [...g.studentIds, studentId] } : g), events: [this.event('guardian', `${guardian.name} linked to ${this.student(studentId)!.name}`, studentId), ...s.events] }));
    this.syncReportContacts(); return null;
  }
  verifyGuardian(id: string, note: string): string | null {
    const error = this.blocked(); if (error) return error;
    if (!this.guardians().some(g => g.id === id) || note.trim().length < 10) return 'Record how the contact was checked in at least 10 characters.';
    this.state.update(s => ({ ...s, guardians: s.guardians.map(g => g.id === id ? { ...g, verifiedAt: new Date().toISOString(), verificationNote: note.trim() } : g), events: [this.event('guardian', 'Guardian contact verification recorded.'), ...s.events] }));
    this.syncReportContacts(); return null;
  }
  syncReportContacts():number { return 0; }
  publishRoster(classId: string): { error?: string; updated: number; locked: number } {
    const error = this.blocked(); if (error) return { error, updated: 0, locked: 0 };
    const classError = this.classError(classId, this.year()!.id, 0); if (classError) return { error: classError, updated: 0, locked: 0 };
    const roster = this.enrolments().filter(e => e.classId === classId && e.status === 'active').map(e => this.student(e.studentId)!);
    const assignments = this.teacher.state().assignments.filter(a => a.academicYearId === this.year()?.id && (a.classStream || a.className) === this.className(classId));
    const editable = assignments.filter(a => ['draft', 'returned'].includes(a.assessmentProgress.status));
    this.teacher.state.update(s => {
      const marks = { ...s.marks };
      const rosterArchives = [...(s.rosterArchives ?? [])];
      for (const a of editable) {
        const removed = (marks[a.id] ?? []).filter(m => !roster.some(student => student.number === m.studentNumber));
        if (removed.length) rosterArchives.push({ assignmentId: a.id, archivedAt: new Date().toISOString(), entries: structuredClone(removed) });
        marks[a.id] = roster.map(student => {
        const old = marks[a.id]?.find(m => m.studentNumber === student.number);
        return old ? { ...old, fullName: student.name, gender: student.gender } : { studentId: `${a.id}-${student.id}`, studentNumber: student.number, fullName: student.name, gender: student.gender, marksValue: null, grade: null, comments: '', lastSaved: null };
      });
      }
      return { ...s, marks, rosterArchives, assignments: s.assignments.map(a => editable.some(item => item.id === a.id) ? { ...a, studentCount: roster.length, rosterStatus: 'pending', assessmentProgress: { ...a.assessmentProgress, total: roster.length, completed: marks[a.id].filter(m => demoGrade(m.marksValue) !== null).length } } : a) };
    });
    this.state.update(s => ({ ...s, events: [this.event('roster', `${this.className(classId)}: published ${roster.length} students to ${editable.length} editable assessment roster(s).`), ...s.events] }));
    return { updated: editable.length, locked: assignments.length - editable.length };
  }
  private targetError(yearId: string): string | null {
    const target = this.years.years().find(y => y.id === yearId);
    return !this.year() || !target || target.status === 'closed' || target.startDate <= this.year()!.startDate ? 'Select a later, open or draft academic year.' : null;
  }
  promote(studentIds: string[], targetYearId: string, classId: string): string | null {
    const error = this.targetError(targetYearId); if (error) return error;
    const ids = [...new Set(studentIds)];
    const capacityError = this.classError(classId, targetYearId, ids.length); if (capacityError) return capacityError;
    if (!ids.length || !this.classesFor(targetYearId).some(c => c.id === classId)) return 'Select students and a target class.';
    if (ids.some(id => !this.enrolments().some(e => e.studentId === id && e.status === 'active'))) return 'Only active source-year enrolments can be progressed.';
    if (ids.some(id => this.state().enrolments.some(e => e.studentId === id && e.yearId === targetYearId))) return 'One or more selected students already have a target-year enrolment. No changes were made.';
    const additions: Enrolment[] = ids.map(studentId => ({ id: this.id('enrolment'), studentId, studentName: this.student(studentId)!.name, yearId: targetYearId, classId, status: 'active', joined: this.years.years().find(y => y.id === targetYearId)!.startDate }));
    this.state.update(s => ({ ...s, enrolments: [...s.enrolments, ...additions], events: [this.event('progression', `${ids.length} student(s) enrolled in ${this.className(classId)} from ${this.year()!.label}.`, undefined, targetYearId), ...s.events] }));
    this.head.classes.update(list => list.map(c => c.id === classId ? { ...c, studentCount: this.state().enrolments.filter(e => e.yearId === targetYearId && e.classId === classId && e.status === 'active').length } : c)); return null;
  }
  private restore():RegistryState { return {students:[],enrolments:[],admissions:[],guardians:[],events:[]}; }
}
