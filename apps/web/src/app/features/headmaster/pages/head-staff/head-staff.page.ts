import { inject } from '@angular/core';
import { HeadStore } from '../../head.store';
import { Component, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HeadPageHeaderComponent } from '../../shared/head-page-header.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';
import { TableToolbarComponent } from '../../shared/table-toolbar.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { RecordCardComponent } from '../../shared/record-card.component';
import { StaffMember, STAFF_ROLE_LABELS } from '../../head.models';
@Component({
  selector: 'app-head-staff',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    HeadPageHeaderComponent,
    StatusBadgeComponent,
    TableToolbarComponent,
    EmptyStateComponent,
    ConfirmDialogComponent,
    RecordCardComponent,
  ],
  templateUrl: './head-staff.page.html',
  styleUrls: ['./head-staff.page.scss'],
})
export class HeadStaffPage implements OnInit {
  store = inject(HeadStore);
  loading = signal<boolean>(true);
  staff = this.store.staff;
  
  searchTerm = signal<string>('');
  roleFilter = signal<string>('all');
  statusFilter = signal<string>('all');
  page=signal(1);
  
  showDeactivateDialog = signal<boolean>(false);
  showRemoveRoleDialog = signal<boolean>(false);
  selectedStaff = signal<StaffMember | null>(null);

  staffRoleLabels = STAFF_ROLE_LABELS;

  filteredStaff = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const role = this.roleFilter();
    const status = this.statusFilter();
    
    return this.staff().filter(s => {
      const matchName = !term || (s.fullName + ' ' + s.email + ' ' + s.phone).toLowerCase().includes(term);
      const matchRole = role === 'all' || s.role === role;
      const matchStatus = status === 'all' || s.status === status;
      return matchName && matchRole && matchStatus;
    });
  });
  pageCount=computed(()=>Math.max(1,Math.ceil(this.filteredStaff().length/25)));
  visibleStaff=computed(()=>this.filteredStaff().slice((this.page()-1)*25,this.page()*25));
  constructor(){effect(()=>{this.searchTerm();this.roleFilter();this.statusFilter();this.page.set(1);});}

  ngOnInit():void { this.loading.set(false); }

  onSearchChange(val: string): void {
    this.searchTerm.set(val);
  }

  requestDeactivate(s: StaffMember): void {
    this.selectedStaff.set(s);
    this.showDeactivateDialog.set(true);
  }
  canManage(s: StaffMember): boolean { const me=this.store.api.auth.identity(); return !!me && !(s.email === me.email && s.role === 'school_admin') && (s.role !== 'school_admin' || me.platformAdmin || me.selectedRole === 'HEADMASTER') && (me.platformAdmin || me.selectedRole === 'HEADMASTER' || (me.selectedRole === 'ACADEMIC' && s.role === 'teacher')); }
  requestRemoveRole(s: StaffMember): void { this.selectedStaff.set(s); this.showRemoveRoleDialog.set(true); }
  async confirmRemoveRole(): Promise<void> { const member=this.selectedStaff(); if(!member)return; try { await this.store.api.write('members/'+member.id,{},'DELETE'); this.showRemoveRoleDialog.set(false); this.selectedStaff.set(null); } catch(e) { this.store.api.error.set(this.store.api.auth.error(e)); } }

  async confirmDeactivate():Promise<void>{const member=this.selectedStaff();if(!member)return;try{await this.store.api.write('members/'+member.id,{active:member.status!=='active'},'PATCH');this.showDeactivateDialog.set(false);this.selectedStaff.set(null);}catch(e){this.store.api.error.set(this.store.api.auth.error(e));}}

  cancelDeactivate(): void {
    this.showDeactivateDialog.set(false);
    this.selectedStaff.set(null);
  }
}
