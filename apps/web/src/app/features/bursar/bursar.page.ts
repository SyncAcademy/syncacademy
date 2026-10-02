import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { HeadPageHeaderComponent } from '../headmaster/shared/head-page-header.component';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import { BursarStore, METHODS, TERMS } from './bursar.store';

@Component({ selector: 'app-bursar-page', standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HeadPageHeaderComponent, DialogFocusDirective],
  templateUrl: './bursar.page.html', styleUrls: ['./bursar.page.scss'],
})
export class BursarPage {
  readonly store = inject(BursarStore);
  private readonly data = toSignal(inject(ActivatedRoute).data);
  readonly section = computed(() => this.data()?.['section'] ?? 'page');
  readonly title = computed(() => this.data()?.['title'] ?? 'Overview');
  readonly terms = TERMS; readonly methods = METHODS;
  readonly term = signal(''); readonly classId = signal(''); readonly search = signal('');
  readonly owingOnly = signal(false); readonly dialog = signal(''); readonly detailId = signal('');
  readonly notice = signal(''); readonly error = signal(''); readonly page = signal(1);
  readonly today = new Date().toISOString().slice(0, 10);
  form: Record<string, string> = {};
  readonly accounts = computed(() => this.store.accounts().map(a => ({ ...a, ...this.store.totals(a.id, this.term() || undefined) })).filter(a =>
    (!this.classId() || a.classId === this.classId()) && `${a.name} ${a.number}`.toLowerCase().includes(this.search().toLowerCase()) && (!this.owingOnly() || a.balance > 0)));
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.accounts().length / 25)));
  readonly visibleAccounts = computed(() => this.accounts().slice((this.page() - 1) * 25, this.page() * 25));
  readonly fees = computed(() => this.store.fees().filter(f => (!this.term() || f.term === this.term()) && (!this.classId() || f.classId === this.classId())));
  readonly payments = computed(() => this.store.payments().filter(p => (!this.term() || p.term === this.term()) && (!this.classId() || this.store.accountClass(p.studentId) === this.classId()) && `${p.student} ${p.number} ${p.receipt} ${p.reference}`.toLowerCase().includes(this.search().toLowerCase())).slice().reverse());
  readonly adjustments = computed(() => this.store.adjustments().filter(a => (!this.term() || a.term === this.term()) && (!this.classId() || this.store.accountClass(a.studentId) === this.classId())));
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
        { id: p.id, at: p.at, term: p.term, description: 'Payment ' + p.receipt, debit: 0, credit: p.amount },
        ...(p.voidAt ? [{ id: p.id + '-void', at: p.voidAt, term: p.term, description: 'Receipt voided: ' + p.voidReason, debit: p.amount, credit: 0 }] : []),
      ]),
    ].sort((a, b) => a.at.localeCompare(b.at));
  });
  readonly dialogTitle = computed(() => ({ fee: this.detailId() ? 'Edit fee structure' : 'Create fee structure', apply: 'Apply fee to class', payment: 'Record payment', adjustment: 'Record adjustment', void: 'Void receipt', account: 'Student account statement', receipt: 'Payment receipt' } as Record<string, string>)[this.dialog()] ?? 'Accounts');
  constructor() {
    effect(() => { this.section(); this.store.year()?.id; untracked(() => { this.close(); this.term.set(''); this.classId.set(''); this.search.set(''); this.owingOnly.set(false); this.notice.set(''); }); });
    effect(() => { this.term(); this.classId(); this.search(); this.owingOnly(); this.page.set(1); });
    effect(() => { if (this.page() > this.pageCount()) this.page.set(this.pageCount()); });
  }
  open(mode: string, id = ''): void {
    this.detailId.set(id); this.dialog.set(mode); this.error.set('');
    this.form = { term: this.term() || TERMS[0], classId: this.classId(), date: this.today, method: METHODS[0], kind: 'Discount', studentId: ['payment', 'adjustment'].includes(mode) ? id : '' };
    if (mode === 'fee' && id) { const f = this.store.fees().find(f => f.id === id)!; this.form = { ...this.form, name: f.name, classId: f.classId, term: f.term, amount: String(f.amount), due: f.due }; }
  }
  close(): void { this.dialog.set(''); this.detailId.set(''); this.error.set(''); }
  save(): void {
    const f = (key: string) => this.form[key] ?? ''; let error: string | null = null;
    switch (this.dialog()) {
      case 'fee': error = this.store.saveFee({ classId: f('classId'), term: f('term'), name: f('name'), amount: Number(f('amount')), due: f('due') }, this.detailId() || undefined); break;
      case 'apply': error = this.store.applyFee(this.detailId()); break;
      case 'payment': error = this.store.recordPayment({ studentId: f('studentId'), term: f('term'), amount: Number(f('amount')), method: f('method'), reference: f('reference'), date: f('date') }); break;
      case 'adjustment': error = this.store.adjust({ studentId: f('studentId'), term: f('term'), amount: Number(f('amount')), kind: f('kind'), reason: f('reason') }); break;
      case 'void': error = this.store.voidPayment(this.detailId(), f('reason')); break;
    }
    if (error) { this.error.set(error); return; }
    const payment = this.dialog() === 'payment'; this.close(); this.notice.set('Changes saved.');
    if (payment) this.open('receipt', this.store.payments().at(-1)!.id);
  }
  studentName(id: string) { return this.store.accounts().find(a => a.id === id)?.name ?? 'Student'; }
  money(value: number) { return 'TZS ' + value.toLocaleString('en-TZ', { maximumFractionDigits: 0 }); }
  print(): void { window.print(); }
  exportAccounts(): void {
    const rows = this.accounts().map(a => [a.number, a.name, this.store.className(a.classId), this.store.year()?.label ?? '', this.term() || 'All terms', a.expected, a.paid, a.balance, a.overdue]);
    this.download('student-balances', ['Student number', 'Student', 'Class', 'Academic year', 'Term', 'Expected TZS', 'Paid TZS', 'Balance TZS', 'Overdue TZS'], rows);
  }
  exportPayments(): void {
    this.download('payments', ['Receipt', 'Student number', 'Student', 'Term', 'Date', 'Method', 'Reference', 'Amount TZS', 'Status', 'Void reason'], this.payments().map(p => [p.receipt, p.number, p.student, p.term, p.date, p.method, p.reference, p.amount, p.voidAt ? 'Voided' : 'Recorded', p.voidReason ?? '']));
  }
  private download(name: string, headers: string[], rows: (string | number)[][]) {
    const cell = (value: string | number) => { let s = String(value); if (/^[=+@\-\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    const url = URL.createObjectURL(new Blob(['\ufeff' + [headers, ...rows].map(r => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `${name}-${this.store.year()?.label}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
