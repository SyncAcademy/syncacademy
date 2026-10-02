import { DialogFocusDirective } from '../../../../shared/directives/dialog-focus.directive';
import { inject } from '@angular/core';
import { HeadDemoStore } from '../../head-demo.store';
import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeadPageHeaderComponent } from '../../shared/head-page-header.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';
import { TableToolbarComponent } from '../../shared/table-toolbar.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { RecordCardComponent } from '../../shared/record-card.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { AcademicYear, AcademicYearStatus } from '../../head.models';
import { MOCK_ACADEMIC_YEARS } from '../../head-mock-data';

@Component({
  selector: 'app-head-academic-years',
  standalone: true,
  imports: [
    DialogFocusDirective,
    CommonModule,
    FormsModule,
    HeadPageHeaderComponent,
    StatusBadgeComponent,
    TableToolbarComponent,
    EmptyStateComponent,
    RecordCardComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './head-academic-years.page.html',
  styleUrls: ['./head-academic-years.page.scss'],
})
export class HeadAcademicYearsPage implements OnInit {
  store = inject(HeadDemoStore);
  loading = signal<boolean>(true);
  years = this.store.years;
  showDialog = signal<boolean>(false);
  editingYear = signal<AcademicYear | null>(null);

  // Search & Filter
  searchQuery = signal<string>('');
  statusFilter = signal<string>('all');

  // Dialog Form Fields
  formLabel = signal<string>('');
  formStartDate = signal<string>('');
  formEndDate = signal<string>('');
  formStatus = signal<AcademicYearStatus>('draft');
  formError = signal<string>('');

  // Delete Confirmation
  showDeleteConfirm = signal<boolean>(false);
  yearToDelete = signal<AcademicYear | null>(null);

  filteredYears = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const filter = this.statusFilter();
    return this.years().filter(y => {
      const matchesSearch =
        !q ||
        y.label.toLowerCase().includes(q) ||
        y.startDate.includes(q) ||
        y.endDate.includes(q) ||
        y.status.toLowerCase().includes(q);
      const matchesStatus = filter === 'all' || y.status === filter;
      return matchesSearch && matchesStatus;
    });
  });

  ngOnInit(): void {
    this.loadYears();
  }

  loadYears():void { this.loading.set(false); }

  openCreateDialog(): void {
    this.editingYear.set(null);
    this.formLabel.set('');
    this.formStartDate.set('');
    this.formEndDate.set('');
    this.formStatus.set('draft');
    this.formError.set('');
    this.showDialog.set(true);
  }

  openEditDialog(year:AcademicYear):void {this.store.api.error.set('Academic year editing is not available yet.');}

  closeDialog(): void {
    this.showDialog.set(false);
    this.editingYear.set(null);
    this.formError.set('');
  }

  saving=false;private requestKey='';private fingerprint='';async saveYear():Promise<void>{if(this.saving)return;const body={name:this.formLabel(),startsAt:this.formStartDate(),endsAt:this.formEndDate()};const fp=JSON.stringify(body);if(fp!==this.fingerprint){this.fingerprint=fp;this.requestKey=crypto.randomUUID();}this.saving=true;this.formError.set('');try{await this.store.api.write('years',body,'POST',this.requestKey);this.closeDialog();}catch(e){this.formError.set(this.store.api.auth.error(e));}finally{this.saving=false;}}

  canDelete(year:AcademicYear):boolean {return false;}
  confirmDelete(year: AcademicYear): void {
    if (!this.canDelete(year)) return;
    this.yearToDelete.set(year);
    this.showDeleteConfirm.set(true);
  }

  onDeleteConfirmed(): void {
    const target = this.yearToDelete();
    if (target && this.canDelete(target)) {
      this.years.update(list => list.filter(y => y.id !== target.id));
    }
    this.showDeleteConfirm.set(false);
    this.yearToDelete.set(null);
  }

  onDeleteCancelled(): void {
    this.showDeleteConfirm.set(false);
    this.yearToDelete.set(null);
  }
}
