import { requestId } from '../../core/services/request-id';
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SaEditorComponent, EditorField } from '../super-admin/components/sa-editor.component';
import { displayClassName } from '../headmaster/head.models';

type RegistryStudent = {
  id: string;
  name: string;
  admissionNumber: string;
};

type TeacherAssignmentCard = {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'inactive';
  classTeacherClasses: { id: string; name: string }[];
  teachingAssignments: { id: string; name: string; classes: { id: string; name: string }[] }[];
};

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SaEditorComponent],
  templateUrl: './workspace.page.html',
  styleUrls: ['./workspace.page.scss'],
})
export class WorkspacePage implements OnInit {
  readonly displayClassName = displayClassName;
  readonly invitationExpiryChoices = [
    { value: '5', label: '5 minutes' },
    { value: '15', label: '15 minutes' },
    { value: '30', label: '30 minutes' },
    { value: '60', label: '1 hour' },
    { value: '240', label: '4 hours' },
    { value: '720', label: '12 hours' },
    { value: '1440', label: '24 hours' },
    { value: '2880', label: '48 hours' },
    { value: '10080', label: '7 days' },
  ];

  auth = inject(AuthService);
  router = inject(Router);
  route = inject(ActivatedRoute);

  schools: any[] = [];
  total = 0;
  page = 1;
  schoolSearch = '';private schoolSearchTimer?:ReturnType<typeof setTimeout>;
  schoolId = '';
  workspace: any = null;
  studentPage = 1;
  readonly studentPageSize = 25;
  get studentPages(): number { return Math.max(1, Math.ceil((this.workspace?.studentCount ?? 0) / this.studentPageSize)); }
  get studentRangeStart(): number { return this.workspace?.students?.length ? (this.studentPage - 1) * this.studentPageSize + 1 : 0; }
  get studentRangeEnd(): number { return Math.min(this.studentPage * this.studentPageSize, this.workspace?.studentCount ?? 0); }
  selectedClassId = '';
  classSearch = '';
  classYearId = '';
  studentSearch = '';
  classStudents: RegistryStudent[] = [];
  classStudentTotal = 0;
  studentsLoading = false;
  studentsError = '';
  private studentRequestGeneration = 0;
  private studentSearchTimer?: ReturnType<typeof setTimeout>;
  get classStudentPages(): number { return Math.max(1, Math.ceil(this.classStudentTotal / this.studentPageSize)); }
  get classStudentRangeStart(): number { return this.classStudents.length ? (this.studentPage - 1) * this.studentPageSize + 1 : 0; }
  get classStudentRangeEnd(): number { return Math.min(this.studentPage * this.studentPageSize, this.classStudentTotal); }
  teacherAssignmentYearId = '';
  teacherAssignmentSearch = '';
  teacherAssignmentClassId = '';
  teacherAssignmentSubjectId = '';
  teacherAssignmentRole = 'all';
  teacherAssignmentPage = 1;
  teacherAssignmentPageSize = 20;
  teacherAssignments: TeacherAssignmentCard[] = [];
  teacherAssignmentTotal = 0;
  teacherAssignmentsLoading = false;
  teacherAssignmentsError = '';
  private teacherAssignmentRequestGeneration = 0;
  private teacherAssignmentSearchTimer?: ReturnType<typeof setTimeout>;
  get teacherAssignmentPages(): number {
    return Math.max(1, Math.ceil(this.teacherAssignmentTotal / this.teacherAssignmentPageSize));
  }
  get teacherAssignmentRangeStart(): number {
    return this.teacherAssignments.length ? (this.teacherAssignmentPage - 1) * this.teacherAssignmentPageSize + 1 : 0;
  }
  get teacherAssignmentRangeEnd(): number {
    return Math.min(this.teacherAssignmentPage * this.teacherAssignmentPageSize, this.teacherAssignmentTotal);
  }
  get teacherAssignmentClasses(): any[] {
    return (this.workspace?.classes || []).filter((classroom: any) => classroom.yearId === this.teacherAssignmentYearId);
  }
  get visibleClasses(): any[] {
    const query = this.classSearch.trim().toLowerCase();
    return (this.workspace?.classes || []).filter((classroom: any) =>
      (!this.classYearId || classroom.yearId === this.classYearId) &&
      (!query || `${displayClassName(classroom.name)} ${classroom.year?.name || ''} ${(this.workspace?.assignments || [])
        .filter((assignment: any) => assignment.classroomId === classroom.id)
        .map((assignment: any) => `${assignment.membership?.user?.name || ''} ${assignment.subject?.name || ''}`)
        .join(' ')}`.toLowerCase().includes(query))
    );
  }
  get selectedStudentClass(): any | undefined {
    return (this.workspace?.classes || []).find((classroom: any) => classroom.id === this.selectedClassId);
  }
  assignmentsForClass(classroomId: string): any[] {
    return (this.workspace?.assignments || []).filter((assignment: any) => assignment.classroomId === classroomId);
  }
  get visibleAssignments(): any[] {
    const classIds = new Set(this.visibleClasses.map(classroom => classroom.id));
    const query = this.classSearch.trim().toLowerCase();
    return (this.workspace?.assignments || []).filter((assignment: any) => {
      const className = assignment.classroom?.name || '';
      const teacherName = assignment.membership?.user?.name || '';
      const subjectName = assignment.subject?.name || 'Class teacher';
      return classIds.has(assignment.classroomId) &&
        (!query || `${className} ${teacherName} ${subjectName}`.toLowerCase().includes(query));
    });
  }
  audit: any[] = [];
  auditPage = 1; auditTotal = 0; auditSearch = '';
  get auditPages():number { return Math.max(1,Math.ceil(this.auditTotal/25)); }
  tab = 'overview';
  busy = false;
  error = '';
  notice = '';
  mobileMenuOpen = false;

  editor: { title: string; path: string; fields: EditorField[]; values: Record<string, any>; method?: string; key?: string; fingerprint?: string } | null = null;
  editorError = '';
  saving = false;

  readonly roleNames: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin',
    HEADMASTER: 'Headmaster',
    REGISTRAR: 'Registrar',
    ACADEMIC: 'Academic Master',
    TEACHER: 'Teacher',
    BURSAR: 'Bursar',
  };

  get role(): string {
    return this.auth.identity()?.platformAdmin
      ? 'Super Admin'
      : this.roleNames[this.route.snapshot.data['role']] || 'My workspace';
  }

  get canManage(): boolean {
    return !!this.workspace?.permissions.staffManager;
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  async ngOnInit(): Promise<void> {
    const requested = this.route.snapshot.queryParamMap.get('school');
    this.tab = this.route.snapshot.queryParamMap.get('tab') || 'overview';
    const memberships = this.auth.identity()?.memberships || [];
    this.schoolId = requested || memberships.find(m => m.role === this.route.snapshot.data['role'])?.school.id || memberships[0]?.school.id || '';
    await this.load();
  }

  async run(action: () => Promise<void>): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.error = '';
    try {
      await action();
    } catch (e: any) {
      this.error = this.auth.error(e);
      if (e?.status === 401) {
        this.auth.identity.set(null);
        await this.router.navigateByUrl('/auth/login');
      }
    } finally {
      this.busy = false;
    }
  }

  async load(): Promise<void> {
    await this.run(async () => {
      const platformAdmin = !!this.auth.identity()?.platformAdmin;
      if (platformAdmin && (!this.schoolId || this.tab === 'overview')) {
        const list = await this.auth.request('GET', 'schools?' + new URLSearchParams({page:String(this.page),q:this.schoolSearch}));
        this.schools = list.items;
        this.total = list.total;
      }
      const workspaceParams = new URLSearchParams();
      if (platformAdmin) {
        workspaceParams.set('view', 'summary');
      } else {
        workspaceParams.set('page', String(this.studentPage));
        workspaceParams.set('pageSize', String(this.studentPageSize));
      }
      this.workspace = this.schoolId
        ? await this.auth.request('GET', `schools/${this.schoolId}/workspace?${workspaceParams}`)
        : null;
      if (this.tab === 'audit') {
        const params=new URLSearchParams({page:String(this.auditPage),q:this.auditSearch});if(this.schoolId)params.set('schoolId',this.schoolId);
        const result=await this.auth.request('GET','audit?'+params);this.audit=result.items;this.auditTotal=result.total;
      }
    });
    if (this.auth.identity()?.platformAdmin && this.tab === 'classes' && !this.error) {
      await this.loadTeacherAssignments();
    }
  }

  async refresh(): Promise<void> {
    await this.load();
    if (this.auth.identity()?.platformAdmin && this.tab === 'students' && this.selectedClassId && !this.error) {
      await this.loadClassStudents();
    }
  }

  private async reloadWorkspace(): Promise<any> {
    if (!this.schoolId) return null;
    const params = new URLSearchParams();
    if (this.auth.identity()?.platformAdmin) params.set('view', 'summary');
    const query = params.toString();
    return this.auth.request('GET', `schools/${this.schoolId}/workspace${query ? `?${query}` : ''}`);
  }

  async choose(id: string): Promise<void> {
    this.studentRequestGeneration++;
    this.schoolId = id;
    this.auditPage=1;this.auditSearch='';
    this.studentPage = 1;
    this.selectedClassId = '';
    this.studentSearch = '';
    this.classStudents = [];
    this.classStudentTotal = 0;
    this.studentsError = '';
    this.studentsLoading = false;
    clearTimeout(this.studentSearchTimer);
    this.workspace = null;
    this.teacherAssignmentRequestGeneration++;
    this.teacherAssignmentYearId = '';
    this.teacherAssignments = [];
    this.teacherAssignmentTotal = 0;
    this.teacherAssignmentsError = '';
    this.tab = 'overview';
    this.notice = '';
    this.closeMobileMenu();
    await this.load();
  }

  async changeTab(tab: string): Promise<void> {
    this.tab = tab;
    if (tab === 'students' && !this.auth.identity()?.platformAdmin) this.studentPage = 1;
    this.closeMobileMenu();
    if (tab === 'audit' ||
      (tab === 'overview' && !!this.auth.identity()?.platformAdmin) ||
      (tab === 'students' && (!this.auth.identity()?.platformAdmin || !this.workspace))) {
      await this.load();
    } else if (tab === 'classes' && this.auth.identity()?.platformAdmin && this.workspace) {
      await this.loadTeacherAssignments();
    }
  }
  async loadTeacherAssignments(): Promise<void> {
    if (!this.schoolId || !this.auth.identity()?.platformAdmin || !this.workspace) return;
    if (!this.teacherAssignmentYearId) {
      const currentYear = (this.workspace.years || []).find((year: any) => !year.closed);
      this.teacherAssignmentYearId = currentYear?.id || this.workspace.years?.[0]?.id || '';
    }
    if (!this.teacherAssignmentYearId) {
      this.teacherAssignments = [];
      this.teacherAssignmentTotal = 0;
      this.teacherAssignmentsError = '';
      return;
    }
    const generation = ++this.teacherAssignmentRequestGeneration;
    const schoolId = this.schoolId;
    const params = new URLSearchParams({
      yearId: this.teacherAssignmentYearId,
      page: String(this.teacherAssignmentPage),
      pageSize: String(this.teacherAssignmentPageSize),
      search: this.teacherAssignmentSearch.trim(),
      role: this.teacherAssignmentRole,
    });
    if (this.teacherAssignmentClassId) params.set('classId', this.teacherAssignmentClassId);
    if (this.teacherAssignmentSubjectId) params.set('subjectId', this.teacherAssignmentSubjectId);
    this.teacherAssignmentsLoading = true;
    this.teacherAssignmentsError = '';
    try {
      const result = await this.auth.request('GET', `schools/${schoolId}/teacher-assignments?${params}`);
      if (generation !== this.teacherAssignmentRequestGeneration || schoolId !== this.schoolId) return;
      this.teacherAssignments = result.items;
      this.teacherAssignmentTotal = result.total;
    } catch (error) {
      if (generation !== this.teacherAssignmentRequestGeneration || schoolId !== this.schoolId) return;
      this.teacherAssignments = [];
      this.teacherAssignmentTotal = 0;
      this.teacherAssignmentsError = this.auth.error(error);
    } finally {
      if (generation === this.teacherAssignmentRequestGeneration) this.teacherAssignmentsLoading = false;
    }
  }
  filterTeacherAssignments(): Promise<void> {
    this.teacherAssignmentPage = 1;
    return this.loadTeacherAssignments();
  }
  searchTeacherAssignments(value: string): void {
    this.teacherAssignmentSearch = value;
    this.teacherAssignmentPage = 1;
    clearTimeout(this.teacherAssignmentSearchTimer);
    this.teacherAssignmentSearchTimer = setTimeout(() => void this.loadTeacherAssignments(), 250);
  }
  changeTeacherAssignmentYear(yearId: string): Promise<void> {
    this.teacherAssignmentYearId = yearId;
    this.teacherAssignmentClassId = '';
    this.teacherAssignmentSubjectId = '';
    this.teacherAssignmentPage = 1;
    return this.loadTeacherAssignments();
  }
  resetTeacherAssignmentFilters(): Promise<void> {
    clearTimeout(this.teacherAssignmentSearchTimer);
    this.teacherAssignmentSearch = '';
    this.teacherAssignmentClassId = '';
    this.teacherAssignmentSubjectId = '';
    this.teacherAssignmentRole = 'all';
    this.teacherAssignmentPage = 1;
    return this.loadTeacherAssignments();
  }
  changeTeacherAssignmentPageSize(pageSize: number): Promise<void> {
    this.teacherAssignmentPageSize = pageSize;
    this.teacherAssignmentPage = 1;
    return this.loadTeacherAssignments();
  }
  changeTeacherAssignmentPage(change: number): Promise<void> {
    this.teacherAssignmentPage = Math.min(
      this.teacherAssignmentPages,
      Math.max(1, this.teacherAssignmentPage + change),
    );
    return this.loadTeacherAssignments();
  }
  teacherInitials(name: string): string {
    return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  }
  async filterAudit(value:string):Promise<void>{this.auditSearch=value;this.auditPage=1;await this.load();}
  filterSchools(value:string):void{this.schoolSearch=value;this.page=1;clearTimeout(this.schoolSearchTimer);this.schoolSearchTimer=setTimeout(()=>void this.load(),250);}
  async changeAuditPage(change:number):Promise<void>{this.auditPage=Math.max(1,this.auditPage+change);await this.load();}
  async changeStudentPage(change: number): Promise<void> {
    if (this.auth.identity()?.platformAdmin) {
      this.studentPage = Math.min(this.classStudentPages, Math.max(1, this.studentPage + change));
      await this.loadClassStudents();
      return;
    }
    const previousPage = this.studentPage;
    this.studentPage = Math.min(this.studentPages, Math.max(1, this.studentPage + change));
    await this.load();
    if (this.error) this.studentPage = previousPage;
  }

  async openClassStudents(classroomId: string): Promise<void> {
    if (!(this.workspace?.classes || []).some((classroom: any) => classroom.id === classroomId)) return;
    clearTimeout(this.studentSearchTimer);
    this.selectedClassId = classroomId;
    this.tab = 'students';
    this.studentPage = 1;
    this.studentSearch = '';
    this.classStudents = [];
    this.classStudentTotal = 0;
    this.studentsError = '';
    this.closeMobileMenu();
    await this.loadClassStudents();
  }

  backToStudentClasses(): void {
    this.studentRequestGeneration++;
    clearTimeout(this.studentSearchTimer);
    this.selectedClassId = '';
    this.studentPage = 1;
    this.studentSearch = '';
    this.classStudents = [];
    this.classStudentTotal = 0;
    this.studentsError = '';
    this.studentsLoading = false;
  }

  filterClassStudents(value: string): void {
    this.studentSearch = value;
    this.studentPage = 1;
    this.studentRequestGeneration++;
    this.studentsLoading = true;
    this.studentsError = '';
    clearTimeout(this.studentSearchTimer);
    this.studentSearchTimer = setTimeout(() => void this.loadClassStudents(), 250);
  }

  async loadClassStudents(): Promise<void> {
    const classroom = this.selectedStudentClass;
    if (!this.schoolId || !classroom || !this.auth.identity()?.platformAdmin) return;
    const generation = ++this.studentRequestGeneration;
    const schoolId = this.schoolId;
    const classroomId = classroom.id;
    const params = new URLSearchParams({
      yearId: classroom.yearId,
      classId: classroom.id,
      status: 'active',
      page: String(this.studentPage),
      pageSize: String(this.studentPageSize),
      q: this.studentSearch.trim(),
    });
    this.studentsLoading = true;
    this.studentsError = '';
    try {
      const result = await this.auth.request('GET', `schools/${schoolId}/registry/students?${params}`);
      if (generation !== this.studentRequestGeneration || schoolId !== this.schoolId || classroomId !== this.selectedClassId) return;
      this.classStudents = result.items;
      this.classStudentTotal = result.total;
    } catch (error) {
      if (generation !== this.studentRequestGeneration || schoolId !== this.schoolId || classroomId !== this.selectedClassId) return;
      this.classStudents = [];
      this.classStudentTotal = 0;
      this.studentsError = this.auth.error(error);
    } finally {
      if (generation === this.studentRequestGeneration) this.studentsLoading = false;
    }
  }

  async signOut(): Promise<void> {
    await this.run(async () => {
      await this.auth.logout();
      await this.router.navigateByUrl('/auth/login');
    });
  }

  open(title: string, path: string, fields: EditorField[], values: Record<string, any> = {}, method = 'POST'): void {
    this.editorError = '';
    this.editor = { title, path, fields, values, method };
  }

  addSchool(): void {
    this.open(
      'Add school and invite Headmaster',
      'schools',
      [
        { key: 'name', label: 'School name', required: true },
        { key: 'code', label: 'Unique school code (letters, numbers, hyphens)', required: true },
        { key: 'region', label: 'Region', required: true },
        { key: 'headmasterName', label: 'Headmaster name', required: true },
        { key: 'headmasterEmail', label: 'Headmaster email', type: 'email', required: true },
        { key: 'headmasterExpiresInMinutes', label: 'Headmaster invitation expires after', choices: this.invitationExpiryChoices, required: true },
      ],
      { headmasterExpiresInMinutes: '2880' }
    );
  }

  invite(values: Record<string, any> = {}): void {
    const roleChoices = [
      { value: 'REGISTRAR', label: 'Registrar' },
      { value: 'ACADEMIC', label: 'Academic Master' },
      { value: 'TEACHER', label: 'Teacher' },
      { value: 'BURSAR', label: 'Bursar' },
    ];
    if (this.auth.identity()?.platformAdmin || this.canManage) {
      roleChoices.unshift({ value: 'HEADMASTER', label: 'Headmaster' });
    }
    this.open(
      'Invite school user',
      `schools/${this.schoolId}/invitations`,
      [
        { key: 'name', label: 'Full name', required: true },
        { key: 'email', label: 'Email address', type: 'email', required: true },
        { key: 'role', label: 'School role', choices: roleChoices, required: true },
        { key: 'expiresInMinutes', label: 'Invitation link expires after', choices: this.invitationExpiryChoices, required: true },
      ],
      { role: roleChoices[0].value, expiresInMinutes: '2880', ...values }
    );
  }

  addYear(): void {
    this.open('Create academic year', `schools/${this.schoolId}/years`, [
      { key: 'name', label: 'Academic year name', required: true },
      { key: 'startsAt', label: 'Start date', type: 'date', required: true },
      { key: 'endsAt', label: 'End date', type: 'date', required: true },
    ]);
  }

  addClass(): void {
    this.open('Create class', `schools/${this.schoolId}/classes`, [
      { key: 'name', label: 'Class name', required: true },
      {
        key: 'yearId',
        label: 'Academic year',
        choices: this.workspace.years.filter((y: any) => !y.closed).map((y: any) => ({ value: y.id, label: y.name })),
        required: true,
      },
    ]);
  }

  addStudent(): void {
    this.open('Register and enroll student', `schools/${this.schoolId}/students`, [
      { key: 'name', label: 'Student full name', required: true },
      { key: 'admissionNumber', label: 'Admission number', required: true },
      { key: 'dateOfBirth', label: 'Date of birth (optional)', type: 'date' },
      {
        key: 'classroomId',
        label: 'Class',
        choices: this.workspace.classes.filter((c: any) => !c.year.closed).map((c: any) => ({ value: c.id, label: displayClassName(c.name) + ' / ' + c.year.name })),
        required: true,
      },
    ], this.selectedStudentClass && !this.selectedStudentClass.year.closed ? { classroomId: this.selectedClassId } : {});
  }

  assignTeacher(): void {
    this.open('Assign teacher to class', `schools/${this.schoolId}/assignments`, [
      {
        key: 'membershipId',
        label: 'Teacher',
        choices: this.workspace.members
          .filter((m: any) => m.active && m.role === 'TEACHER')
          .map((m: any) => ({ value: m.id, label: m.user.name + ' (' + m.user.email + ')' })),
        required: true,
      },
      {
        key: 'classroomId',
        label: 'Class',
        choices: this.workspace.classes.filter((c: any) => !c.year.closed).map((c: any) => ({ value: c.id, label: displayClassName(c.name) + ' / ' + c.year.name })),
        required: true,
      },
    ]);
  }

  async save(values: Record<string, any>): Promise<void> {
    if (!this.editor || this.saving) return;
    this.saving = true;
    this.editorError = '';
    const payload = { ...values };
    if (payload['dateOfBirth'] === '') delete payload['dateOfBirth'];
    const fingerprint = JSON.stringify(payload);
    if (this.editor.fingerprint !== fingerprint) {
      this.editor.key = requestId();
      this.editor.fingerprint = fingerprint;
    }
    try {
      await this.auth.request(this.editor.method || 'POST', this.editor.path, payload, this.editor.key);
      this.editor = null;
      this.notice = 'Saved successfully. Invitations are queued for email delivery.';
      await this.load();
      if (this.auth.identity()?.platformAdmin && this.tab === 'students' && this.selectedClassId) {
        await this.loadClassStudents();
      }
    } catch (e) {
      this.editorError = this.auth.error(e);
    } finally {
      this.saving = false;
    }
  }

  async invitationAction(id: string, action: string): Promise<void> {
    await this.run(async () => {
      const r = await this.auth.request('POST', `schools/${this.schoolId}/invitations/${id}/${action}`, {});
      this.notice = r.message;
      this.workspace = await this.reloadWorkspace();
    });
  }

  async toggleMember(member: any): Promise<void> {
    await this.run(async () => {
      const r = await this.auth.request('PATCH', `schools/${this.schoolId}/members/${member.id}`, { active: !member.active });
      this.notice = r.message;
      this.workspace = await this.reloadWorkspace();
    });
  }

  invitationStatus(i: any): string {
    return i.acceptedAt ? 'Accepted' : i.revokedAt ? 'Revoked' : new Date(i.expiresAt) < new Date() ? 'Expired' : 'Pending';
  }

  assignmentName(a: any): string {
    const member = this.workspace.members.find((m: any) => m.id === a.membershipId);
    const classroom = this.workspace.classes.find((c: any) => c.id === a.classroomId);
    return (member?.user.name || 'Teacher') + ' \u00b7 ' + (classroom?.name || 'Class');
  }
}
