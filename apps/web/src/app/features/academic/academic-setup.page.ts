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

@Component({ selector: 'app-academic-setup', standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HeadPageHeaderComponent, DialogFocusDirective],
  templateUrl: './academic-setup.page.html', styleUrls: ['./academic.page.scss'],
})
export class AcademicSetupPage {
  readonly store = inject(AcademicSetupStore);
  private readonly data = toSignal(inject(ActivatedRoute).data);
  readonly section = computed(() => this.data()?.['section'] ?? 'classes-subjects');
  readonly title = computed(() => this.data()?.['title'] ?? 'Classes & Subjects');
  readonly dialog = signal(''); readonly error = signal(''); readonly notice = signal('');
  readonly expiryOptions = EXPIRY_OPTIONS;
  readonly search = signal(''); readonly editingId = signal('');
  readonly classes = computed(() => this.store.classes().filter(c => `${c.name} ${c.stream ?? ''}`.toLowerCase().includes(this.search().toLowerCase())));
  readonly futureYears = computed(() => this.store.years.years().filter(y => y.status !== 'closed' && y.startDate > (this.store.year()?.startDate ?? '9999')));
  form: Record<string, string> = {};
  subjects: string[] = [];
  bands: GradeBand[] = [];
  passMark = 35;
  constructor() { effect(() => { this.store.year(); this.section(); untracked(() => { this.close(); this.notice.set(''); this.search.set(''); this.bands = structuredClone(this.store.policy().bands); this.passMark = this.store.policy().passMark; }); }); }
  open(mode: string, id = ''): void {
    if ((mode !== 'class' && mode !== 'teacher') || id) { this.notice.set('This workflow is not available yet. No changes were saved.'); return; }
    this.dialog.set(mode); this.editingId.set(id); this.error.set(''); this.form = {}; this.subjects = [];
    if (mode === 'teacher') this.form = { expiresInMinutes: '2880' };
    if (mode === 'class') { const c = this.store.classes().find(c => c.id === id); this.form = { name: c?.name ?? '', stream: c?.stream ?? '', capacity: String(c?.capacity ?? 60), status: c?.enrolmentStatus ?? 'draft' }; this.subjects = c ? this.store.subjects(c.id).map(m => m.subjectId) : []; }
  }
  close(): void { this.dialog.set(''); this.editingId.set(''); this.error.set(''); }
  toggleSubject(id: string): void { this.subjects = this.subjects.includes(id) ? this.subjects.filter(s => s !== id) : [...this.subjects, id]; }
  async save(): Promise<void> {
    const f = (key: string) => this.form[key] ?? ''; let error: string | null = null;
    const isTeacherInvitation = this.dialog() === 'teacher';
    let teacherExpiresAt = '';
    if (this.dialog() === 'class-teacher') error = this.store.classTeachers.assign(this.editingId(), f('teacherId'));
    if (this.dialog() === 'class') error = await this.store.saveClass({ name: f('name'), stream: f('stream'), capacity: Number(f('capacity')), status: f('status'), subjectIds: this.subjects }, this.editingId() || undefined);
    if (this.dialog() === 'subject') error = this.store.saveSubject(f('name'), f('code'));
    if (isTeacherInvitation) {
      const result = await this.store.inviteTeacher(f('name'), f('email'), Number(f('expiresInMinutes')));
      error = result.error;
      teacherExpiresAt = result.expiresAt ?? '';
    }
    if (this.dialog() === 'verify') error = this.store.verifyTeacher(this.editingId(), f('verification'));
    if (this.dialog() === 'copy') error = this.store.prepareClasses(f('target'));
    if (this.dialog() === 'delete') error = this.store.deleteClass(this.editingId());
    if (error) this.error.set(error); else { this.close(); this.notice.set(isTeacherInvitation ? `Teacher invitation queued for email delivery. Link expires ${new Date(teacherExpiresAt).toLocaleString()}.` : 'Changes saved.'); }
  }
  expiryLabel(value: string): string { return this.expiryOptions.find(option => option.minutes === Number(value))?.label ?? '48 hours'; }
  invitationStatus(invitation: { status: string; expiresAt: string }): string { return invitation.status === 'active' && Date.parse(invitation.expiresAt) < Date.now() ? 'Expired' : invitation.status; }
  saveGrading(): void { const error = this.store.grading.save(this.bands, Number(this.passMark)); if (error) this.error.set(error); else { this.error.set(''); this.notice.set('Grading scheme saved. Submitted and published results retain their existing grading scheme.'); } }
}
