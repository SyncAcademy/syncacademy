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
import { TERMS } from '../bursar/bursar.store';

@Component({ selector: 'app-head-oversight', standalone: true,
  imports: [SaEditorComponent,CommonModule, FormsModule, RouterLink, HeadPageHeaderComponent],
  templateUrl: './head-oversight.page.html', styleUrls: ['../academic/academic.page.scss', './head-oversight.page.scss'],
})
export class HeadOversightPage {
 pendingInvitations(){return (this.api.data()?.invitations||[]).filter((i:any)=>!i.acceptedAt&&!i.revokedAt&&new Date(i.expiresAt)>new Date()).length;}
 readonly api=inject(SchoolApiService);editor:{title:string;path:string;fields:EditorField[];key:string}|null=null;editorError='';saving=false;
 addClass(){this.editorError='';this.editor={title:'Create class',path:'classes',key:crypto.randomUUID(),fields:[{key:'name',label:'Class name',required:true},{key:'yearId',label:'Academic year',choices:(this.api.data()?.years||[]).filter((y:any)=>!y.closed).map((y:any)=>({value:y.id,label:y.name})),required:true}]};}
 assignTeacher(){this.editorError='';this.editor={title:'Assign teacher',path:'assignments',key:crypto.randomUUID(),fields:[{key:'membershipId',label:'Teacher',choices:(this.api.data()?.members||[]).filter((m:any)=>m.role==='TEACHER'&&m.active).map((m:any)=>({value:m.id,label:m.user.name})),required:true},{key:'classroomId',label:'Class',choices:(this.api.data()?.classes||[]).filter((c:any)=>!c.year.closed).map((c:any)=>({value:c.id,label:c.name+' / '+c.year.name})),required:true}]};}
 async saveRecord(values:Record<string,any>){if(!this.editor||this.saving)return;this.saving=true;this.editorError='';try{await this.api.write(this.editor.path,values,'POST',this.editor.key);this.editor=null;}catch(e){this.editorError=this.api.auth.error(e);}finally{this.saving=false;}}

  readonly store = inject(HeadOversightStore);
  private readonly data = toSignal(inject(ActivatedRoute).data);
  readonly section = computed(() => this.data()?.['section'] ?? 'overview');
  readonly title = computed(() => this.data()?.['title'] ?? 'School Overview');
  readonly term = signal(''); readonly classId = signal(''); readonly search = signal('');
  readonly assessmentId = signal(''); readonly status = signal('approved'); readonly subject = signal(''); readonly owner = signal('');
  readonly page = signal(1); readonly terms = TERMS;
  readonly activeStudents = computed(() => this.store.enrolments().filter(e => e.status === 'active').length);
  readonly pendingAdmissions = computed(() => this.store.admissions().filter(a => a.status === 'pending').length);
  readonly readyReports = computed(() => this.store.reports().filter(r => r.status !== 'released').length);
  readonly assessment = computed<Assessment | undefined>(() => this.store.academicData().assessments.find(a => a.id === this.assessmentId()) ?? this.store.academicData().assessments.find(a => a.status === 'open') ?? this.store.academicData().assessments[0]);
  readonly accounts = computed(() => this.store.accountsFor(this.term()).filter(a => (!this.classId() || a.classId === this.classId()) && `${a.name} ${a.number}`.toLowerCase().includes(this.search().toLowerCase())));
  readonly totals = computed(() => this.accounts().reduce((s, a) => ({ expected: s.expected + a.expected, paid: s.paid + a.paid, balance: s.balance + a.balance, overdue: s.overdue + a.overdue }), { expected: 0, paid: 0, balance: 0, overdue: 0 }));
  readonly classFinance = computed(() => [...new Set(this.accounts().map(a => a.classId))].map(id => {
    const list = this.accounts().filter(a => a.classId === id);
    return { id, name: this.store.className(id), expected: list.reduce((n, a) => n + a.expected, 0), paid: list.reduce((n, a) => n + a.paid, 0), balance: list.reduce((n, a) => n + a.balance, 0), overdue: list.reduce((n, a) => n + a.overdue, 0) };
  }));
  readonly payments = computed(() => this.store.finance().payments.filter(p => (!this.term() || p.term === this.term()) && (!this.classId() || this.store.accounts().find(a => a.id === p.studentId)?.classId === this.classId()) && `${p.student} ${p.number} ${p.receipt} ${p.reference}`.toLowerCase().includes(this.search().toLowerCase())).slice().reverse());
  readonly adjustments = computed(() => this.store.finance().adjustments.filter(a => (!this.term() || a.term === this.term()) && this.accounts().some(s => s.id === a.studentId)));
  readonly results = computed(() => this.store.results().filter(r => r.assessmentId === this.assessment()?.id && (!this.classId() || r.className === this.store.className(this.classId())) && (!this.subject() || r.subject === this.subject()) && (!this.status() || r.status === this.status()) && `${r.student} ${r.studentNumber}`.toLowerCase().includes(this.search().toLowerCase())));
  readonly subjects = computed(() => [...new Set(this.store.results().filter(r => r.assessmentId === this.assessment()?.id).map(r => r.subject))]);
  readonly classResults = computed(() => summarizeResults(this.results(), 'className'));
  readonly subjectResults = computed(() => summarizeResults(this.results(), 'subject'));
  readonly average = computed(() => this.results().length ? this.results().reduce((n, r) => n + r.mark, 0) / this.results().length : null);
  readonly passRate = computed(() => this.results().length ? this.results().filter(r => r.passed).length / this.results().length * 100 : null);
  readonly submissions = computed(() => this.store.assignments().filter(a => a.assessmentId === this.assessment()?.id || (!a.assessmentId && this.assessment()?.id === 'exam-2026-t2')));
  readonly activity = computed(() => this.store.activity().filter(a => (!this.owner() || a.owner === this.owner()) && a.message.toLowerCase().includes(this.search().toLowerCase())));
  readonly pageCount = computed(() => Math.max(1, Math.ceil((this.section() === 'finance' ? this.accounts().length : this.section() === 'academic-results' ? this.results().length : this.activity().length) / 25)));
  readonly from = computed(() => (this.page() - 1) * 25);
  constructor() {
    effect(() => { this.store.year()?.id; this.section(); untracked(() => { this.term.set(''); this.classId.set(''); this.search.set(''); this.assessmentId.set(''); this.subject.set(''); this.status.set('approved'); this.owner.set(''); this.page.set(1); }); });
    effect(() => { this.term(); this.classId(); this.search(); this.assessmentId(); this.subject(); this.status(); this.owner(); this.page.set(1); });
    effect(() => { if (this.page() > this.pageCount()) this.page.set(this.pageCount()); });
  }
  attendanceCounts(entries: { status: string }[]) { return ['Present', 'Late', 'Absent', 'Excused'].map(status => `${status}: ${entries.filter(e => e.status === status).length}`).join(' \u00b7 '); }
  money(n: number) { return 'TZS ' + n.toLocaleString('en-TZ', { maximumFractionDigits: 0 }); }
  studentName(id: string) { return this.store.accounts().find(a => a.id === id)?.name ?? 'Student'; }
  assignmentLabel(id: string) { const a = this.store.assignments().find(a => a.id === id); return a ? `${a.classStream || a.className} / ${a.subjectName}` : 'Academic assignment'; }
  readonly feeStructures = computed(() => this.store.finance().fees.filter(f => (!this.term() || f.term === this.term()) && (!this.classId() || f.classId === this.classId())));
  subjectsFor(id: string) { return this.store.mappings().filter(m => m.classId === id).map(m => m.subjectName).join(', '); }
  export(): void {
    const finance = this.section() === 'finance';
    const headers = finance ? ['Student number', 'Student', 'Class', 'Term', 'Expected TZS', 'Collected TZS', 'Outstanding TZS', 'Overdue TZS'] : ['Student number', 'Student', 'Assessment', 'Class', 'Subject', 'Mark', 'Grade', 'Status'];
    const rows: (string | number)[][] = finance ? this.accounts().map(a => [a.number, a.name, this.store.className(a.classId), this.term() || 'All terms', a.expected, a.paid, a.balance, a.overdue]) : this.results().map(r => [r.studentNumber, r.student, this.assessment()?.name ?? '', r.className, r.subject, r.mark, r.grade, r.status]);
    const cell = (v: string | number) => { let s = String(v); if (/^[=+@\-\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    const url = URL.createObjectURL(new Blob(['\ufeff' + [headers, ...rows].map(r => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `head-${this.section()}-${this.store.year()?.label}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
