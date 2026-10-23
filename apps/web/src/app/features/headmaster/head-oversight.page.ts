import { requestId } from '../../core/services/request-id';
import { SaEditorComponent, EditorField } from '../super-admin/components/sa-editor.component';
import { SchoolApiService } from '../../core/services/school-api.service';
﻿import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { HeadPageHeaderComponent } from './shared/head-page-header.component';
import { HeadOversightStore } from './head-oversight.store';
import { Assessment, summarizeResults } from '../academic/academic.store';
import { summarizeStudents } from '../academic/student-result-summary';
import { BursarStore } from '../bursar/bursar.store';
import { displayClassName } from './head.models';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import { ThousandsSeparatorDirective, amountValue } from '../../shared/directives/thousands-separator.directive';
import { newestFirst } from '../../shared/recent-records';

@Component({ selector: 'app-head-oversight', standalone: true,
  imports: [SaEditorComponent,CommonModule, FormsModule, RouterLink, HeadPageHeaderComponent, DialogFocusDirective, ThousandsSeparatorDirective],
  templateUrl: './head-oversight.page.html', styleUrls: ['../academic/academic.page.scss', './head-oversight.page.scss'],
})
export class HeadOversightPage {
 pendingInvitations(){return (this.api.data()?.invitations||[]).filter((i:any)=>!i.acceptedAt&&!i.revokedAt&&new Date(i.expiresAt)>new Date()).length;}
 readonly api=inject(SchoolApiService);editor:{title:string;path:string;fields:EditorField[];key:string}|null=null;editorError='';saving=false;readonly notice=signal('');
 addClass(){this.editorError='';this.editor={title:'Create class',path:'classes',key:requestId(),fields:[{key:'name',label:'Class name',required:true},{key:'yearId',label:'Academic year',choices:(this.api.data()?.years||[]).filter((y:any)=>!y.closed).map((y:any)=>({value:y.id,label:y.name})),required:true}]};}
 assignTeacher(){this.editorError='';this.editor={title:'Assign teacher',path:'assignments',key:requestId(),fields:[{key:'membershipId',label:'Teacher',choices:(this.api.data()?.members||[]).filter((m:any)=>m.role==='TEACHER'&&m.active).map((m:any)=>({value:m.id,label:m.user.name})),required:true},{key:'classroomId',label:'Class',choices:(this.api.data()?.classes||[]).filter((c:any)=>!c.year.closed).map((c:any)=>({value:c.id,label:displayClassName(c.name)+' / '+c.year.name})),required:true}]};}
 async saveRecord(values:Record<string,any>){if(!this.editor||this.saving)return;this.saving=true;this.editorError='';try{await this.api.write(this.editor.path,values,'POST',this.editor.key);this.editor=null;this.notice.set('School record saved.');}catch(e){this.editorError=this.api.auth.error(e);}finally{this.saving=false;}}

  readonly store = inject(HeadOversightStore);
  readonly bursar = inject(BursarStore);
  readonly feeDialog = signal(false);
  readonly feeId = signal('');
  readonly feeClasses = signal<string[]>([]);
  toggleFeeClass(id: string) { this.feeClasses.update(ids => ids.includes(id) ? ids.filter(v => v !== id) : [...ids, id]); }
  selectAllFeeClasses() { this.feeClasses.set(this.store.classes().map(c => c.id)); }
  readonly feeError = signal('');
  readonly feeBusy = signal(false);
  readonly feeForm = signal({ classId: '', term: '', name: '', amount: '', due: '' });
  readonly feeReadOnly = computed(() => !this.store.year());
  readonly bursarActivity = computed(() => this.store.activity().filter(activity => activity.owner === 'Bursar'));
  readonly financeActivityPage = signal(1);
  readonly financeActivityPages = computed(() => Math.max(1, Math.ceil(this.bursarActivity().length / 10)));
  readonly recentFinanceActivity = computed(() => this.bursarActivity().slice((this.financeActivityPage() - 1) * 10, this.financeActivityPage() * 10));
  readonly balancePage = signal(1);
  readonly balancePageCount = computed(() => Math.max(1, Math.ceil(this.accounts().length / 25)));
  readonly balancePageRecords = computed(() => this.accounts().slice((this.balancePage() - 1) * 25, this.balancePage() * 25));
  readonly balancePageRange = computed(() => {
    const count = this.accounts().length;
    return {
      start: count ? (this.balancePage() - 1) * 25 + 1 : 0,
      end: Math.min(this.balancePage() * 25, count),
      count,
    };
  });
  readonly feePage = signal(1);
  readonly feePageSize = signal(10);
  readonly feePageCount = computed(() => Math.max(1, Math.ceil(this.feeStructures().length / this.feePageSize())));
  readonly feePageRecords = computed(() => this.feeStructures().slice((this.feePage() - 1) * this.feePageSize(), this.feePage() * this.feePageSize()));
  readonly feePageRange = computed(() => {
    const count = this.feeStructures().length;
    return {
      start: count ? (this.feePage() - 1) * this.feePageSize() + 1 : 0,
      end: Math.min(this.feePage() * this.feePageSize(), count),
      count,
    };
  });
  private readonly data = toSignal(inject(ActivatedRoute).data);
  readonly section = computed(() => this.data()?.['section'] ?? 'overview');
  readonly title = computed(() => this.data()?.['title'] ?? 'School Overview');
  readonly term = signal(''); readonly classId = signal(''); readonly search = signal('');
  readonly assessmentId = signal(''); readonly assessmentTerm = signal(''); readonly status = signal('approved'); readonly subject = signal(''); readonly owner = signal('');
  readonly page = signal(1); readonly terms = computed(() => [...(this.store.year()?.terms.map(term => term.key) ?? []), 'Full year']);
  termName(key: string): string { return this.store.year()?.terms.find(term => term.key === key)?.name ?? key; }
  readonly activeStudents = computed(() => this.store.enrolments().filter(e => e.status === 'active').length);
  readonly pendingAdmissions = computed(() => this.store.admissions().filter(a => a.status === 'pending').length);
  readonly readyReports = computed(() => this.store.remote.data().reportCount ?? this.store.reports().length);
  readonly assessmentsForTerm = computed(() => this.store.academicData().assessments.filter(a => !this.assessmentTerm() || a.term === this.assessmentTerm()));
  inAssessmentTerm(date: string): boolean { const term = this.store.year()?.terms.find(item => item.key === this.assessmentTerm()); return !this.assessmentTerm() || !!term && date >= term.startsAt && date <= term.endsAt; }
  readonly assessment = computed<Assessment | undefined>(() => this.assessmentsForTerm().find(a => a.id === this.assessmentId()) ?? this.assessmentsForTerm()[0]);
  selectAssessmentTerm(term: string): void { this.assessmentTerm.set(term); this.assessmentId.set(''); this.page.set(1); }
  readonly allAccounts = computed(() => this.store.accountsFor(this.term()));
  readonly accounts = computed(() => this.allAccounts().filter(a => (!this.classId() || a.classId === this.classId()) && `${a.name} ${a.number}`.toLowerCase().includes(this.search().toLowerCase())));
  readonly totals = computed(() => this.accounts().reduce((s, a) => ({ expected: s.expected + a.expected, paid: s.paid + a.paid, balance: s.balance + a.balance, overdue: s.overdue + a.overdue }), { expected: 0, paid: 0, balance: 0, overdue: 0 }));
  readonly classFinance = computed(() => this.store.classes().map(c => {
    const list = this.allAccounts().filter(a => a.classId === c.id);
    return { id: c.id, name: this.store.className(c.id), studentCount: list.length, expected: list.reduce((n, a) => n + a.expected, 0), paid: list.reduce((n, a) => n + a.paid, 0), balance: list.reduce((n, a) => n + a.balance, 0), overdue: list.reduce((n, a) => n + a.overdue, 0) };
  }));
  readonly payments = computed(() => this.store.finance().payments.filter(p => (!this.term() || p.term === this.term()) && (!this.classId() || this.store.accounts().find(a => a.id === p.studentId)?.classId === this.classId()) && `${p.student} ${p.number} ${p.receipt} ${p.reference}`.toLowerCase().includes(this.search().toLowerCase())));
  readonly adjustments = computed(() => this.store.finance().adjustments.filter(a => (!this.term() || a.term === this.term()) && this.accounts().some(s => s.id === a.studentId)));
  readonly results = computed(() => this.store.results().filter(r => r.assessmentId === this.assessment()?.id && (!this.classId() || r.className === this.store.className(this.classId())) && (!this.subject() || r.subject === this.subject()) && (!this.status() || r.status === this.status()) && `${r.student} ${r.studentNumber}`.toLowerCase().includes(this.search().toLowerCase())));
  readonly studentResults = computed(() => summarizeStudents(this.store.results().filter(r => r.assessmentId === this.assessment()?.id && (!this.classId() || r.className === this.store.className(this.classId())) && (!this.subject() || r.subject === this.subject()) && (!this.status() || r.status === this.status()))).filter(student => `${student.student} ${student.studentNumber}`.toLowerCase().includes(this.search().trim().toLowerCase())));
  readonly subjects = computed(() => [...new Set(this.store.results().filter(r => r.assessmentId === this.assessment()?.id).map(r => r.subject))]);
  readonly classResults = computed(() => summarizeResults(this.results(), 'className'));
  readonly classResultCards = computed(() => this.store.classes().filter(c => !this.classId() || c.id === this.classId()).map(c => ({ id:c.id, name:this.store.className(c.id), summary:this.classResults().find(row => row.label === this.store.className(c.id)) })));
  readonly subjectResults = computed(() => summarizeResults(this.results(), 'subject'));
  readonly average = computed(() => this.results().length ? this.results().reduce((n, r) => n + r.mark, 0) / this.results().length : null);
  readonly passRate = computed(() => this.results().length ? this.results().filter(r => r.passed).length / this.results().length * 100 : null);
  readonly submissions = computed(() => this.assessment() ? this.store.assignments().filter(a => a.assessmentId === this.assessment()!.id) : []);
  readonly supportClasses = computed(() => [...new Set(this.store.academicData().support.map(s => s.className))].sort().map(name => ({ name, count: this.store.academicData().support.filter(s => s.className === name && `${s.student} ${s.subject} ${s.action} ${s.owner}`.toLowerCase().includes(this.search().toLowerCase())).length })));
  readonly classSupport = computed(() => this.store.academicData().support.filter(s => s.className === this.store.className(this.classId()) && this.inAssessmentTerm(s.due) && `${s.student} ${s.subject} ${s.action} ${s.owner}`.toLowerCase().includes(this.search().toLowerCase())));
  readonly classAttendance = computed(() => newestFirst(this.store.attendanceSheets().filter(s => s.classId === this.classId() && this.inAssessmentTerm(s.date) && `${s.date} ${s.teacherName || ''}`.toLowerCase().includes(this.search().toLowerCase())), s => s.date + 'T' + (s.savedAt?.slice(11) ?? '')));
  readonly classSubmissions = computed(() => newestFirst(this.submissions().filter(a => a.classId === this.classId() && `${a.teacherName} ${a.subjectName}`.toLowerCase().includes(this.search().toLowerCase())), a => a.assessmentProgress.approvedAt ?? a.assessmentProgress.submittedAt ?? a.createdAt));
  readonly classSyllabus = computed(() => this.store.academicData().syllabus.filter(t => this.store.assignments().some(a => a.id === t.assignmentId && a.classId === this.classId()) && this.inAssessmentTerm(t.due) && `${t.topic} ${this.assignmentLabel(t.assignmentId)}`.toLowerCase().includes(this.search().toLowerCase())));
  readonly classSlots = computed(() => this.store.academicData().slots.filter(s => s.className === this.store.className(this.classId()) && this.inAssessmentTerm(s.date) && `${s.subject} ${s.teacher} ${s.room} ${s.date}`.toLowerCase().includes(this.search().toLowerCase())));
  readonly progressClassCards = computed(() => this.store.classes().map(c => ({ id: c.id, name: this.store.className(c.id), attendance: this.store.attendanceSheets().filter(s => s.classId === c.id && this.inAssessmentTerm(s.date)).length, submissions: this.submissions().filter(a => a.classId === c.id).length, syllabus: this.store.academicData().syllabus.filter(t => this.store.assignments().some(a => a.id === t.assignmentId && a.classId === c.id) && this.inAssessmentTerm(t.due)).length, support: this.store.academicData().support.filter(s => s.className === this.store.className(c.id) && this.inAssessmentTerm(s.due)).length, timetable: this.store.academicData().slots.filter(s => s.className === this.store.className(c.id) && this.inAssessmentTerm(s.date)).length })));
  readonly activity = computed(() => this.store.activity().filter(a => (!this.owner() || a.owner === this.owner()) && a.message.toLowerCase().includes(this.search().toLowerCase())));
  readonly pageCount = computed(() => {
    const count = this.section() === 'finance' ? 0
      : this.section() === 'academic-results' ? this.studentResults().length
      : this.section() === 'academic-progress' ? Math.max(this.classSupport().length, this.classAttendance().length, this.classSubmissions().length, this.classSyllabus().length, this.classSlots().length)
      : this.section() === 'teaching' ? this.store.teaching().length : this.activity().length;
    return Math.max(1, Math.ceil(count / 25));
  });
  readonly from = computed(() => (this.page() - 1) * 25);
  readonly context = computed(() => `${this.api.schoolId()}:${this.store.year()?.id ?? ''}:${this.section()}`);
  constructor() {
    effect(() => {
      this.context();
      untracked(() => {
        const yearId = this.store.year()?.id;
        this.feeDialog.set(false); this.feeError.set(''); this.editor = null;
        this.term.set(''); this.classId.set(''); this.search.set(''); this.assessmentId.set(''); this.assessmentTerm.set(''); this.financeActivityPage.set(1); this.balancePage.set(1); this.feePage.set(1);
        this.subject.set(''); this.status.set('approved'); this.owner.set(''); this.page.set(1);
        if (yearId) void this.store.loadFinance(yearId);
      });
    });
    effect(() => { this.term(); this.classId(); this.search(); this.assessmentId(); this.subject(); this.status(); this.owner(); this.page.set(1); this.balancePage.set(1); this.feePage.set(1); });
    effect(() => { if (this.page() > this.pageCount()) this.page.set(this.pageCount()); });
    effect(() => {
      if (this.balancePage() > this.balancePageCount()) this.balancePage.set(this.balancePageCount());
      if (this.feePage() > this.feePageCount()) this.feePage.set(this.feePageCount());
    });
    effect(() => { if (this.financeActivityPage() > this.financeActivityPages()) this.financeActivityPage.set(this.financeActivityPages()); });
  }
  setFeePageSize(size: 10 | 20 | 50): void {
    this.feePageSize.set(size);
    this.feePage.set(1);
  }
  attendanceCounts(entries: { status: string }[]) { return ['Present', 'Late', 'Absent', 'Excused'].map(status => `${status}: ${entries.filter(e => e.status === status).length}`).join(' \u00b7 '); }
  selectClassByName(name: string): void { const cls = this.store.classes().find(c => this.store.className(c.id) === name || c.stream === name || c.name === name); if (cls) { this.classId.set(cls.id); this.search.set(''); this.page.set(1); } }
  classIdForName(name: string): string { return this.store.classes().find(c => this.store.className(c.id) === name || c.stream === name || c.name === name)?.id ?? ''; }
  money(n: number) { return 'TZS ' + n.toLocaleString('en-TZ', { maximumFractionDigits: 0 }); }
  setFeeField(field: 'classId' | 'term' | 'name' | 'amount' | 'due', value: string): void {
    this.feeForm.update(form => ({ ...form, [field]: value }));
  }
  openFee(id = ''): void {
    if (this.feeReadOnly() || this.feeBusy()) return;
    this.feeError.set('');
    this.feeId.set(id);
    this.feeClasses.set(this.classId() ? [this.classId()] : []);
    const fee = id ? this.store.finance().fees.find(item => item.id === id) : undefined;
    this.feeForm.set({ classId: this.classId(), term: this.terms()[0] ?? '', name: '', amount: '', due: new Date().toISOString().slice(0, 10) });
    if (fee) this.feeForm.set({ classId: fee.classId, term: fee.term, name: fee.name, amount: String(fee.amount), due: fee.due });
    this.feeDialog.set(true);
  }
  async saveFee(): Promise<void> {
    if (this.feeBusy() || this.feeReadOnly()) return;
    const context = this.context();
    this.feeBusy.set(true);
    const form = this.feeForm();
    const error = await this.bursar.saveFee({
      classId: form.classId,
      ...(!this.feeId() ? { classIds: this.feeClasses() } : {}),
      term: form.term,
      name: form.name,
      amount: amountValue(form.amount),
      due: form.due,
    }, this.feeId() || undefined, this.store.year()?.id);
    this.feeBusy.set(false);
    if (context !== this.context()) return;
    if (error) { this.feeError.set(error); return; }
    this.feeDialog.set(false);
    this.notice.set('Fee structure saved.');
  }
  async applyFee(id: string): Promise<void> {
    if (this.feeBusy() || this.feeReadOnly()) return;
    const context = this.context();
    this.feeBusy.set(true);
    this.feeError.set('');
    const error = await this.bursar.applyFee(id, this.store.year()?.id);
    this.feeBusy.set(false);
    if (context === this.context() && error) this.feeError.set(error);
  }
  studentName(id: string) { return this.store.accounts().find(a => a.id === id)?.name ?? 'Student'; }
  assignmentLabel(id: string) { const a = this.store.assignments().find(a => a.id === id); return a ? `${a.classStream || a.className} / ${a.subjectName}` : 'Academic assignment'; }
  readonly feeStructures = computed(() => this.store.finance().fees.filter(f => (!this.term() || f.term === this.term()) && (!this.classId() || f.classId === this.classId())));
  subjectsFor(id: string) { return this.store.mappings().filter(m => m.classId === id).map(m => m.subjectName).join(', '); }
  subjectCount(id: string) { return this.store.mappings().filter(m => m.classId === id).length; }
  export(): void {
    const finance = this.section() === 'finance';
    const headers = finance ? ['Student number', 'Student', 'Class', 'Term', 'Expected TZS', 'Collected TZS', 'Outstanding TZS', 'Overdue TZS'] : ['Student number', 'Student', 'Assessment', 'Class', 'Subject', 'Mark', 'Grade', 'Status'];
    const rows: (string | number)[][] = finance ? this.accounts().map(a => [a.number, a.name, this.store.className(a.classId), this.term() || 'All terms', a.expected, a.paid, a.balance, a.overdue]) : this.results().map(r => [r.studentNumber, r.student, this.assessment()?.name ?? '', r.className, r.subject, r.mark, r.grade, r.status]);
    const cell = (v: string | number) => { let s = String(v); if (/^[=+@\-\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    const url = URL.createObjectURL(new Blob(['\ufeff' + [headers, ...rows].map(r => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `head-${this.section()}-${this.store.year()?.label}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
