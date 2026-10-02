import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { HeadDemoStore } from '../../head-demo.store';
import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HeadPageHeaderComponent } from '../../shared/head-page-header.component';
import { StaffRole, STAFF_ROLE_LABELS, EXPIRY_OPTIONS, INVITABLE_ROLES } from '../../head.models';

@Component({
  selector: 'app-head-staff-invite',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HeadPageHeaderComponent, ConfirmDialogComponent],
  templateUrl: './head-staff-invite.page.html',
  styleUrls: ['./head-staff-invite.page.scss'],
})
export class HeadStaffInvitePage {
  store = inject(HeadDemoStore);
  revokeId = signal<string | null>(null);
  expiresAt = signal('');
  copyError = signal('');
  selectedRole = signal<StaffRole | null>(null);
  selectedExpiry = signal(2880);
  readonly name = signal('');
  readonly email = signal('');
  readonly busy = signal(false);
  private requestKey = '';
  private fingerprint = '';
  generatedCode = signal<string>('');
  generatedLink = signal<string>('');
  isGenerated = signal<boolean>(false);
  copied = signal<boolean>(false);

  roles=INVITABLE_ROLES; get selectableRoles(){return this.store.api.auth.identity()?.platformAdmin ? ['school_admin' as StaffRole,...this.roles] : this.roles;}
  roleLabels = STAFF_ROLE_LABELS;
  expiryOptions = EXPIRY_OPTIONS;
  get selectedExpiryLabel(): string {
    return this.expiryOptions.find(option => option.minutes === this.selectedExpiry())?.label ?? '48 hours';
  }

  getRoleDescription(role: StaffRole): string {
    switch (role) {
      case 'registrar': return 'Manages student admissions, enrollment, and records.';
      case 'academic_officer': return 'Oversees curriculum, classes, and academic progress.';
      case 'teacher': return 'Confirms assigned student lists, enters marks, and tracks submissions.';
      default: return '';
    }
  }

  selectRole(role: StaffRole): void {
    if (!this.isGenerated()) {
      this.selectedRole.set(role);
    }
  }

  async generate(): Promise<void> {
    if (!this.selectedRole() || this.busy()) return;
    this.busy.set(true);
    this.copyError.set('');
    const roleByStaffRole: Partial<Record<StaffRole, string>> = {
      school_admin: 'HEADMASTER',
      registrar: 'REGISTRAR',
      academic_officer: 'ACADEMIC',
      teacher: 'TEACHER',
      bursar: 'BURSAR',
    };
    const role = roleByStaffRole[this.selectedRole()!];
    if (!role) {
      this.copyError.set('Select a supported staff role.');
      this.busy.set(false);
      return;
    }
    const body = { role, name: this.name(), email: this.email(), expiresInMinutes: this.selectedExpiry() };
    const fingerprint = JSON.stringify(body);
    if (fingerprint !== this.fingerprint) {
      this.fingerprint = fingerprint;
      this.requestKey = crypto.randomUUID();
    }
    try {
      const invitation = await this.store.api.write('invitations', body, 'POST', this.requestKey);
      this.expiresAt.set(invitation.expiresAt);
      this.isGenerated.set(true);
    } catch (error) {
      this.copyError.set(this.store.api.auth.error(error));
    } finally {
      this.busy.set(false);
    }
  }

  async copyToClipboard(): Promise<void> {
    this.copyError.set('');
    try { await navigator.clipboard.writeText(this.generatedLink()); this.copied.set(true); }
    catch { this.copyError.set('Copy is unavailable. Select the invitation link and copy it manually.'); }
  }
  revoke(id: string): void { this.revokeId.set(id); }
  async confirmRevoke():Promise<void>{if(this.busy())return;this.busy.set(true);try{await this.store.api.write('invitations/'+this.revokeId()+'/revoke',{});this.revokeId.set(null);}catch(e){this.copyError.set(this.store.api.auth.error(e));}finally{this.busy.set(false);}} async resend(id:string){try{await this.store.api.write('invitations/'+id+'/resend',{});this.store.api.notice.set('A fresh invitation has been queued for email delivery.');}catch(e){this.copyError.set(this.store.api.auth.error(e));}}
  invitationStatus(invitation: { status: string; expiresAt: string }): string {
    return invitation.status === 'active' && Date.parse(invitation.expiresAt) < Date.now() ? 'expired' : invitation.status;
  }

  reset(): void {
    this.copyError.set('');
    this.selectedRole.set(null);
    this.selectedExpiry.set(2880);
    this.generatedCode.set('');
    this.generatedLink.set('');
    this.isGenerated.set(false);
    this.copied.set(false);
  }
}
