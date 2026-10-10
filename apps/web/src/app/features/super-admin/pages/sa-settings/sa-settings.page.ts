import { requestId } from '../../../../core/services/request-id';
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SuperAdminStore, PlatformAdmin } from '../../super-admin.store';
import { SaEditorComponent, EditorField } from '../../components/sa-editor.component';
import { ConfirmDialogComponent } from '../../../headmaster/shared/confirm-dialog.component';
@Component({ selector: 'app-sa-settings', standalone: true, imports: [CommonModule, FormsModule, SaEditorComponent, ConfirmDialogComponent], templateUrl: './sa-settings.page.html', styleUrls: ['./sa-settings.page.scss', '../../sa-workflows.scss'] })
export class SaSettingsPage {
  store = inject(SuperAdminStore);
  invitations: any[] = [];
  invitePage=1;inviteTotal=0;inviteSearch='';private searchTimer?:ReturnType<typeof setTimeout>;
  get invitePages(){return Math.max(1,Math.ceil(this.inviteTotal/25));}
  searchInvitations(value:string){this.inviteSearch=value;this.invitePage=1;clearTimeout(this.searchTimer);this.searchTimer=setTimeout(()=>void this.loadInvitations(),250);}
  async invitationPage(change:number){this.invitePage=Math.max(1,this.invitePage+change);await this.loadInvitations();}
  editor: { title: string; fields: EditorField[]; values: Record<string, any>; mode: string } | null = null;
  editingId = '';
  error = '';
  notice = '';
  targetAdmin: any = null;
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
      { key: 'platformName', label: 'Platform name', required: true }, { key: 'supportEmail', label: 'Support email', type: 'email' },
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
    try { const query=new URLSearchParams({page:String(this.invitePage),q:this.inviteSearch});const result=await this.store.auth.request('GET', 'platform/invitations?'+query);this.invitations=result.items;this.inviteTotal=result.total; }
    catch (error) { this.error = this.store.auth.error(error); }
  }
  async save(values: Record<string, any>): Promise<void> {
    if (this.saving || !this.editor) return;
    this.saving = true;
    this.error = '';
    const fingerprint = JSON.stringify(values);
    if (fingerprint !== this.fingerprint) {
      this.fingerprint = fingerprint;
      this.requestKey = requestId();
    }
    try {
      if (this.editor.mode === 'settings') {
        await this.store.saveSettings(values);
        this.notice = 'Platform preferences saved.';
      } else {
        await this.store.auth.request('POST', 'platform/invitations', values, this.requestKey);
        this.notice = 'Platform administrator invitation queued for email delivery.';
        await this.loadInvitations();
      }
      this.editor = null;
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
  async changeAdminAccess(): Promise<void> { const target=this.targetAdmin;if(!target)return;try{const result=await this.store.auth.request('PATCH',`platform/admins/${target.id}`,{enabled:false});this.notice=result.message;this.targetAdmin=null;await this.store.load();}catch(error){this.error=this.store.auth.error(error);} }
}
