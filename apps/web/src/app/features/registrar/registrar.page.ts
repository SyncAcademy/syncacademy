import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { HeadPageHeaderComponent } from '../headmaster/shared/head-page-header.component';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import { RegistrarStore } from './registrar.store';
import { LoadingSkeletonComponent } from '../../shared/loading-skeleton.component';

@Component({ selector: 'app-registrar-page', standalone: true, imports: [CommonModule, FormsModule, RouterLink, HeadPageHeaderComponent, DialogFocusDirective, LoadingSkeletonComponent], templateUrl: './registrar.page.html', styleUrls: ['./registrar.page.scss'] })
export class RegistrarPage {
  readonly store = inject(RegistrarStore);
  readonly api = this.store.api;
  private readonly route = inject(ActivatedRoute);
  private readonly data = toSignal(this.route.data);
  readonly section = computed<string>(() => this.data()?.['section'] || 'page');
  readonly title = computed<string>(() => this.data()?.['title'] || 'Student Management');
  readonly base = computed(() => this.api.role() === 'HEADMASTER' ? '/head' : this.api.role() === 'ACADEMIC' ? '/academic' : '/register');
  readonly canManage = computed(() => !!this.api.data()?.permissions?.registrar);
  readonly canViewGuardians = computed(() => this.canManage() || !!this.api.data()?.permissions?.academic);
  readonly canSendResults = computed(() => ['HEADMASTER', 'ACADEMIC'].includes(this.api.role() || ''));
  readonly description = computed(() => ({ page: 'Keep admissions, student records, and class placement up to date.', students: 'Search and manage student profiles, enrollment status, and class placement.', 'class-lists': 'View the active roster for one selected class. Use the student directory for profile and movement work.', admissions: 'Review applications and admit students into an open academic year.', enrolment: 'Place existing students in the selected academic year.', transfers: 'Record class changes and departures while preserving student history.', progression: 'Enroll selected students in a later year without changing their source records.' }[this.section()] || 'School student records.'));
  readonly search = signal(''); readonly classFilter = signal(''); readonly statusFilter = signal('');
  readonly page = signal(1); readonly total = signal(0); readonly pageSize = 25;
  readonly activityPageSize = 10;
  readonly items = signal<any[]>([]); readonly summary = signal<any>(null);
  readonly loading = signal(false); readonly error = signal(''); readonly notice = signal('');
  readonly busy = signal(false); readonly dialog = signal(''); readonly record = signal<any>(null);
  readonly selected = signal<string[]>([]); readonly targetYear = signal(''); readonly targetClass = signal('');
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / (this.section() === 'page' ? this.activityPageSize : this.pageSize))));
  readonly futureYears = computed(() => this.store.years.years().filter(y => y.status !== 'closed' && y.startDate > (this.store.year()?.startDate || '9999')));
  readonly targetClasses = computed(() => this.store.classesFor(this.targetYear()));
  readonly today = new Date().toISOString().slice(0, 10);
  readonly offerings = signal<any[]>([]); selectedSubjects: string[] = [];
  subjectsFor(classId: string) { return this.offerings().filter(o => o.classroomId === classId); }
  setDefaultSubjects(classId: string) { this.selectedSubjects = this.subjectsFor(classId).map(o => o.subjectId); }
  toggleSubject(id: string) { this.selectedSubjects = this.selectedSubjects.includes(id) ? this.selectedSubjects.filter(s => s !== id) : [...this.selectedSubjects, id]; }
  subjectNames(e: any) { return (e.subjects || []).map((s: any) => s.subject.name).join(', ') || 'Not assigned'; }
  form: Record<string, string> = {};
  guardianRows: Array<{ name: string; relationship: string; phone: string; whatsappPhone: string; email: string; isPrimary: boolean }> = [];
  readonly publishOptions = signal<any[]>([]);
  readonly invitationSelection = signal<string[]>([]);
  readonly invitationPageSelected = computed(() => this.items().some(student => this.eligibleForInvitation(student)) && this.items().filter(student => this.eligibleForInvitation(student)).every(student => this.invitationSelection().includes(student.id)));
  verificationCodes: Record<string, string> = {};
  private readonly context = computed(() => `${this.api.schoolId()}|${this.store.year()?.id || ''}|${this.section()}`);
  private request = 0;
  private detailRequest = 0;
  constructor() {
    effect(() => { this.context(); untracked(() => { this.detailRequest++; this.record.set(null); this.error.set(''); this.search.set(''); this.classFilter.set(this.route.snapshot.queryParamMap.get('class') || ''); this.statusFilter.set(''); this.page.set(1); this.selected.set([]); this.invitationSelection.set([]); this.verificationCodes = {}; this.targetYear.set(''); this.targetClass.set(''); this.dialog.set(''); this.notice.set(''); }); });
    effect(onCleanup => {
      const context = { school: this.api.schoolId(), year: this.store.year()?.id, section: this.section(), q: this.search(), classId: this.classFilter(), status: this.statusFilter(), page: this.page() };
      this.api.data();
      untracked(() => { this.request++; this.items.set([]); this.summary.set(null); this.total.set(0); this.loading.set(true); });
      const timer = setTimeout(() => void this.load(context), 200);
      onCleanup(() => { clearTimeout(timer); this.request++; });
    });
  }
  async get(path: string, school = this.api.schoolId()): Promise<any> { return this.api.auth.request('GET', `schools/${school}/registry/${path}`); }
  async load(context?: { school: string; year?: string; section: string; q: string; classId: string; status: string; page: number }) {
    const c = context || { school: this.api.schoolId(), year: this.store.year()?.id, section: this.section(), q: this.search(), classId: this.classFilter(), status: this.statusFilter(), page: this.page() };
    const generation = ++this.request;
    if (!c.school || !c.year) { this.loading.set(false); return; }
    this.loading.set(true); this.error.set('');
    const query = new URLSearchParams({ yearId: c.year, page: String(c.page), pageSize: String(this.pageSize), q: c.q });
    let endpoint = 'students';
    if (c.section === 'admissions') { endpoint = 'admissions'; if (c.status) query.set('status', c.status); }
    else if (['page', 'transfers', 'reports'].includes(c.section)) { endpoint = 'events'; if (c.section === 'transfers') query.set('kind', 'movement'); }
    else { if (c.classId) query.set('classId', c.classId); if (c.section === 'progression' || c.section === 'class-lists') query.set('status', 'active'); else if (c.section === 'enrolment') query.set('status', 'unassigned'); else if (c.status) query.set('status', c.status); }
    try {
      const classScopedStudents = ['students', 'class-lists', 'progression'].includes(c.section) && !c.classId;
      query.set('pageSize', String(c.section === 'page' ? this.activityPageSize : this.pageSize));
      const [summary, list, subjects] = await Promise.all([this.get('summary?yearId=' + c.year, c.school), classScopedStudents ? Promise.resolve({ items: [], total: 0 }) : this.get(endpoint + '?' + query, c.school), this.canManage() ? this.get('subjects?yearId=' + c.year, c.school) : Promise.resolve({ offerings: [] })]);
      if (generation !== this.request) return;
      this.offerings.set(subjects.offerings || []); this.summary.set(summary); this.items.set(list.items); this.total.set(list.total);
      if (this.page() > this.pageCount()) this.page.set(this.pageCount());
    } catch (e) { if (generation === this.request) { this.error.set(this.api.auth.error(e)); this.items.set([]); this.summary.set(null); } }
    finally { if (generation === this.request) this.loading.set(false); }
  }
  filter(kind: 'search' | 'class' | 'status', value: string) { this.page.set(1); this.selected.set([]); this.invitationSelection.set([]); if (kind === 'search') this.search.set(value); else if (kind === 'class') this.classFilter.set(value); else this.statusFilter.set(value); }
  enrollment(s: any): any { return s.enrollments?.[0]; }
  eligibleForInvitation(student: any): boolean { return !!student?.enrollments?.some((entry: any) => entry.status === 'active' && entry.classroom?.yearId === this.store.year()?.id && (!this.classFilter() || entry.classroomId === this.classFilter())); }
  statusLabel(status: string) { return (status || 'unassigned').replaceAll('_', ' '); }
  async open(mode: string, row?: any) {
    if (this.busy()) return;
    this.error.set(''); this.record.set(row || null); this.form = {}; this.selectedSubjects = [];
    if (['profile', 'student', 'move', 'subjects'].includes(mode) && row) {
      const generation = ++this.detailRequest; const school = this.api.schoolId();
      this.busy.set(true);
      try { const result = await this.get('students/' + row.id); if (generation !== this.detailRequest || school !== this.api.schoolId()) return; row = result; this.record.set(row); }
      catch (e) { this.error.set(this.api.auth.error(e)); return; }
      finally { this.busy.set(false); }
    }
    if (mode === 'student' || mode === 'admission') {
      this.form = { name: row?.name || '', admissionNumber: row?.admissionNumber || '', gender: row?.gender || '', dateOfBirth: row?.dateOfBirth?.slice(0, 10) || '', address: row?.address || '', admissionDate: row?.admissionDate?.slice(0,10) || '', ownPhone: row?.ownPhone || '', guardianName: row?.guardianName || '', guardianPhone: row?.guardianPhone || '', classroomId: this.classFilter() };
      this.guardianRows = !row && mode === 'student' ? [{ name: '', relationship: 'Parent', phone: '', whatsappPhone: '', email: '', isPrimary: true }] : [];
    }
    if (mode === 'student' && !row) this.setDefaultSubjects(this.classFilter());
    if (mode === 'review') { this.form = { decision: 'accepted', classroomId: row.requestedClassId, admissionNumber: '', note: '' }; this.setDefaultSubjects(row.requestedClassId); }
    if (mode === 'enrol') { this.form = { classroomId: this.classFilter() }; this.setDefaultSubjects(this.classFilter()); }
    if (mode === 'move') { const e = row.enrollments.find((e: any) => e.classroom.yearId === this.store.year()?.id); if (!e) { this.error.set('No enrollment exists in the selected year.'); return; } this.form = { enrollmentId: e.id, version: String(e.version), action: e.status === 'active' ? 'class_change' : 'reactivate', classroomId: '', reason: '' }; }
    if (mode === 'subjects') { const e = row.enrollments.find((e: any) => e.classroom.yearId === this.store.year()?.id); if (!e) return; this.form = { enrollmentId: e.id, version: String(e.version), classroomId: e.classroomId }; this.selectedSubjects = (e.subjects || []).map((s: any) => s.subjectId); }
    this.dialog.set(mode);
  }
  addGuardianRow() { this.guardianRows.push({ name: '', relationship: 'Guardian', phone: '', whatsappPhone: '', email: '', isPrimary: false }); }
  removeGuardianRow(index: number) { this.guardianRows.splice(index, 1); if (this.guardianRows.length && !this.guardianRows.some(row => row.isPrimary)) this.guardianRows[0].isPrimary = true; }
  setPrimaryGuardian(index: number) { this.guardianRows.forEach((row, i) => row.isPrimary = i === index); }
  async guardianEditor(link?: any) {
    if (!this.record()) return;
    this.error.set('');
    this.form = { guardianId: link?.guardianId || '', name: link?.guardian?.name || '', relationship: link?.relationship || 'Guardian', phone: link?.guardian?.phone || '', whatsappPhone: link?.guardian?.whatsappPhone || '', email: link?.guardian?.email || '', isPrimary: link?.isPrimary ? 'true' : 'false' };
    this.dialog.set('guardian');
  }
  async saveGuardian() {
    const student = this.record(); if (!student || this.busy()) return;
    this.busy.set(true); this.error.set('');
    try {
      const f = this.form;
      if (f['guardianId']) {
        await this.api.write(`guardians/${f['guardianId']}`, { name: f['name'], phone: f['phone'], whatsappPhone: f['whatsappPhone'], email: f['email'] }, 'PATCH');
        await this.api.write(`students/${student.id}/guardians/${f['guardianId']}`, { relationship: f['relationship'], isPrimary: f['isPrimary'] === 'true' }, 'PATCH');
      } else {
        await this.api.write(`students/${student.id}/guardians`, { guardianData: { name: f['name'], phone: f['phone'], whatsappPhone: f['whatsappPhone'], email: f['email'] }, relationship: f['relationship'], isPrimary: f['isPrimary'] === 'true' });
      }
      this.record.set(await this.get('students/' + student.id));
      this.dialog.set('profile'); this.notice.set('Guardian information saved.');
    } catch (e) { this.error.set(this.api.auth.error(e)); }
    finally { this.busy.set(false); }
  }
  toggleInvitation(id: string) { this.invitationSelection.update(ids => ids.includes(id) ? ids.filter(item => item !== id) : ids.length < 100 ? [...ids, id] : ids); }
  selectInvitationPage() { const ids = this.items().filter(student => this.eligibleForInvitation(student)).map(student => student.id); this.invitationSelection.update(current => ids.every(id => current.includes(id)) ? current.filter(id => !ids.includes(id)) : [...new Set([...current, ...ids])].slice(0, 100)); }
  async sendInvitations(studentIds?: string[]) {
    if (this.busy() || !this.store.year()?.id) return;
    if (!window.confirm(studentIds?.length ? `Send contact verification invitations for ${studentIds.length} selected student(s)?` : `Send contact verification invitations to eligible guardians ${this.classFilter() ? 'in this class' : 'across this school'}?`)) return;
    this.busy.set(true); this.error.set('');
    try {
      const result: any = await this.api.write('guardian-invitations', { yearId: this.store.year()!.id, ...(this.classFilter() ? { classId: this.classFilter() } : {}), ...(studentIds ? { studentIds } : {}), channel: 'SMS' });
      this.notice.set(`${result.sent} guardian invitation(s) queued; ${result.skipped} skipped. Verification does not grant record access.`);
      this.invitationSelection.set([]);
    } catch (e) { this.error.set(this.api.auth.error(e)); }
    finally { this.busy.set(false); }
  }
  async confirmGuardian(guardianId: string) {
    const code = (this.verificationCodes[guardianId] || '').trim();
    if (!/^\d{6}$/.test(code) || this.busy()) { this.error.set('Enter the six digit code received by the guardian.'); return; }
    this.busy.set(true); this.error.set('');
    try {
      await this.api.write(`guardians/${guardianId}/verification/confirm`, { channel: 'SMS', code });
      if (this.record()) this.record.set(await this.get('students/' + this.record().id));
      delete this.verificationCodes[guardianId]; this.notice.set('Guardian phone verified. Student-record access remains separate.');
    } catch (e) { this.error.set(this.api.auth.error(e)); }
    finally { this.busy.set(false); }
  }
  async openPublish() {
    if (this.busy() || !this.store.year()?.id) return;
    this.busy.set(true); this.error.set('');
    try {
      const result: any = await this.api.auth.request('GET', `schools/${this.api.schoolId()}/reports/publish-options?yearId=${this.store.year()!.id}`);
      this.publishOptions.set(result.assessments || []); this.form = { assessmentId: '', channel: 'SMS' }; this.dialog.set('publish');
    } catch (e) { this.error.set(this.api.auth.error(e)); }
    finally { this.busy.set(false); }
  }
  async publishResults() {
    if (this.busy() || !this.form['assessmentId'] || !this.store.year()?.id) return;
    if (!window.confirm(`Send approved results to eligible guardians ${this.classFilter() ? 'in this class' : 'across this school'}?`)) return;
    this.busy.set(true); this.error.set('');
    try {
      const result: any = await this.api.write('reports/publish-with-links', { yearId: this.store.year()!.id, assessmentId: this.form['assessmentId'], ...(this.classFilter() ? { classId: this.classFilter() } : {}), channel: this.form['channel'] });
      this.dialog.set(''); this.notice.set(`${result.dispatchedCount} approved result link(s) queued for guardians.`);
    } catch (e) { this.error.set(this.api.auth.error(e)); }
    finally { this.busy.set(false); }
  }
  close() { if (this.busy()) return; this.detailRequest++; this.dialog.set(''); this.record.set(null); this.error.set(''); }
  async save() {
    if (this.busy()) return;
    this.busy.set(true); this.error.set('');
    const f = this.form; const mode = this.dialog(); let path = ''; let method = 'POST'; let payload: any;
    const profile = { name: f['name'], gender: f['gender'] || null, dateOfBirth: f['dateOfBirth'] || null, address: f['address'] || '', admissionDate: f['admissionDate'] || null, ownPhone: f['ownPhone'] || '', guardianName: f['guardianName'] || '', guardianPhone: f['guardianPhone'] || '' };
    if (mode === 'student') {
      path = 'students' + (this.record() ? '/' + this.record().id : ''); method = this.record() ? 'PATCH' : 'POST';
      payload = { ...profile, admissionNumber: f['admissionNumber'], ...(this.record() ? { version: this.record().version, yearId: this.store.year()?.id } : { classroomId: f['classroomId'], subjectIds: this.selectedSubjects, guardians: this.guardianRows.filter(row => row.name && row.phone) }) };
    } else if (mode === 'admission') { path = 'admissions'; payload = { ...profile, requestedClassId: f['classroomId'] }; }
    else if (mode === 'review') { path = `admissions/${this.record().id}/decision`; payload = { decision: f['decision'], note: f['note'] || '', ...(f['decision'] === 'accepted' ? { classroomId: f['classroomId'], subjectIds: this.selectedSubjects, admissionNumber: f['admissionNumber'] } : {}) }; }
    else if (mode === 'enrol') { path = 'enrollments'; payload = { studentId: this.record().id, classroomId: f['classroomId'], subjectIds: this.selectedSubjects }; }
    else if (mode === 'move') { path = 'movements'; payload = { enrollmentId: f['enrollmentId'], version: Number(f['version']), action: f['action'], reason: f['reason'], ...(f['action'] === 'class_change' ? { classroomId: f['classroomId'], subjectIds: this.selectedSubjects } : {}) }; }
    else if (mode === 'subjects') { path = `enrollments/${f['enrollmentId']}/subjects`; method = 'PATCH'; payload = { version: Number(f['version']), subjectIds: this.selectedSubjects }; }
    else if (mode === 'progress') { path = 'progression'; payload = { studentIds: this.selected(), sourceYearId: this.store.year()?.id, classroomId: this.targetClass(), subjectIds: this.selectedSubjects }; }
    try { await this.api.write('registry/' + path, payload, method); this.dialog.set(''); this.record.set(null); this.selected.set([]); this.notice.set('Saved successfully. Class lists and school records have been updated.'); await this.load(); }
    catch (e) { this.error.set(this.api.auth.error(e)); }
    finally { this.busy.set(false); }
  }
  async loadTargetSubjects() { this.selectedSubjects = []; if (!this.targetYear()) return; const year = this.targetYear(); const school = this.api.schoolId(); try { const result = await this.get('subjects?yearId=' + year); if (year === this.targetYear() && school === this.api.schoolId()) { this.offerings.update(current => [...current.filter(o => !this.targetClasses().some(c => c.id === o.classroomId)), ...result.offerings]); this.setDefaultSubjects(this.targetClass()); } } catch (e) { this.error.set(this.api.auth.error(e)); } }
  toggle(id: string) { this.selected.update(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]); }
  selectPage() { const ids = this.items().map(s => s.id); this.selected.update(current => ids.every(id => current.includes(id)) ? current.filter(id => !ids.includes(id)) : [...new Set([...current, ...ids])].slice(0, 100)); }
  async exportStudents() {
    this.busy.set(true); this.error.set('');
    const school = this.api.schoolId(); const year = this.store.year()?.id; const classId = this.classFilter(); const q = this.search();
    const status = this.section() === 'class-lists' ? 'active' : this.section() === 'enrolment' ? 'unassigned' : this.statusFilter();
    try {
      const rows: any[] = []; let page = 1;
      while (true) {
        const params = new URLSearchParams({ yearId: year!, q, page: String(page), pageSize: '100' });
        if (classId) params.set('classId', classId); if (status) params.set('status', status);
        const result = await this.get('students?' + params, school); rows.push(...result.items);
        if (rows.length >= result.total || !result.items.length) break; page++;
      }
      this.download('students', ['Student number', 'Name', 'Gender', 'Class', 'Status'], rows.map(s => [s.admissionNumber, s.name, s.gender || '', this.enrollment(s)?.classroom.name || '', this.statusLabel(this.enrollment(s)?.status)]));
    } catch (e) { this.error.set(this.api.auth.error(e)); } finally { this.busy.set(false); }
  }
  exportSummary() { this.download('enrollment-summary', ['Academic year', 'Class', 'Active students'], (this.summary()?.classes || []).map((c: any) => [this.store.year()?.label, c.name, c._count.enrollments])); }
  private download(name: string, headers: string[], rows: any[][]) {
    const cell = (v: any) => { let value = String(v ?? ''); if (/^[=+@\-\t\r]/.test(value)) value = "'" + value; return '"' + value.replaceAll('"', '""') + '"'; };
    const url = URL.createObjectURL(new Blob(['\ufeff' + [headers, ...rows].map(r => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `${name}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
