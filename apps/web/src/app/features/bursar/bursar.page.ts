import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { HeadPageHeaderComponent } from '../headmaster/shared/head-page-header.component';
import { BursarStore, Charge, METHODS } from './bursar.store';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import { LoadingSkeletonComponent } from '../../shared/loading-skeleton.component';
import { ThousandsSeparatorDirective, amountValue } from '../../shared/directives/thousands-separator.directive';

@Component({ selector: 'app-bursar-page', standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HeadPageHeaderComponent, DialogFocusDirective, ThousandsSeparatorDirective, LoadingSkeletonComponent],
  templateUrl: './bursar.page.html', styleUrls: ['./bursar.page.scss'],
})
export class BursarPage {
  readonly store = inject(BursarStore);
  private readonly route = inject(ActivatedRoute);
  private readonly data = toSignal(this.route.data);
  private readonly queryParams = toSignal(this.route.queryParams);
  readonly section = computed(() => this.data()?.['section'] ?? 'page');
  readonly title = computed(() => this.data()?.['title'] ?? 'Overview');
  readonly terms = this.store.terms; readonly methods = METHODS;
  readonly term = signal(''); readonly classId = signal(''); readonly search = signal('');
  readonly owingOnly = signal(false); readonly dialog = signal(''); readonly detailId = signal('');
  readonly notice = signal(''); readonly error = signal(''); readonly page = signal(1);
  readonly recordPage=signal(1);
  readonly busy = signal(false);
  readonly context = computed(() => `${this.store.api.schoolId()}:${this.store.year()?.id ?? ''}:${this.section()}`);
  readonly today = new Date().toISOString().slice(0, 10);
  form: Record<string, string> = {};
  readonly selectedClasses = signal<string[]>([]);
  readonly classIdOf = (c: { id: string }) => c.id;
  toggleClass(id: string) { this.selectedClasses.update(ids => ids.includes(id) ? ids.filter(v => v !== id) : [...ids, id]); }
  readonly correctionId = signal('');
  readonly originalPayment = computed(() => this.store.payments().find(p => p.id === this.correctionId()));
  correctionReceipt(id?: string) { return this.store.payments().find(p => p.id === id)?.receipt ?? ''; }
  paymentAvailable(charge: Charge) {
    const old = this.originalPayment();
    const samePeriod = old && !old.voidAt && old.studentId === charge.studentId && old.term === charge.term;
    const periodBalance = this.store.totals(charge.studentId, charge.term).balance + (samePeriod ? old!.amount : 0);
    const feeBalance = this.store.feeRemaining(charge) + (samePeriod && old!.chargeId === charge.id ? old!.amount : 0);
    return Math.max(0, Math.min(periodBalance, feeBalance));
  }
  editPayment(id: string) {
    const payment = this.store.payments().find(p => p.id === id);
    if (!payment || payment.voidAt || this.busy() || this.store.readOnly()) return;
    this.open('payment', payment.studentId); this.correctionId.set(id);
    this.paymentChargeId.set(payment.chargeId ?? '');
    this.form = { ...this.form, studentId:payment.studentId, term:payment.term, amount:String(payment.amount), date:payment.date, method:payment.method, reference:payment.reference, reason:'' };
  }
  readonly paymentSearch = signal('');
  readonly paymentClass = signal('');
  readonly paymentPage = signal(1);
  readonly paymentStudentId = signal('');
  readonly paymentChargeId = signal('');
  readonly adjustmentClass = signal('');
  readonly adjustmentSearch = signal('');
  readonly adjustmentPage = signal(1);
  readonly adjustmentPageSize = 12;
  readonly adjustmentStudents = computed(() => this.store.accounts().filter(a => (!this.adjustmentClass() || a.classId === this.adjustmentClass()) && `${a.name} ${a.number}`.toLowerCase().includes(this.adjustmentSearch().trim().toLowerCase())).sort((a,b) => a.name.localeCompare(b.name)));
  readonly adjustmentPages = computed(() => Math.max(1, Math.ceil(this.adjustmentStudents().length / this.adjustmentPageSize)));
  readonly visibleAdjustmentStudents = computed(() => this.adjustmentStudents().slice((this.adjustmentPage() - 1) * this.adjustmentPageSize, this.adjustmentPage() * this.adjustmentPageSize));
  readonly paymentStudent = computed(() => this.store.accounts().find(a => a.id === this.paymentStudentId()));
  readonly paymentStudents = computed(() => this.store.accounts().filter(a =>
    (!this.paymentClass() || a.classId === this.paymentClass()) &&
    `${a.name} ${a.number}`.toLowerCase().includes(this.paymentSearch().trim().toLowerCase()))
    .sort((a,b) => this.store.className(a.classId).localeCompare(this.store.className(b.classId)) || a.name.localeCompare(b.name)));
  readonly paymentPages = computed(() => Math.max(1, Math.ceil(this.paymentStudents().length / 20)));
  readonly visiblePaymentStudents = computed(() => this.paymentStudents().slice((this.paymentPage()-1)*20, this.paymentPage()*20));
  readonly paymentCharges = computed(() => this.store.charges().filter(c => c.studentId === this.paymentStudentId()).sort((a,b) => a.term.localeCompare(b.term) || a.name.localeCompare(b.name)));
  readonly paymentCharge = computed(() => this.paymentCharges().find(c => c.id === this.paymentChargeId()));
  selectPaymentStudent(id: string) {
    this.paymentStudentId.set(id); this.paymentChargeId.set(''); this.form['studentId'] = id; this.form['amount'] = ''; this.error.set('');
  }
  selectPaymentCharge(id: string) {
    this.paymentChargeId.set(id); const charge = this.paymentCharge();
    this.form['term'] = charge?.term ?? ''; this.form['amount'] = ''; this.error.set('');
  }
  filterPaymentStudents(value: string, byClass = false) {
    (byClass ? this.paymentClass : this.paymentSearch).set(value); this.paymentPage.set(1);
  }
  paymentValid() {
    const charge = this.paymentCharge(), amount = amountValue(this.form['amount']);
    return !!charge && amount > 0 && amount <= this.paymentAvailable(charge);
  }
  readonly accountCharges = computed(() => this.store.charges().filter(c => c.studentId === this.detailId()).sort((a,b) => a.term.localeCompare(b.term) || a.name.localeCompare(b.name)));
  readonly accountPeriods = computed(() => [...new Set(this.accountCharges().map(c => c.term))].map(term => ({ term, ...this.store.totals(this.detailId(), term) })));

  readonly accounts = computed(() => this.store.accounts().map(a => ({ ...a, ...this.store.totals(a.id, this.term() || undefined) })).filter(a =>
    (!this.classId() || a.classId === this.classId()) && `${a.name} ${a.number}`.toLowerCase().includes(this.search().toLowerCase()) && (!this.owingOnly() || a.balance > 0)).sort((a,b) => this.store.className(a.classId).localeCompare(this.store.className(b.classId)) || a.name.localeCompare(b.name)));
  readonly classSummaries = computed(() => this.store.classes().map(c => {
    const list = this.store.accounts().filter(a => a.classId === c.id).map(a => ({ ...a, ...this.store.totals(a.id, this.term() || undefined) }));
    return { id: c.id, name: c.name, studentCount: list.length, expected: list.reduce((n,a) => n+a.expected,0), paid: list.reduce((n,a) => n+a.paid,0), balance: list.reduce((n,a) => n+a.balance,0), overdue: list.reduce((n,a) => n+a.overdue,0), paymentCount: this.store.payments().filter(p => this.store.accountClass(p.studentId) === c.id && (!this.term() || p.term === this.term())).length, adjustmentCount: this.store.adjustments().filter(a => this.store.accountClass(a.studentId) === c.id && (!this.term() || a.term === this.term())).length };
  }));
  readonly dashboardClassId = signal('');
  readonly dashboardPayments = computed(() => this.store.payments().filter(p => this.store.accountClass(p.studentId) === this.dashboardClassId()).slice().sort((a,b) => b.at.localeCompare(a.at)).slice(0,5));
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.accounts().length / 25)));
  readonly visibleAccounts = computed(() => this.accounts().slice((this.page() - 1) * 25, this.page() * 25));
  readonly fees = computed(() => this.store.fees().filter(f => (!this.term() || f.term === this.term()) && (!this.classId() || f.classId === this.classId()) && `${f.name} ${this.store.className(f.classId)}`.toLowerCase().includes(this.search().toLowerCase())));
  readonly payments = computed(() => this.store.payments().filter(p => (!this.term() || p.term === this.term()) && (!this.classId() || this.store.accountClass(p.studentId) === this.classId()) && `${p.student} ${p.number} ${p.receipt} ${p.reference} ${this.store.paymentFee(p)}`.toLowerCase().includes(this.search().toLowerCase())).slice().sort((a, b) => b.at.localeCompare(a.at)));
  readonly adjustments = computed(() => this.store.adjustments().filter(a => (!this.term() || a.term === this.term()) && (!this.classId() || this.store.accountClass(a.studentId) === this.classId()) && `${this.studentName(a.studentId)} ${a.reason} ${a.kind}`.toLowerCase().includes(this.search().toLowerCase())));
  readonly recordCount=computed(()=>this.section()==='fees'?this.fees().length:this.section()==='payments'?this.payments().length:this.adjustments().length);
  readonly recordPages=computed(()=>Math.max(1,Math.ceil(this.recordCount()/25)));
  readonly visibleFees=computed(()=>this.fees().slice((this.recordPage()-1)*25,this.recordPage()*25));
  readonly visiblePayments=computed(()=>this.payments().slice((this.recordPage()-1)*25,this.recordPage()*25));
  readonly visibleAdjustments=computed(()=>this.adjustments().slice((this.recordPage()-1)*25,this.recordPage()*25));
  readonly totals = computed(() => this.accounts().reduce((sum, a) => ({ expected: sum.expected + a.expected, paid: sum.paid + a.paid, balance: sum.balance + a.balance, overdue: sum.overdue + a.overdue }), { expected: 0, paid: 0, balance: 0, overdue: 0 }));
  readonly classReports = computed(() => [...new Set(this.accounts().map(a => a.classId))].map(id => {
    const list = this.accounts().filter(a => a.classId === id);
    return { id, name: this.store.className(id), count: list.length, expected: list.reduce((s, a) => s + a.expected, 0), paid: list.reduce((s, a) => s + a.paid, 0), balance: list.reduce((s, a) => s + a.balance, 0), overdue: list.reduce((s, a) => s + a.overdue, 0) };
  }));
  readonly account = computed(() => this.store.accounts().find(a => a.id === this.detailId()));
  readonly receipt = computed(() => this.store.payments().find(p => p.id === this.detailId()));
  readonly fee = computed(() => this.store.fees().find(f => f.id === this.detailId()));
  readonly ledger = computed(() => {
    const id = this.detailId();
    return [
      ...this.store.charges().filter(c => c.studentId === id).map(c => ({ id: c.id, at: c.at, term: c.term, description: c.name + ' (due ' + c.due + ')', debit: c.amount, credit: 0 })),
      ...this.store.adjustments().filter(a => a.studentId === id).map(a => ({ id: a.id, at: a.at, term: a.term, description: a.kind + ': ' + a.reason, debit: Math.max(0, a.amount), credit: Math.max(0, -a.amount) })),
      ...this.store.payments().filter(p => p.studentId === id).flatMap(p => [
        { id: p.id, at: p.at, term: p.term, description: 'Payment ' + p.receipt + ' - ' + this.store.paymentFee(p), debit: 0, credit: p.amount },
        ...(p.voidAt ? [{ id: p.id + '-void', at: p.voidAt, term: p.term, description: 'Receipt voided: ' + p.voidReason, debit: p.amount, credit: 0 }] : []),
      ]),
    ].sort((a, b) => b.at.localeCompare(a.at));
  });
  readonly dialogTitle = computed(() => ({ fee: this.detailId() ? 'Edit fee structure' : 'Create fee structure', apply: 'Apply fee to class', payment: this.correctionId() ? 'Edit payment' : 'Record payment', adjustment: 'Record adjustment', void: 'Void receipt', account: 'Student account statement', receipt: 'Payment receipt' } as Record<string, string>)[this.dialog()] ?? 'Accounts');

  constructor() {
    effect(() => {
      this.context();
      this.queryParams();
      untracked(() => {
        const scopedClass = ['accounts', 'payments', 'adjustments'].includes(this.section()) ? this.route.snapshot.queryParamMap.get('class') || '' : '';
        this.dialog.set(''); this.detailId.set(''); this.error.set(''); this.term.set(''); this.classId.set(scopedClass); this.search.set(''); this.owingOnly.set(false); this.notice.set('');
        const yearId = this.store.year()?.id;
        if (yearId) this.loadData(yearId);
      });
    });
    effect(() => { this.term(); this.classId(); this.search(); this.owingOnly(); this.page.set(1); });
    effect(() => {this.section();this.term();this.classId();this.search();this.recordPage.set(1);});
    effect(() => { if (this.page() > this.pageCount()) this.page.set(this.pageCount()); });
    effect(() => {if(this.recordPage()>this.recordPages())this.recordPage.set(this.recordPages());});
    effect(() => { this.adjustmentSearch(); this.adjustmentClass(); this.adjustmentPage.set(1); });
    effect(() => { if (this.adjustmentPage() > this.adjustmentPages()) this.adjustmentPage.set(this.adjustmentPages()); });
    effect(() => { this.context(); untracked(() => this.dashboardClassId.set('')); });
  }

  async loadData(yearId: string) {
    await this.store.loadYear(yearId, true);
  }

  open(mode: string, id = ''): void {
    if (this.busy() || (this.store.readOnly() && !['account', 'receipt'].includes(mode))) return;
    this.correctionId.set(''); this.detailId.set(id); this.dialog.set(mode); this.error.set('');
    this.selectedClasses.set(this.classId() ? [this.classId()] : []);
    this.form = { term: this.term() || this.terms()[0] || '', classId: this.classId(), date: this.today, method: METHODS[0], kind: 'Discount', studentId: ['payment', 'adjustment'].includes(mode) ? id : '' };
    if (mode === 'adjustment') { this.adjustmentClass.set(this.classId()); this.adjustmentSearch.set(''); this.adjustmentPage.set(1); }
    if (mode === 'payment') { this.paymentSearch.set(''); this.paymentClass.set(this.classId()); this.paymentPage.set(1); this.selectPaymentStudent(id); }
    if (mode === 'fee' && id) { const f = this.store.fees().find(f => f.id === id)!; this.form = { ...this.form, name: f.name, classId: f.classId, term: f.term, amount: String(f.amount), due: f.due }; }
  }
  close(): void { if (this.busy()) return; this.dialog.set(''); this.detailId.set(''); this.error.set(''); }

  async save(): Promise<void> {
    if (this.busy() || this.store.readOnly()) return;
    const context = this.context(), mode = this.dialog();
    if (mode === 'payment' && !this.paymentValid()) { this.error.set('Choose a student and assigned fee, then enter an installment within the available balance.'); return; }
    if (mode === 'payment' && this.correctionId() && (this.form['reason'] ?? '').trim().length < 10) { this.error.set('Explain the correction in at least 10 characters.'); return; }
    this.busy.set(true); this.error.set('');
    const f = (key: string) => this.form[key] ?? ''; let error: string | null = null;
    switch (mode) {
      case 'fee': error = await this.store.saveFee({ classId: f('classId'), ...(!this.detailId() ? { classIds: this.selectedClasses() } : {}), term: f('term'), name: f('name'), amount: amountValue(f('amount')), due: f('due') }, this.detailId() || undefined); break;
      case 'apply': error = await this.store.applyFee(this.detailId()); break;
      case 'payment': error = await this.store.recordPayment({ chargeId: this.paymentChargeId(), studentId: f('studentId'), term: f('term'), amount: amountValue(f('amount')), method: f('method'), reference: f('reference'), date: f('date'), ...(this.correctionId() ? { reason: f('reason') } : {}) }, this.correctionId() || undefined); break;
      case 'adjustment': error = await this.store.adjust({ studentId: f('studentId'), term: f('term'), amount: amountValue(f('amount')), kind: f('kind'), reason: f('reason') }); break;
      case 'void': error = await this.store.voidPayment(this.detailId(), f('reason')); break;
    }
    this.busy.set(false);
    if (context !== this.context()) return;
    if (error) { this.error.set(error); return; }
    const payment = mode === 'payment'; this.close(); this.notice.set(mode === 'fee' ? 'Fee structures saved. Use Apply on each class row to charge its students.' : 'Changes saved.');
    if (payment) {
      const lastPayment = this.store.payments().find(p => p.id === this.store.lastPaymentId());
      if(lastPayment) this.open('receipt', lastPayment.id);
    }
  }

  studentName(id: string) { return this.store.accounts().find(a => a.id === id)?.name ?? 'Student'; }
  money(value: number) { return 'TZS ' + value.toLocaleString('en-TZ', { maximumFractionDigits: 0 }); }
  print(): void { window.print(); }
  exportAccounts(): void {
    const rows = this.accounts().map(a => [a.number, a.name, this.store.className(a.classId), this.store.year()?.label ?? '', this.term() || 'All terms', a.expected, a.paid, a.balance, a.overdue]);
    this.download('student-balances', ['Student number', 'Student', 'Class', 'Academic year', 'Term', 'Expected TZS', 'Paid TZS', 'Balance TZS', 'Overdue TZS'], rows);
  }
  exportPayments(): void {
    this.download('payments', ['Receipt', 'Student number', 'Student', 'Fee', 'Term', 'Date', 'Method', 'Reference', 'Amount TZS', 'Status', 'Void reason'], this.payments().map(p => [p.receipt, p.number, p.student, this.store.paymentFee(p), p.term, p.date, p.method, p.reference, p.amount, p.voidAt ? 'Voided' : 'Recorded', p.voidReason ?? '']));
  }
  private download(name: string, headers: string[], rows: (string | number)[][]) {
    const cell = (value: string | number) => { let s = String(value); if (/^[=+@\-\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    const url = URL.createObjectURL(new Blob(['\ufeff' + [headers, ...rows].map(r => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `${name}-${this.store.year()?.label}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
