import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SuperAdminStore, DemoAdmin } from '../../super-admin.store';
import { SaEditorComponent, EditorField } from '../../components/sa-editor.component';
@Component({ selector: 'app-sa-settings', standalone: true, imports: [CommonModule, SaEditorComponent], templateUrl: './sa-settings.page.html', styleUrls: ['./sa-settings.page.scss', '../../sa-workflows.scss'] })
export class SaSettingsPage {
  store = inject(SuperAdminStore);
  invitations: any[] = [];
  editor: { title: string; fields: EditorField[]; values: Record<string, any>; mode: string } | null = null;
  editingId = '';
  error = '';
  notice = '';
  saving = false;
  private requestKey = '';
  private fingerprint = '';
  readonly expiryOptions = [
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
  constructor() { void this.loadInvitations(); }
  preferences(): void {
    this.error = ''; this.editor = { title: 'Platform preferences', mode: 'settings', values: { ...this.store.settings() }, fields: [
      { key: 'platformName', label: 'Platform name', required: true }, { key: 'supportEmail', label: 'Support email', type: 'email', required: true },
      { key: 'trialDays', label: 'Default trial length (days)', type: 'number', min: 1, required: true },
      { key: 'lowSmsThreshold', label: 'SMS low balance alert threshold', type: 'number', min: 0, required: true },
      { key: 'maintenanceMessage', label: 'Admin announcement (leave blank to hide)' },
    ] };
  }
  inviteAdministrator(): void {
    this.error = '';
    this.notice = '';
    this.editor = {
      title: 'Invite Super Admin',
      mode: 'platform-invitation',
      values: { expiresInMinutes: '2880' },
      fields: [
        { key: 'name', label: 'Full name', required: true },
        { key: 'email', label: 'Email address', type: 'email', required: true },
        { key: 'expiresInMinutes', label: 'Invitation link expires after', choices: this.expiryOptions, required: true },
      ],
    };
  }
  async loadInvitations(): Promise<void> {
    try { this.invitations = await this.store.auth.request('GET', 'platform/invitations'); }
    catch (error) { this.error = this.store.auth.error(error); }
  }
  async save(values: Record<string, any>): Promise<void> {
    if (this.saving || this.editor?.mode !== 'platform-invitation') return;
    this.saving = true;
    this.error = '';
    const fingerprint = JSON.stringify(values);
    if (fingerprint !== this.fingerprint) {
      this.fingerprint = fingerprint;
      this.requestKey = crypto.randomUUID();
    }
    try {
      await this.store.auth.request('POST', 'platform/invitations', values, this.requestKey);
      this.editor = null;
      this.notice = 'Platform administrator invitation queued for email delivery.';
      await this.loadInvitations();
    } catch (error) {
      this.error = this.store.auth.error(error);
    } finally {
      this.saving = false;
    }
  }
  async invitationAction(id: string, action: 'resend' | 'revoke'): Promise<void> {
    this.error = '';
    this.notice = '';
    try {
      const result = await this.store.auth.request('POST', `platform/invitations/${id}/${action}`, {});
      this.notice = result.message;
      await this.loadInvitations();
    } catch (error) {
      this.error = this.store.auth.error(error);
    }
  }
  invitationStatus(invitation: any): string {
    return invitation.acceptedAt ? 'Accepted' : invitation.revokedAt ? 'Revoked' : new Date(invitation.expiresAt) <= new Date() ? 'Expired' : 'Pending';
  }
}
