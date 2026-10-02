import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { AcademicYearService } from '../../core/services/academic-year.service';
import { RegistrarStore } from '../registrar/registrar.store';

export interface Fee { id: string; yearId: string; classId: string; term: string; name: string; amount: number; due: string; }
export interface Charge { id: string; yearId: string; feeId: string; studentId: string; student: string; number: string; classId: string; term: string; name: string; amount: number; due: string; at: string; }
export interface Payment { id: string; yearId: string; studentId: string; student: string; number: string; className: string; term: string; amount: number; method: string; reference: string; date: string; receipt: string; at: string; voidReason?: string; voidAt?: string; }
export interface Adjustment { id: string; yearId: string; studentId: string; term: string; amount: number; kind: string; reason: string; at: string; }
interface FinanceState { fees: Fee[]; charges: Charge[]; payments: Payment[]; adjustments: Adjustment[]; }
export const TERMS = ['Term 1', 'Term 2', 'Term 3'];
export const METHODS = ['Cash', 'Bank transfer', 'Mobile money'];

@Injectable({ providedIn: 'root' })
export class BursarStore {
  readonly years = inject(AcademicYearService);
  readonly registry = inject(RegistrarStore);
  readonly year = this.years.bursarYear;
  readonly readOnly = computed(() => this.years.readOnly('bursar'));
  readonly storageAvailable = signal(true);
  private readonly state = signal<FinanceState>(this.restore());
  readonly classes = computed(() => this.registry.classesFor(this.year()?.id ?? ''));
  readonly enrolments = computed(() => this.registry.enrolmentsFor(this.year()?.id ?? ''));
  readonly fees = computed(() => this.state().fees.filter(f => f.yearId === this.year()?.id));
  readonly charges = computed(() => this.state().charges.filter(f => f.yearId === this.year()?.id));
  readonly payments = computed(() => this.state().payments.filter(f => f.yearId === this.year()?.id));
  readonly adjustments = computed(() => this.state().adjustments.filter(f => f.yearId === this.year()?.id));
  readonly accounts = computed(() => this.accountsFor(this.year()?.id ?? ''));
  forYear(yearId: string) {
    const s = this.state();
    return { fees: s.fees.filter(r => r.yearId === yearId), charges: s.charges.filter(r => r.yearId === yearId), payments: s.payments.filter(r => r.yearId === yearId), adjustments: s.adjustments.filter(r => r.yearId === yearId) };
  }
  accountsFor(yearId: string, term?: string) {
    const { charges } = this.forYear(yearId); const enrolments = this.registry.enrolmentsFor(yearId);
    const ids = new Set([...enrolments.map(e => e.studentId), ...charges.map(c => c.studentId)]);
    return [...ids].map(id => { const student = this.registry.student(id); const charge = charges.find(c => c.studentId === id); const enrolment = enrolments.find(e => e.studentId === id);
      return { id, name: enrolment?.studentName ?? charge?.student ?? student?.name ?? 'Student', number: charge?.number ?? student?.number ?? '', classId: enrolment?.classId ?? charge?.classId ?? '', ...this.totals(id, term, yearId) };
    });
  }
  readonly summary = computed(() => this.totals());
  readonly attentionCount = computed(() => this.accounts().filter(a => a.balance > 0).length);
  constructor() {}
  private restore():FinanceState{return {fees:[],charges:[],payments:[],adjustments:[]};}
  private id() { return crypto.randomUUID(); }
  private blocked() { return this.readOnly() ? 'This academic year is read-only.' : null; }
  private money(value: number) { return Number.isSafeInteger(value) && value > 0 && value <= 1_000_000_000; }
  private validDate(value: string) { const timestamp = Date.parse(value); return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value; }
  accountClass(id: string) { return this.enrolments().find(e => e.studentId === id)?.classId ?? this.charges().find(c => c.studentId === id)?.classId ?? ''; }
  className(id: string) { return this.registry.className(id); }
  totals(studentId?: string, term?: string, yearId = this.year()?.id ?? '') {
    const records = this.forYear(yearId);
    const match = (r: { studentId: string; term: string }) => (!studentId || r.studentId === studentId) && (!term || r.term === term);
    const charged = records.charges.filter(match).reduce((n, r) => n + r.amount, 0);
    const adjustments = records.adjustments.filter(match).reduce((n, r) => n + r.amount, 0);
    const paid = records.payments.filter(r => !r.voidAt && match(r)).reduce((n, r) => n + r.amount, 0);
    // Allocate credits and payments to oldest dues within each student/term account.
    const today = new Date().toISOString().slice(0, 10);
    const ids = [...new Set(records.charges.filter(match).map(c => c.studentId))];
    const overdue = ids.reduce((sum, id) => sum + (term ? [term] : TERMS).reduce((subtotal, t) => {
      const due = records.charges.filter(c => c.studentId === id && c.term === t && c.due < today).reduce((n, c) => n + c.amount, 0);
      const adjustment = records.adjustments.filter(a => a.studentId === id && a.term === t).reduce((n, a) => n + a.amount, 0);
      const received = records.payments.filter(p => p.studentId === id && p.term === t && !p.voidAt).reduce((n, p) => n + p.amount, 0);
      return subtotal + Math.max(0, due + adjustment - received);
    }, 0), 0);
    return { charged, adjustments, expected: charged + adjustments, paid, balance: charged + adjustments - paid, overdue };
  }
  used(feeId: string) { return this.charges().some(c => c.feeId === feeId); }
  eligible(fee: Fee) { return this.enrolments().filter(e => e.classId === fee.classId && e.status === 'active' && !this.charges().some(c => c.feeId === fee.id && c.studentId === e.studentId)); }
  saveFee(input: Omit<Fee, 'id' | 'yearId'>, id?: string): string | null {
    const blocked = this.blocked(); if (blocked) return blocked;
    if (id && (!this.fees().some(f => f.id === id) || this.used(id))) return 'Applied fee structures are locked. Record a reasoned adjustment to correct a student account.';
    if (!this.classes().some(c => c.id === input.classId) || !TERMS.includes(input.term) || !input.name.trim() || !this.money(input.amount) || !this.validDate(input.due) || input.due < this.year()!.startDate || input.due > this.year()!.endDate) return 'Choose a class, term, fee name, positive whole TZS amount, and due date within the selected year.';
    if (this.fees().some(f => f.id !== id && f.classId === input.classId && f.term === input.term && f.name.toLowerCase() === input.name.trim().toLowerCase())) return 'This class already has a fee with that name for the term.';
    const fee: Fee = { ...input, name: input.name.trim(), id: id ?? this.id(), yearId: this.year()!.id };
    this.state.update(s => ({ ...s, fees: id ? s.fees.map(f => f.id === id ? fee : f) : [...s.fees, fee] })); return null;
  }
  applyFee(id: string): string | null {
    const blocked = this.blocked(); if (blocked) return blocked;
    const fee = this.fees().find(f => f.id === id); if (!fee) return 'Fee not found in this academic year.';
    const eligible = this.eligible(fee); if (!eligible.length) return 'No uncharged active students in this class.';
    const charges: Charge[] = eligible.map(e => ({ id: this.id(), yearId: fee.yearId, feeId: id, studentId: e.studentId, student: e.studentName, number: this.registry.student(e.studentId)!.number, classId: fee.classId, term: fee.term, name: fee.name, amount: fee.amount, due: fee.due, at: new Date().toISOString() }));
    this.state.update(s => ({ ...s, charges: [...s.charges, ...charges] })); return null;
  }
  recordPayment(input: { studentId: string; term: string; amount: number; method: string; reference: string; date: string }): string | null {
    const blocked = this.blocked(); if (blocked) return blocked;
    const account = this.accounts().find(a => a.id === input.studentId);
    if (!account || !TERMS.includes(input.term) || !METHODS.includes(input.method) || !this.money(input.amount) || !this.validDate(input.date) || input.date > new Date().toISOString().slice(0, 10) || input.date < this.year()!.startDate || input.date > this.year()!.endDate) return 'Choose a student, term, payment method, positive whole TZS amount, and a non-future date within this academic year.';
    if (input.amount > this.totals(input.studentId, input.term).balance) return 'Payment exceeds the outstanding balance for this term.';
    const reference = input.reference.trim();
    if (input.method !== 'Cash' && !reference) return 'Enter the bank or mobile-money transaction reference.';
    if (reference && this.state().payments.some(p => p.reference.toLowerCase() === reference.toLowerCase() && !p.voidAt)) return 'That transaction reference is already recorded.';
    const payment: Payment = { ...input, reference, id: this.id(), yearId: this.year()!.id, student: account.name, number: account.number, className: this.className(account.classId), receipt: `SA-${this.year()!.label}-${String(this.state().payments.length + 1).padStart(6, '0')}`, at: new Date().toISOString() };
    this.state.update(s => ({ ...s, payments: [...s.payments, payment] })); return null;
  }
  voidPayment(id: string, reason: string): string | null {
    const blocked = this.blocked(); if (blocked) return blocked;
    if (!this.payments().some(p => p.id === id && !p.voidAt) || reason.trim().length < 10) return 'Choose an active receipt and provide a correction reason of at least 10 characters.';
    this.state.update(s => ({ ...s, payments: s.payments.map(p => p.id === id ? { ...p, voidReason: reason.trim(), voidAt: new Date().toISOString() } : p) })); return null;
  }
  adjust(input: { studentId: string; term: string; amount: number; kind: string; reason: string }): string | null {
    const blocked = this.blocked(); if (blocked) return blocked;
    if (!this.accounts().some(a => a.id === input.studentId) || !TERMS.includes(input.term) || !this.money(input.amount) || !['Discount', 'Scholarship', 'Credit correction', 'Debit correction'].includes(input.kind) || input.reason.trim().length < 10) return 'Choose a student, term, adjustment type, positive whole TZS amount, and a reason of at least 10 characters.';
    if (!this.charges().some(c => c.studentId === input.studentId && c.term === input.term)) return 'Apply a fee before adjusting this term account.';
    const amount = input.kind === 'Debit correction' ? input.amount : -input.amount;
    if (this.totals(input.studentId, input.term).balance + amount < 0) return 'This credit exceeds the remaining term balance.';
    this.state.update(s => ({ ...s, adjustments: [...s.adjustments, { ...input, amount, reason: input.reason.trim(), id: this.id(), yearId: this.year()!.id, at: new Date().toISOString() }] })); return null;
  }
}
