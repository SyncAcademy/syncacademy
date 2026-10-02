import { inject } from '@angular/core';
import { HeadDemoStore } from '../../head-demo.store';
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeadPageHeaderComponent } from '../../shared/head-page-header.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { RecordCardComponent } from '../../shared/record-card.component';
import { PendingStaffMember, STAFF_ROLE_LABELS } from '../../head.models';
import { MOCK_PENDING_STAFF } from '../../head-mock-data';

@Component({
  selector: 'app-head-staff-pending',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HeadPageHeaderComponent,
    StatusBadgeComponent,
    EmptyStateComponent,
    ConfirmDialogComponent,
    RecordCardComponent,
  ],
  templateUrl: './head-staff-pending.page.html',
  styleUrls: ['./head-staff-pending.page.scss'],
})
export class HeadStaffPendingPage implements OnInit {
  store = inject(HeadDemoStore);
  loading = signal<boolean>(true);
  pendingStaff = this.store.pending;
  showApproveDialog = signal(false);
  showRejectDialog = signal<boolean>(false);
  selectedPending = signal<PendingStaffMember | null>(null);

  staffRoleLabels = STAFF_ROLE_LABELS;

  ngOnInit(): void {
    setTimeout(() => {
      // Retain the shared frontend demo state.
      this.loading.set(false);
    }, 500);
  }

  approve(person: PendingStaffMember): void {
    if (!person.emailVerified && !person.phoneVerified) return;
    this.selectedPending.set(person);
    this.showApproveDialog.set(true);
  }

  confirmApprove(): void {
    const person = this.selectedPending();
    if (!person || (!person.phoneVerified && !person.emailVerified)) return;
    this.store.staff.update(list => [...list, { id: person.id, fullName: person.fullName, email: person.email, phone: person.phone,
      role: person.requestedRole, status: 'active', phoneVerified: person.phoneVerified, emailVerified: person.emailVerified, createdAt: new Date().toISOString() }]);
    this.pendingStaff.update(list => list.filter(p => p.id !== person.id));
    this.showApproveDialog.set(false);
    this.store.notice.set(`${person.fullName} was added to the staff directory in this demo.`);
    this.selectedPending.set(null);
  }
  openRejectDialog(person: PendingStaffMember): void {
    this.selectedPending.set(person);
    this.showRejectDialog.set(true);
  }

  confirmReject(): void {
    const person = this.selectedPending();
    if (person) {
      this.pendingStaff.update(list => list.filter(p => p.id !== person.id));
    }
    this.showRejectDialog.set(false);
    this.selectedPending.set(null);
  }

  cancelReject(): void {
    this.showRejectDialog.set(false);
    this.selectedPending.set(null);
  }
}
