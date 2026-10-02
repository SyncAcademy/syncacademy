import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { HeadPageHeaderComponent } from '../headmaster/shared/head-page-header.component';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import { RegistrarStore } from './registrar.store';
import { AcademicSetupStore } from '../academic/academic-setup.store';

@Component({
  selector: 'app-registrar-page', standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HeadPageHeaderComponent, DialogFocusDirective],
  templateUrl: './registrar.page.html', styleUrls: ['./registrar.page.scss'],
})
export class RegistrarPage {
  readonly store = inject(RegistrarStore);
  readonly setup = inject(AcademicSetupStore);
  private readonly route = inject(ActivatedRoute);
  private readonly data = toSignal(this.route.data);
  readonly section = computed(() => this.data()?.['section'] ?? 'page');
  readonly title = computed(() => this.data()?.['title'] ?? 'Overview');
  readonly descriptions: Record<string, string> = {
    page: 'Manage admissions, keep student records complete, and maintain accurate class lists.',
    admissions: 'Review applications and admit students into the selected academic year.',
    students: 'Maintain student profiles and view enrolment history across academic years.',
    enrolment: 'Assign registered students to a class in the selected academic year.',
    'class-lists': 'Review class rosters, export student lists, and publish updates to teachers.',
    guardians: 'Link parents and guardians, maintain contact details, and record verification.',
    transfers: 'Record class changes, transfers, withdrawals, and graduation without deleting history.',
    progression: 'Create next-year enrolments while preserving each student’s source-year record.',
    reports: 'Review class enrolment, student movements, and missing registration details.',
  };
  readonly search = signal('');
  readonly classFilter = signal('all');
  readonly statusFilter = signal('all');
  readonly notice = signal('');
  readonly error = signal('');
  readonly dialog = signal('');
  readonly detailId = signal('');
  readonly targetYearId = signal('');
  readonly targetClassId = signal('');
  readonly selected = signal<string[]>([]);
  readonly page = signal(1);
  readonly pageSize = 25;
  form: Record<string, string> = {};
  readonly today = new Date().toISOString().slice(0, 10);
  readonly students = computed(() => this.store.students().filter(student => {
    const enrolment = this.store.enrolment(student.id);
    if (this.section() === 'class-lists' && this.classFilter() === 'all') return false;
    return `${student.name} ${student.number}`.toLowerCase().includes(this.search().toLowerCase()) &&
      (this.classFilter() === 'all' || enrolment?.classId === this.classFilter()) &&
      (this.statusFilter() === 'all' || (enrolment?.status ?? 'unassigned') === this.statusFilter());
  }));
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.students().length / this.pageSize)));
  readonly visibleStudents = computed(() => this.students().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize));
  readonly applications = computed(() => this.store.admissions().filter(a => `${a.name} ${a.guardianName}`.toLowerCase().includes(this.search().toLowerCase()) && (this.statusFilter() === 'all' || a.status === this.statusFilter())));
  readonly guardians = computed(() => this.store.guardians().filter(g => `${g.name} ${g.phone} ${g.studentIds.map(id => this.store.student(id)?.name).join(' ')}`.toLowerCase().includes(this.search().toLowerCase()) &&
    (this.statusFilter() === 'all' || (this.statusFilter() === 'verified' ? !!g.verifiedAt : !g.verifiedAt))));
  readonly availableStudents = computed(() => this.store.allStudents().filter(s => !this.store.enrolment(s.id)));
  readonly activeStudents = computed(() => this.students().filter(s => this.store.enrolment(s.id)?.status === 'active'));
  readonly profile = computed(() => this.store.students().find(s => s.id === this.detailId()));
  readonly application = computed(() => this.store.admissions().find(a => a.id === this.detailId()));
  readonly futureYears = computed(() => this.store.years.years().filter(y => y.status !== 'closed' && y.startDate > (this.store.year()?.startDate ?? '9999')));
  readonly selectedClass = computed(() => this.store.classes().find(c => c.id === this.classFilter()));
  readonly canManageClass = computed(() => !this.store.readOnly() && this.selectedClass()?.enrolmentStatus === 'open');
  readonly targetClasses = computed(() => this.store.classesFor(this.targetYearId()).filter(c => c.enrolmentStatus === 'open'));
  readonly movementEvents = computed(() => this.store.events().filter(e => e.kind === 'movement'));
  readonly acceptedCount = computed(() => this.store.admissions().filter(a => a.status === 'accepted').length);
  readonly dialogTitle = computed(() => ({ student: this.detailId() ? 'Edit student profile' : 'Register student', admission: 'New application',
    review: 'Review admission', enrol: 'Enrol student', move: 'Record student movement', guardian: 'Guardian contact', link: 'Link existing guardian',
    verify: 'Record contact verification', publish: 'Publish class list', prepare: 'Prepare target classes', progress: 'Review year progression', profile: 'Student profile', 'student-invite':'Invite student to sign in',
  } as Record<string, string>)[this.dialog()] ?? 'Student records');
  readonly genderCounts = computed(() => {
    const ids = new Set(this.store.enrolments().filter(e => e.status === 'active').map(e => e.studentId));
    return ['F', 'M'].map(gender => ({ gender, count: this.store.students().filter(s => ids.has(s.id) && s.gender === gender).length }));
  });
  constructor() {
    effect(() => { this.section(); this.store.year()?.id; untracked(() => { this.reset(); this.close(); this.notice.set(''); this.targetYearId.set(''); this.targetClassId.set(''); }); });
    effect(() => { this.search(); this.classFilter(); this.statusFilter(); this.page.set(1); this.selected.set([]); });
    effect(() => { const max = this.pageCount(); if (this.page() > max) this.page.set(max); });
  }
  reset(): void { this.search.set(''); this.classFilter.set('all'); this.statusFilter.set('all'); this.selected.set([]); this.page.set(1); }
  open(mode: string, id = ''): void {
    if(!['student','profile','student-invite'].includes(mode)){this.notice.set('This workflow is not available yet. No changes were saved.');return;} if(mode==='student'&&id){this.notice.set('Student profile editing is not available yet.');return;}
    this.dialog.set(mode); this.detailId.set(id); this.error.set(''); this.form = {};
    if (mode === 'student') { const student = this.store.student(id); this.form = student ? { ...student, classId: this.store.enrolment(id)?.classId ?? '' } : { gender: 'F', classId: this.classFilter() };  }
    if(mode==='student-invite') this.form={name:this.store.student(id)?.name||'',email:''};
    if (mode === 'admission') this.form = { gender: 'F' };
    if (mode === 'review') { const a = this.application(); this.form = { classId: a?.requestedClassId ?? '', decision: 'accepted', reason: '' }; }
    if (mode === 'enrol') this.form = { studentId: id, classId: this.classFilter() === 'all' ? '' : this.classFilter() };
    if (mode === 'move') this.form = { studentId: id, action: 'class_change' };
    if (mode === 'guardian' && id) { const g = this.store.guardians().find(g => g.id === id)!; this.form = { name: g.name, relationship: g.relationship, phone: g.phone, email: g.email }; }
    if (mode === 'publish') this.form = { classId: this.classFilter() === 'all' ? '' : this.classFilter() };
  }
  close(): void { this.dialog.set(''); this.detailId.set(''); this.error.set(''); this.form = {}; }
  private finish(error: string | null, message: string): void { if (error) this.error.set(error); else { this.close(); this.notice.set(message); } }
  async save(): Promise<void> {
    const f = this.form; const val = (key: string) => f[key] ?? '';
    switch (this.dialog()) {
      case 'student-invite': try{await this.store.api.write('invitations',{name:val('name'),email:val('email'),role:'STUDENT',studentId:this.detailId()});this.finish(null,'Student invitation queued for email delivery.');}catch(e){this.error.set(this.store.api.auth.error(e));}break;
      case 'student': this.finish(await this.store.saveStudent({ name: val('name'), number: val('number'), gender: val('gender'), birthDate: val('birthDate'), address: val('address') }, this.detailId() || undefined, val('classId')), 'Student saved in the selected class.'); break;
      case 'admission': this.finish(this.store.saveAdmission({ name: val('name'), gender: val('gender'), birthDate: val('birthDate'), guardianName: val('guardianName'), phone: val('phone'), requestedClassId: val('classId') }), 'Application recorded for review.'); break;
      case 'review': this.finish(this.store.decideAdmission(this.detailId(), val('decision') as 'accepted' | 'rejected', val('classId'), val('reason')), val('decision') === 'accepted' ? 'Student admitted and enrolled. Guardian contact awaits verification.' : 'Application decision recorded.'); break;
      case 'enrol': this.finish(this.store.enrol(val('studentId'), val('classId')), 'Student enrolled and editable teacher rosters updated.'); break;
      case 'move': this.finish(this.store.move(val('studentId'), val('action') as 'class_change' | 'transferred_out' | 'withdrawn' | 'graduated', val('classId'), val('reason')), 'Movement recorded. Existing assessment results have been preserved.'); break;
      case 'guardian': this.finish(this.store.saveGuardian({ name: val('name'), relationship: val('relationship'), phone: val('phone'), email: val('email'), studentId: val('studentId') }, this.detailId() || undefined), 'Guardian contact saved. Changed contact details require fresh verification.'); break;
      case 'link': this.finish(this.store.linkGuardian(val('guardianId'), val('studentId')), 'Guardian linked to student.'); break;
      case 'verify': this.finish(this.store.verifyGuardian(this.detailId(), val('note')), 'Contact verification recorded. No message was sent.'); break;
      case 'publish': { const result = this.store.publishRoster(val('classId')); this.finish(result.error ?? null, `${result.updated} editable roster(s) updated. ${result.locked} submitted or approved assessment(s) preserved.`); break; }
      case 'progress': this.finish(this.store.promote(this.selected(), this.targetYearId(), this.targetClassId()), 'Target-year enrolments created. Source-year records remain unchanged.'); if (!this.error()) this.selected.set([]); break;
    }
  }
  selectTarget(id: string): void { this.targetYearId.set(id); this.targetClassId.set(''); }
  toggle(id: string): void { this.selected.update(ids => ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id]); }
  selectVisible(): void { const ids = this.activeStudents().map(s => s.id); this.selected.set(this.selected().length === ids.length ? [] : ids); }
  syncContacts(): void { const count = this.store.syncReportContacts(); this.notice.set(`${count} unreleased report(s) updated with current guardian contacts.`); }
  exportStudents(): void {
    const rows = this.students().map(s => { const e = this.store.enrolment(s.id); return [s.number, s.name, s.gender, this.store.year()?.label ?? '', e ? this.store.className(e.classId) : 'Unassigned', e?.status ?? 'unassigned']; });
    this.download('student-enrolment', ['Student number', 'Name', 'Gender', 'Academic year', 'Class', 'Status'], rows);
  }
  exportSummary(): void { this.download('enrolment-summary', ['Academic year', 'Class', 'Active students'], this.store.counts().map(c => [this.store.year()?.label ?? '', c.stream || c.name, c.active])); }
  private download(name: string, headers: string[], rows: (string | number)[][]): void {
    const cell = (value: string | number) => { let text = String(value); if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`; return `"${text.replace(/"/g, '""')}"`; };
    const csv = [headers, ...rows].map(row => row.map(cell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `${name}-${this.store.year()?.label ?? 'year'}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  yearLabel(id: string): string { return this.store.years.years().find(y => y.id === id)?.label ?? id; }
}
