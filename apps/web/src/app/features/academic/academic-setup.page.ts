import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AcademicSetupStore } from './academic-setup.store';
import { GradeBand } from '../../core/services/grading-policy.service';
import { HeadPageHeaderComponent } from '../headmaster/shared/head-page-header.component';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import { EXPIRY_OPTIONS } from '../headmaster/head.models';
import { TeacherPickerComponent } from '../../shared/teacher-picker.component';
import { ConfirmDialogComponent } from '../headmaster/shared/confirm-dialog.component';

@Component({ selector: 'app-academic-setup', standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HeadPageHeaderComponent, DialogFocusDirective, TeacherPickerComponent, ConfirmDialogComponent],
  templateUrl: './academic-setup.page.html', styleUrls: ['./academic.page.scss'], styles: [`
    .compact-class-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,250px),1fr)); gap:14px; margin-bottom:24px; }
    .compact-class-card { padding:16px; margin:0; display:grid; gap:10px; border-color:#e5eaf1; box-shadow:0 3px 12px #17233808; }
    .compact-class-card h3 { margin:0; font-size:1rem; }
    .compact-class-card p { margin:0; font-size:.8rem; line-height:1.45; }
    .compact-class-card .panel-heading { margin:0; align-items:flex-start; }
    .class-card-meta { display:flex; flex-wrap:wrap; gap:8px 14px; color:#64748b; font-size:.78rem; }
    .class-card-meta strong { color:#334155; }
    .class-detail-list { display:grid; gap:12px; padding:16px; border-radius:10px; background:#f8fafc; }
    .class-detail-list p { margin:0; }
    .class-subjects { display:flex; flex-wrap:wrap; gap:7px; }
    .class-subjects .badge { background:#f1f5f9; }
    .list-tools { display:flex; align-items:center; flex-wrap:wrap; gap:12px; margin:0 0 14px; }
    .list-tools input { flex:1 1 240px; }
    .list-pager { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; padding:12px 0; color:#64748b; font-size:.8125rem; }
    .list-pager .actions { margin:0; }
    @media(max-width:600px) { .compact-class-grid { grid-template-columns:1fr; } }
  `],
})
export class AcademicSetupPage {
  readonly store = inject(AcademicSetupStore);
  private readonly data = toSignal(inject(ActivatedRoute).data);
  readonly section = computed(() => this.data()?.['section'] ?? 'classes-subjects');
  readonly title = computed(() => this.data()?.['title'] ?? 'Classes & Subjects');
  readonly dialog = signal(''); readonly error = signal(''); readonly notice = signal('');
  readonly saving = signal(false);
  readonly expiryOptions = EXPIRY_OPTIONS;
  readonly search = signal(''); readonly editingId = signal('');
  readonly classPage = signal(1); readonly classPageSize = 12;
  readonly selectedClassId = signal('');
  readonly teacherSearch = signal(''); readonly invitationSearch = signal('');
  readonly teacherPage = signal(1); readonly invitationPage = signal(1); readonly staffPageSize = 15;
  readonly subjectSearch = signal('');
  readonly teacherAction = signal<{id:string;active:boolean;remove:boolean}|null>(null);
  readonly classToDelete = signal<{id:string;name:string}|null>(null);
  readonly filteredClasses = computed(() => this.store.classes().filter(c => `${c.name} ${c.stream ?? ''}`.toLowerCase().includes(this.search().trim().toLowerCase())));
  readonly classPages = computed(() => Math.max(1, Math.ceil(this.filteredClasses().length / this.classPageSize)));
  readonly classes = computed(() => this.filteredClasses().slice((this.classPage() - 1) * this.classPageSize, this.classPage() * this.classPageSize));
  readonly selectedClass = computed(() => this.store.classes().find(c => c.id === this.selectedClassId()));
  readonly filteredTeachers = computed(() => this.store.teachers().filter(t => `${t.fullName} ${t.email} ${t.phone} ${t.status}`.toLowerCase().includes(this.teacherSearch().trim().toLowerCase())));
  readonly teacherPages = computed(() => Math.max(1, Math.ceil(this.filteredTeachers().length / this.staffPageSize)));
  readonly visibleTeachers = computed(() => this.filteredTeachers().slice((this.teacherPage() - 1) * this.staffPageSize, this.teacherPage() * this.staffPageSize));
  readonly filteredInvitations = computed(() => this.store.teacherInvitations().filter(i => `${i.name} ${i.email} ${i.status}`.toLowerCase().includes(this.invitationSearch().trim().toLowerCase())));
  readonly invitationPages = computed(() => Math.max(1, Math.ceil(this.filteredInvitations().length / this.staffPageSize)));
  readonly visibleInvitations = computed(() => this.filteredInvitations().slice((this.invitationPage() - 1) * this.staffPageSize, this.invitationPage() * this.staffPageSize));
  readonly activeTeachers = computed(() => this.store.teachers().filter(t => t.status === 'active').map(t => ({id:t.id,fullName:t.fullName,email:t.email})));
  readonly filteredSubjects = computed(() => this.store.head.subjects().filter(s => `${s.name} ${s.code}`.toLowerCase().includes(this.subjectSearch().trim().toLowerCase())));
  readonly futureYears = computed(() => this.store.years.years().filter(y => y.status !== 'closed' && y.startDate > (this.store.year()?.startDate ?? '9999')));
  form: Record<string, string> = {};
  subjects: string[] = [];
  bands: GradeBand[] = [];
  passMark = 35;
  readonly pageContext=computed(()=>`${this.store.remote.context()}:${this.store.policy().revision}:${this.section()}`);
  constructor() {
    effect(() => { this.pageContext(); untracked(() => { this.close(); this.notice.set(''); this.search.set(''); this.teacherSearch.set(''); this.invitationSearch.set(''); this.classPage.set(1); this.teacherPage.set(1); this.invitationPage.set(1); this.bands = structuredClone(this.store.policy().bands); this.passMark = this.store.policy().passMark; }); });
    effect(() => { this.search(); this.classPage.set(1); });
    effect(() => { this.teacherSearch(); this.teacherPage.set(1); });
    effect(() => { this.invitationSearch(); this.invitationPage.set(1); });
    effect(() => { if (this.classPage() > this.classPages()) this.classPage.set(this.classPages()); });
    effect(() => { if (this.teacherPage() > this.teacherPages()) this.teacherPage.set(this.teacherPages()); });
    effect(() => { if (this.invitationPage() > this.invitationPages()) this.invitationPage.set(this.invitationPages()); });
  }
  openClassDetails(id: string): void { this.selectedClassId.set(id); }
  open(mode: string, id = ''): void {
    if (this.store.remote.busy() || this.saving()) return;
    this.dialog.set(mode); this.editingId.set(id); this.error.set(''); this.form = {}; this.subjects = []; this.subjectSearch.set('');
    if (mode === 'teacher') this.form = { expiresInMinutes: '2880' };
    if (mode === 'subject' && id) { const subject = this.store.head.subjects().find(s => s.id === id); this.form = { name: subject?.name ?? '', code: subject?.code ?? '' }; }
    if (mode === 'class-teacher') this.form = { teacherId: this.store.classTeachers.forClass(id, this.store.year()?.id ?? '')?.membershipId ?? '' };
    if (mode === 'class') { const c = this.store.classes().find(c => c.id === id); this.form = { name: c?.name ?? '', stream: c?.stream ?? '' }; this.subjects = c ? this.store.subjects(c.id).map(m => m.subjectId) : []; }
  }
  close(): void { if(this.store.remote.busy() || this.saving())return; this.dialog.set(''); this.editingId.set(''); this.error.set(''); }
  toggleSubject(id: string): void { this.subjects = this.subjects.includes(id) ? this.subjects.filter(s => s !== id) : [...this.subjects, id]; }
  selectedSubjects() { return this.store.head.subjects().filter(subject => this.subjects.includes(subject.id)); }
  async save(): Promise<void> {
    if(this.saving() || !this.dialog())return;
    const f = (key: string) => this.form[key] ?? ''; let error: string | null = null;
    if(this.dialog()==='class' && f('name').trim().length<2){this.error.set('Enter a class name with at least two characters.');return;}
    if(this.dialog()==='subject' && (f('name').trim().length<2 || !f('code').trim())){this.error.set('Enter a subject name and code.');return;}
    this.saving.set(true); this.error.set('');
    const isTeacherInvitation = this.dialog() === 'teacher';
    let teacherExpiresAt = '';
    try {
      if (this.dialog() === 'class-teacher') error = await this.store.classTeachers.assign(this.editingId(), f('teacherId'));
      if (this.dialog() === 'class') error = await this.store.saveClass({ name: f('name'), stream: f('stream'), subjectIds: this.subjects }, this.editingId() || undefined);
      if (this.dialog() === 'subject') error = await this.store.saveSubject(f('name'), f('code'), this.editingId() || undefined);
      if (isTeacherInvitation) {
        const result = await this.store.inviteTeacher(f('name'), f('email'), Number(f('expiresInMinutes')));
        error = result.error;
        teacherExpiresAt = result.expiresAt ?? '';
      }
      if (this.dialog() === 'copy') error = await this.store.prepareClasses(f('target'));
    } catch (failure) {
      error = this.store.head.api.auth.error(failure);
    } finally {
      this.saving.set(false);
    }
    if (error) this.error.set(error); else { this.close(); this.notice.set(isTeacherInvitation ? `Teacher invitation queued for email delivery. Link expires ${new Date(teacherExpiresAt).toLocaleString()}.` : 'Changes saved.'); }
  }
  async confirmTeacherAction(): Promise<void> { const target=this.teacherAction(); if(!target)return; try { await this.store.head.api.write('members/'+target.id,target.remove?{}:{active:!target.active},target.remove?'DELETE':'PATCH'); this.teacherAction.set(null); this.notice.set(target.remove?'Teacher role removed.':'Teacher access updated.'); } catch(error) { this.error.set(this.store.head.api.auth.error(error)); } }
  async confirmDeleteClass(): Promise<void> { const target=this.classToDelete();if(!target)return;const error=await this.store.deleteClass(target.id);if(error)this.error.set(error);else{this.classToDelete.set(null);this.notice.set(`${target.name} was deleted.`);} }
  expiryLabel(value: string): string { return this.expiryOptions.find(option => option.minutes === Number(value))?.label ?? '48 hours'; }
  invitationStatus(invitation: { status: string; expiresAt: string }): string { return invitation.status === 'active' && Date.parse(invitation.expiresAt) < Date.now() ? 'Expired' : invitation.status; }
  async saveGrading(): Promise<void> {
    const labels=this.bands.map(b=>b.label.trim().toLowerCase());
    const invalidBand = this.bands.some((band, index) =>
      !band.label.trim() || !Number.isFinite(Number(band.minimum)) || Number(band.minimum) < 0 || Number(band.minimum) > 100 ||
      (index > 0 && Number(band.minimum) >= Number(this.bands[index - 1].minimum)));
    if (!Number.isFinite(Number(this.passMark)) || Number(this.passMark) < 0 || Number(this.passMark) > 100) {
      this.error.set('Enter a pass mark between 0 and 100.'); return;
    }
    if (!this.bands.length || new Set(labels).size !== labels.length || this.bands.at(-1)?.minimum !== 0 || invalidBand) {
      this.error.set('Enter unique grade names and descending minimum scores, ending at 0.'); return;
    }
    const error = await this.store.grading.save(this.bands, Number(this.passMark));
    if (error) this.error.set(error); else { this.error.set(''); this.notice.set('Grading scheme saved. Submitted and published results retain their existing grading scheme.'); }
  }
}
