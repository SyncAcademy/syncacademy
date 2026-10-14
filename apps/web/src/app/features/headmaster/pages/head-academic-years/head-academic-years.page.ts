import { requestId } from '../../../../core/services/request-id';
import { DialogFocusDirective } from '../../../../shared/directives/dialog-focus.directive';
import { inject } from '@angular/core';
import { HeadStore } from '../../head.store';
import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeadPageHeaderComponent } from '../../shared/head-page-header.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';
import { TableToolbarComponent } from '../../shared/table-toolbar.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { RecordCardComponent } from '../../shared/record-card.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { AcademicTerm, AcademicYear, AcademicYearStatus } from '../../head.models';
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
  store = inject(HeadStore);
  loading = signal<boolean>(true);
  years = this.store.years;
  showDialog = signal<boolean>(false);
  editingYear = signal<AcademicYear | null>(null);

  // Search & Filter
  searchQuery = signal<string>('');
  statusFilter = signal<string>('all');
  page = signal(1);
  readonly pageSize = 25;

  // Dialog Form Fields
  formLabel = signal<string>('');
  formStartDate = signal<string>('');
  formEndDate = signal<string>('');
  formStatus = signal<AcademicYearStatus>('draft');
  formError = signal<string>('');
  notice = signal<string>('');
  formTerms = signal<AcademicTerm[]>([]);
  readonly termCounts = [1, 2, 3, 4, 5, 6, 7, 8];

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
  pages = computed(() => Math.max(1, Math.ceil(this.filteredYears().length / this.pageSize)));
  pageYears = computed(() => this.filteredYears().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize));

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
    this.formTerms.set([1, 2, 3].map(index => ({ key: `Term ${index}`, name: `Term ${index}`, startsAt: '', endsAt: '' })));
    this.formError.set('');
    this.showDialog.set(true);
  }

  openEditDialog(year:AcademicYear):void {this.editingYear.set(year);this.formLabel.set(year.label);this.formStartDate.set(year.startDate);this.formEndDate.set(year.endDate);this.formTerms.set(year.terms.map(term => ({...term})));this.formError.set('');this.showDialog.set(true);}

  setTermCount(value: number): void {
    const count = Math.max(1, Math.min(8, Number(value) || 1));
    this.formTerms.update(current => Array.from({length: count}, (_, index) => current[index] ?? {key: `Term ${index + 1}`, name: `Term ${index + 1}`, startsAt: '', endsAt: ''}));
    this.redistributeTermDates();
  }
  setTermField(index: number, field: 'name' | 'startsAt' | 'endsAt', value: string): void {
    this.formTerms.update(terms => terms.map((term, i) => i === index ? {...term, [field]: value} : term));
  }
  setYearDate(field: 'start' | 'end', value: string): void {
    if (field === 'start') this.formStartDate.set(value); else this.formEndDate.set(value);
    this.fillTermDates();
  }
  private fillTermDates(): void {
    if (this.editingYear() || !this.formStartDate() || !this.formEndDate() || this.formTerms().some(term => term.startsAt || term.endsAt)) return;
    this.redistributeTermDates();
  }
  redistributeTermDates(): void {
    if (!this.formStartDate() || !this.formEndDate()) return;
    const start = Date.parse(`${this.formStartDate()}T00:00:00Z`);
    const end = Date.parse(`${this.formEndDate()}T00:00:00Z`);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;
    const days = Math.round((end - start) / 86400000) + 1;
    this.formTerms.update(terms => terms.map((term, index) => ({...term,
      startsAt: new Date(start + Math.floor(days * index / terms.length) * 86400000).toISOString().slice(0, 10),
      endsAt: new Date(start + (Math.floor(days * (index + 1) / terms.length) - 1) * 86400000).toISOString().slice(0, 10),
    })));
  }

  closeDialog(): void {
    this.showDialog.set(false);
    this.editingYear.set(null);
    this.formError.set('');
  }

  saving=false;private requestKey='';private fingerprint='';async saveYear():Promise<void>{if(this.saving)return;const body={name:this.formLabel().trim(),startsAt:this.formStartDate(),endsAt:this.formEndDate(),terms:this.formTerms()};if(!body.name||!body.startsAt||body.endsAt<=body.startsAt){this.formError.set('Enter a name and a valid start and end date.');return;}if(body.terms.some((term,index)=>!term.name.trim()||!term.startsAt||!term.endsAt||term.startsAt<body.startsAt||term.endsAt>body.endsAt||term.endsAt<term.startsAt||(index>0&&term.startsAt<=body.terms[index-1].endsAt))){this.formError.set('Give every term a name and ordered dates within the academic year. Terms cannot overlap.');return;}if(new Set(body.terms.map(term=>term.name.trim().toLowerCase())).size!==body.terms.length){this.formError.set('Each term needs a different name.');return;}const fp=JSON.stringify(body);if(fp!==this.fingerprint){this.fingerprint=fp;this.requestKey=requestId();}this.saving=true;this.formError.set('');try{const id=this.editingYear()?.id;await this.store.api.write(id?'years/'+id:'years',body,id?'PATCH':'POST',this.requestKey);this.closeDialog();this.notice.set(id?'Academic year updated.':'Academic year created.');}catch(e){this.formError.set(this.store.api.auth.error(e));}finally{this.saving=false;}}

  async changeClosed(year:AcademicYear):Promise<void>{if(this.saving)return;this.saving=true;this.formError.set('');try{await this.store.api.write('years/'+year.id,{closed:year.status!=='closed'},'PATCH');this.notice.set(year.status==='closed'?'Academic year reopened.':'Academic year closed.');}catch(e){this.formError.set(this.store.api.auth.error(e));}finally{this.saving=false;}}
  readonly yearToClose=signal<AcademicYear|null>(null);
  requestStatusChange(year:AcademicYear){if(year.status==='closed')void this.changeClosed(year);else this.yearToClose.set(year);}
  async confirmClose(){const year=this.yearToClose();this.yearToClose.set(null);if(year)await this.changeClosed(year);}

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
