import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SaEditorComponent, EditorField } from '../super-admin/components/sa-editor.component';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SaEditorComponent],
  templateUrl: './workspace.page.html',
  styleUrls: ['./workspace.page.scss'],
})
export class WorkspacePage implements OnInit {
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
  schoolId = '';
  workspace: any = null;
  audit: any[] = [];
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
      if (this.auth.identity()?.platformAdmin) {
        const list = await this.auth.request('GET', 'schools?page=' + this.page);
        this.schools = list.items;
        this.total = list.total;
      }
      this.workspace = this.schoolId ? await this.auth.request('GET', `schools/${this.schoolId}/workspace`) : null;
      if (this.tab === 'audit') {
        this.audit = await this.auth.request('GET', 'audit' + (this.schoolId ? '?schoolId=' + this.schoolId : ''));
      }
    });
  }

  async choose(id: string): Promise<void> {
    this.schoolId = id;
    this.workspace = null;
    this.tab = 'overview';
    this.notice = '';
    this.closeMobileMenu();
    await this.load();
  }

  async changeTab(tab: string): Promise<void> {
    this.tab = tab;
    this.closeMobileMenu();
    if (tab === 'audit') await this.load();
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
    if (this.auth.identity()?.platformAdmin) {
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
        choices: this.workspace.classes.filter((c: any) => !c.year.closed).map((c: any) => ({ value: c.id, label: c.name + ' / ' + c.year.name })),
        required: true,
      },
    ]);
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
        choices: this.workspace.classes.filter((c: any) => !c.year.closed).map((c: any) => ({ value: c.id, label: c.name + ' / ' + c.year.name })),
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
      this.editor.key = crypto.randomUUID();
      this.editor.fingerprint = fingerprint;
    }
    try {
      await this.auth.request(this.editor.method || 'POST', this.editor.path, payload, this.editor.key);
      this.editor = null;
      this.notice = 'Saved successfully. Invitations are queued for email delivery.';
      await this.load();
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
      this.workspace = await this.auth.request('GET', `schools/${this.schoolId}/workspace`);
    });
  }

  async toggleMember(member: any): Promise<void> {
    await this.run(async () => {
      const r = await this.auth.request('PATCH', `schools/${this.schoolId}/members/${member.id}`, { active: !member.active });
      this.notice = r.message;
      this.workspace = await this.auth.request('GET', `schools/${this.schoolId}/workspace`);
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
