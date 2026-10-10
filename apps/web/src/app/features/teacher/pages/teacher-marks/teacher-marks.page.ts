import { Component, OnInit, signal, computed, inject, effect, untracked, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TeacherPageHeaderComponent } from '../../shared/teacher-page-header.component';
import { MarkEntry } from '../../teacher.models';
import { TeacherStore, gradeMark } from '../../teacher.store';
import { DialogFocusDirective } from '../../../../shared/directives/dialog-focus.directive';

@Component({
  selector: 'app-teacher-marks', standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TeacherPageHeaderComponent, DialogFocusDirective],
  templateUrl: './teacher-marks.page.html', styleUrls: ['./teacher-marks.page.scss'],
})
export class TeacherMarksPage implements OnInit {
  store = inject(TeacherStore);
  route = inject(ActivatedRoute);
  loading = computed(()=>this.store.remote.loading() || this.store.api.loading());
  dirty=signal(false); saving=signal(false);
  constructor(){effect(()=>{const rows=this.store.entries(this.assignmentId());untracked(()=>{if(!this.dirty()&&!this.saving()){this.marks.set(structuredClone(rows));this.markInputs.set({});}});});}
  @HostListener('window:beforeunload',['$event']) beforeUnload(event:BeforeUnloadEvent){if(this.dirty()||this.saving()){event.preventDefault();event.returnValue='';}}
  async discard(){if(this.saving())return;await this.store.remote.load();this.marks.set(structuredClone(this.store.entries(this.assignmentId())));this.markInputs.set({});this.dirty.set(false);this.autoSaveFailed.set(false);this.autoSaveStatus.set('Local changes discarded.');}
  async canLeave(){if(this.saving())return false;return !this.dirty()||await this.save();}
  marks = signal<MarkEntry[]>([]);
  markInputs = signal<Record<string,string>>({});
  assignmentId = signal('');
  assignment = computed(() => this.store.assignments().find(a => a.id === this.assignmentId()));
  assignmentLabel = computed(() => { const a = this.assignment(); return a ? `${a.classStream || a.className} / ${a.subjectName}` : 'Assignment unavailable'; });
  readOnly = computed(() => this.store.readOnly() || !this.assignment() || ['submitted', 'approved'].includes(this.assignment()!.assessmentProgress.status) || this.assignment()!.rosterStatus !== 'confirmed' || !this.assignment()?.assessmentId || this.assignment()?.assessmentStatus !== 'open');
  searchTerm = signal('');
  missingOnly = signal(false);
  page = signal(1);
  readonly pageSize = 25;
  showSubmitDialog = signal(false);
  autoSaveStatus = signal('');
  autoSaveFailed = signal(false);
  submitted = signal(false);
  filteredMarks = computed(() => this.marks().filter(m =>
    (!this.missingOnly() || !this.valid(m)) && (m.fullName + ' ' + m.studentNumber).toLowerCase().includes(this.searchTerm().toLowerCase())
  ));
  pages = computed(() => Math.max(1, Math.ceil(this.filteredMarks().length / this.pageSize)));
  pageMarks = computed(() => this.filteredMarks().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize));
  completedCount = computed(() => this.marks().filter(m => this.valid(m)).length);
  totalCount = computed(() => this.marks().length);
  scoredCount = computed(() => this.marks().filter(m => gradeMark(m.marksValue) !== null).length);
  average = computed(() => { const scores=this.marks().filter(m => gradeMark(m.marksValue) !== null).map(m => m.marksValue!); return scores.length ? scores.reduce((sum,score)=>sum+score,0)/scores.length : null; });
  progressPercent = computed(() => this.totalCount() ? Math.round(this.completedCount() / this.totalCount() * 100) : 0);
  canSubmit = computed(() => !this.readOnly() && this.totalCount() > 0 && this.completedCount() === this.totalCount());
  ngOnInit(): void {
    this.assignmentId.set(this.route.snapshot.paramMap.get('assignmentId') || '');
    this.marks.set(structuredClone(this.store.entries(this.assignmentId())));
    this.markInputs.set({});
  }
  markInput(mark: MarkEntry): string { return this.markInputs()[mark.studentId] ?? (mark.noMark ? '-' : mark.marksValue === null ? '' : String(mark.marksValue)); }
  invalidInput(mark: MarkEntry): boolean { const value=this.markInput(mark); return value !== '' && value !== '-' && (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value) || Number(value)>100); }
  valid(mark: MarkEntry): boolean {
    return !this.invalidInput(mark) && (mark.noMark
      ? mark.marksValue === null && this.markInput(mark) === '-'
      : gradeMark(mark.marksValue) !== null);
  }
  onSearchChange(value: string): void { this.searchTerm.set(value); this.page.set(1); }
  onMarkChange(id: string, value: string): void {
    if (this.readOnly() || this.saving()) return;
    this.markInputs.update(inputs => ({...inputs,[id]:value}));
    const noMark = value === '-';
    const numeric = !noMark && /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value) ? Number(value) : null;
    this.marks.update(list => list.map(m => m.studentId === id ? { ...m, marksValue: numeric, noMark, grade: this.store.grade(this.assignmentId(), numeric), lastSaved: new Date().toISOString() } : m));
    this.autoSaveFailed.set(false);
    this.dirty.set(true); this.autoSaveStatus.set('Unsaved changes. Save draft before submitting.');
  }
  onCommentChange(id: string, value: string): void {
    if (this.readOnly() || this.saving()) return;
    this.marks.update(list => list.map(m => m.studentId === id ? { ...m, comments: value, lastSaved: new Date().toISOString() } : m));
    this.autoSaveFailed.set(false);
    this.dirty.set(true); this.autoSaveStatus.set('Unsaved changes. Save draft before submitting.');
  }
  async save():Promise<boolean>{
    if(this.saving()||this.readOnly())return false;
    if(this.marks().some(m=>this.invalidInput(m) || m.marksValue!==null&&!this.valid(m) || (m.noMark && m.marksValue!==null))){this.autoSaveFailed.set(true);this.autoSaveStatus.set('Use a number from 0 to 100 or a single dash for no mark.');return false;}
    this.saving.set(true);this.autoSaveStatus.set('Saving draft...');
    const error=await this.store.save(this.assignmentId(),this.marks());this.saving.set(false);
    this.autoSaveFailed.set(!!error);this.autoSaveStatus.set(error??'Draft saved to school records.');if(!error){this.markInputs.set({});this.dirty.set(false);}return !error;
  }
  openSubmitDialog(): void { if (this.canSubmit()) this.showSubmitDialog.set(true); }
  async confirmSubmit():Promise<void>{
    if(!this.canSubmit()||this.saving())return;
    if(this.dirty()&&!await this.save())return;
    this.saving.set(true);const error=await this.store.submit(this.assignmentId());this.saving.set(false);
    if(!error){this.submitted.set(true);this.showSubmitDialog.set(false);}else {this.autoSaveFailed.set(true);this.autoSaveStatus.set(error);}
  }
  cancelSubmit(): void { if(this.saving())return; this.showSubmitDialog.set(false); }
  trackStudent(index: number, mark: MarkEntry): string { return mark.studentId; }
}
