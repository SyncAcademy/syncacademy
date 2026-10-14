import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AcademicYearService } from '../../core/services/academic-year.service';
import { RegistrarStore } from '../registrar/registrar.store';
import { SchoolApiService } from '../../core/services/school-api.service';

export interface Fee { id: string; yearId: string; classId: string; term: string; name: string; amount: number; due: string; locked?: boolean; }
export interface Charge { id: string; yearId: string; feeId: string; studentId: string; student: string; number: string; classId: string; term: string; name: string; amount: number; due: string; at: string; }
export interface Payment { replacesId?: string; chargeId?: string; id: string; yearId: string; studentId: string; student: string; number: string; className: string; term: string; amount: number; method: string; reference: string; date: string; receipt: string; at: string; voidReason?: string; voidAt?: string; }
export interface Adjustment { id: string; yearId: string; studentId: string; term: string; amount: number; kind: string; reason: string; at: string; }

interface FinanceRecords {
  fees: Fee[];
  charges: Charge[];
  payments: Payment[];
  adjustments: Adjustment[];
}

const emptyRecords = (): FinanceRecords => ({ fees: [], charges: [], payments: [], adjustments: [] });
export const METHODS = ['Cash', 'Bank transfer', 'Mobile money'];

@Injectable({ providedIn: 'root' })
export class BursarStore {
  readonly api = inject(SchoolApiService);
  readonly years = inject(AcademicYearService);
  readonly registry = inject(RegistrarStore);
  private readonly recordsByYear = signal<Record<string, FinanceRecords>>({});
  private readonly loadedYears = new Set<string>();
  private readonly loadingYears = new Map<string, Promise<void>>();
  readonly loadError = signal('');

  readonly year = computed(() => this.api.role() === 'REGISTRAR' ? this.years.registerYear() : this.years.bursarYear());
  readonly terms = computed(() => [...(this.year()?.terms.map(term => term.key) ?? []), 'Full year']);
  termName(key: string): string { return this.year()?.terms.find(term => term.key === key)?.name ?? key; }
  readonly readOnly = computed(() => this.years.readOnly(this.api.role() === 'REGISTRAR' ? 'register' : 'bursar'));
  readonly classes = computed(() => this.registry.classesFor(this.year()?.id ?? ''));
  readonly enrolments = computed(() => this.registry.enrolmentsFor(this.year()?.id ?? ''));
  private readonly currentRecords = computed(() => this.forYear(this.year()?.id ?? ''));
  readonly hasCurrentYearData = computed(() => !!this.recordsByYear()[this.cacheKey(this.year()?.id ?? '')]);

  readonly fees = computed(() => this.currentRecords().fees);
  readonly charges = computed(() => this.currentRecords().charges);
  readonly payments = computed(() => this.currentRecords().payments);
  readonly adjustments = computed(() => this.currentRecords().adjustments);
  readonly accounts = computed(() => this.accountsFor(this.year()?.id ?? ''));
  readonly summary = computed(() => this.totals());
  readonly attentionCount = computed(() => this.accounts().filter(a => a.balance > 0).length);

  private context() { return `${this.api.auth.identity()?.id}:${this.api.role()}:${this.api.schoolId()}`; }
  private cacheKey(yearId: string) { return `${this.context()}:${yearId}`; }
  readonly loading = signal(false);
  readonly lastPaymentId = signal('');

  constructor() {
    effect(()=>{
      const notice=this.api.schoolRevisionNotice?.();
      if(!notice)return;
      untracked(()=>{
        const role=this.api.role();
        if(!['HEADMASTER','BURSAR','REGISTRAR'].includes(role))return;
        const yearId=(role==='HEADMASTER'?this.years.headYear():this.year())?.id;
        const reload=!!yearId&&(this.loadedYears.has(this.cacheKey(yearId))||this.loadingYears.has(this.cacheKey(yearId)));
        const prefix=this.context()+':';
        for(const key of this.loadedYears)if(key.startsWith(prefix))this.loadedYears.delete(key);
        if(yearId&&reload)void this.loadYear(yearId,true);
      });
    });
  }

  forYear(yearId: string): FinanceRecords {
    return this.recordsByYear()[this.cacheKey(yearId)] ?? emptyRecords();
  }

  async loadYear(yearId: string, force = false): Promise<void> {
    const schoolId = this.api.schoolId();
    if (!schoolId || !yearId) {
      this.loadError.set('Select a school and academic year to load finance records.');
      return;
    }

    const context = this.context();
    const cacheKey = this.cacheKey(yearId);
    if (!force && this.loadedYears.has(cacheKey)) return;
    const activeRequest = this.loadingYears.get(cacheKey);
    if (activeRequest) { await activeRequest; if (!force || context !== this.context()) return; }

    this.loadError.set('');
    this.loading.set(true);
    const query = new URLSearchParams({ yearId }).toString();
    const request = (async () => {
      try {
        const [rawFees, rawLedger] = await Promise.all([
          this.api.auth.request('GET', `schools/${schoolId}/finance/fees?${query}`),
          this.api.auth.request('GET', `schools/${schoolId}/finance/ledger?${query}`),
        ]);
        const records: FinanceRecords = {
          fees: rawFees.map((fee: any) => ({
            id: fee.id,
            yearId: fee.yearId,
            classId: fee.classroomId,
            term: fee.term,
            name: fee.name,
            amount: fee.amount,
            due: String(fee.dueDate).slice(0, 10),
            locked: fee.locked,
          })),
          charges: rawLedger.charges.map((charge: any) => ({
            id: charge.id,
            yearId: charge.yearId,
            feeId: charge.feeId,
            studentId: charge.studentId,
            student: charge.student.name,
            number: charge.student.admissionNumber,
            classId: charge.classroomId,
            term: charge.term,
            name: charge.name,
            amount: charge.amount,
            due: String(charge.dueDate).slice(0, 10),
            at: charge.createdAt,
          })),
          payments: rawLedger.payments.map((payment: any) => ({
            id: payment.id,
            chargeId: payment.chargeId ?? undefined,
            replacesId: payment.replacesId ?? undefined,
            yearId: payment.yearId,
            studentId: payment.studentId,
            student: payment.student.name,
            number: payment.student.admissionNumber,
            className: this.registry.className(this.classIdForStudent(payment.studentId, yearId)),
            term: payment.term,
            amount: payment.amount,
            method: payment.method,
            reference: payment.reference,
            date: String(payment.date).slice(0, 10),
            receipt: payment.receipt,
            at: payment.createdAt,
            voidReason: payment.voidReason ?? undefined,
            voidAt: payment.voidAt ?? undefined,
          })),
          adjustments: rawLedger.adjustments.map((adjustment: any) => ({
            id: adjustment.id,
            yearId: adjustment.yearId,
            studentId: adjustment.studentId,
            term: adjustment.term,
            amount: adjustment.amount,
            kind: adjustment.kind,
            reason: adjustment.reason,
            at: adjustment.createdAt,
          })),
        };
        if (context !== this.context()) return;
        this.recordsByYear.update(cache => ({ ...cache, [cacheKey]: records }));
        this.loadedYears.add(cacheKey);
      } catch (error) {
        if (context === this.context()) this.loadError.set(this.api.auth.error(error));
      } finally {
        this.loadingYears.delete(cacheKey);
        if (context === this.context()) this.loading.set(false);
      }
    })();
    this.loadingYears.set(cacheKey, request);
    return request;
  }

  private classIdForStudent(studentId: string, yearId: string): string {
    return this.registry.enrolmentsFor(yearId).find(enrolment => enrolment.studentId === studentId)?.classId ?? '';
  }

  accountsFor(yearId: string, term?: string) {
    const { charges } = this.forYear(yearId);
    const enrolments = this.registry.enrolmentsFor(yearId);
    const ids = new Set([...enrolments.map(e => e.studentId), ...charges.map(c => c.studentId)]);
    return [...ids].map(id => {
      const student = this.registry.student(id);
      const charge = charges.find(c => c.studentId === id);
      const enrolment = enrolments.find(e => e.studentId === id);
      return {
        id,
        name: enrolment?.studentName ?? charge?.student ?? student?.name ?? 'Student',
        number: charge?.number ?? student?.number ?? '',
        classId: enrolment?.classId ?? charge?.classId ?? '',
        ...this.totals(id, term, yearId),
      };
    });
  }

  accountClass(id: string) {
    return this.enrolments().find(e => e.studentId === id)?.classId ?? this.charges().find(c => c.studentId === id)?.classId ?? '';
  }

  className(id: string) { return this.registry.className(id); }

  totals(studentId?: string, term?: string, yearId = this.year()?.id ?? '') {
    const records = this.forYear(yearId);
    const match = (record: { studentId: string; term: string }) =>
      (!studentId || record.studentId === studentId) && (!term || record.term === term);
    const charged = records.charges.filter(match).reduce((sum, record) => sum + record.amount, 0);
    const adjustments = records.adjustments.filter(match).reduce((sum, record) => sum + record.amount, 0);
    const paid = records.payments.filter(record => !record.voidAt && match(record)).reduce((sum, record) => sum + record.amount, 0);
    const today = new Date().toISOString().slice(0, 10);
    const studentIds = [...new Set(records.charges.filter(match).map(charge => charge.studentId))];
    const overdue = studentIds.reduce((sum, id) => sum + (term ? [term] : [...new Set(records.charges.map(c => c.term))]).reduce((subtotal, currentTerm) => {
      const termCharges = records.charges.filter(charge => charge.studentId === id && charge.term === currentTerm);
      const dueCharges = termCharges.filter(charge => charge.due < today);
      const due = dueCharges.reduce((total, charge) => total + charge.amount, 0);
      const adjustment = records.adjustments
        .filter(item => item.studentId === id && item.term === currentTerm)
        .reduce((total, item) => total + item.amount, 0);
      const received = records.payments
        .filter(payment => payment.studentId === id && payment.term === currentTerm && !payment.voidAt)
        .reduce((total, payment) => total + payment.amount, 0);
      const receivedForDue = records.payments.filter(p => p.studentId === id && p.term === currentTerm && !p.voidAt && (!p.chargeId || dueCharges.some(c => c.id === p.chargeId))).reduce((total, p) => total + p.amount, 0);
      const balance = termCharges.reduce((total, c) => total + c.amount, 0) + adjustment - received;
      return subtotal + (due > 0 ? Math.max(0, Math.min(balance, due + adjustment - receivedForDue)) : 0);
    }, 0), 0);
    return { charged, adjustments, expected: charged + adjustments, paid, balance: charged + adjustments - paid, overdue };
  }

  feePaid(chargeId: string) { return this.payments().filter(p => p.chargeId === chargeId && !p.voidAt).reduce((s, p) => s + p.amount, 0); }
  feeRemaining(charge: Charge) { return Math.max(0, charge.amount - this.feePaid(charge.id)); }
  payable(charge: Charge) { return Math.max(0, Math.min(this.feeRemaining(charge), this.totals(charge.studentId, charge.term).balance)); }
  paymentFee(payment: Payment) { return this.charges().find(c => c.id === payment.chargeId)?.name ?? 'Unallocated period payment'; }

  async loadFees(yearId: string) { await this.loadYear(yearId); }
  async loadAccounts(yearId: string) { await this.loadYear(yearId); }
  async loadPayments(yearId: string) { await this.loadYear(yearId); }
  async loadAdjustments(yearId: string) { await this.loadYear(yearId); }
  async loadReports(yearId: string) { await this.loadYear(yearId); }

  async saveFee(input: Omit<Fee, 'id' | 'yearId'> & { classIds?: string[] }, id?: string, targetYearId = this.year()?.id): Promise<string | null> {
    const context = this.context();
    const yearId = targetYearId;
    if (!yearId) return 'Select an academic year before saving a fee.';
    const payload = {
      ...(!id ? input.classIds ? { classroomIds: input.classIds } : { classroomId: input.classId } : {}),
      term: input.term,
      name: input.name,
      amount: input.amount,
      dueDate: input.due,
      ...(!id ? { yearId } : {}),
    };
    try {
      if (id) await this.api.write(`finance/fees/${id}`, payload, 'PATCH');
      else await this.api.write('finance/fees', payload);
      if (context === this.context()) await this.loadYear(yearId, true);
      return null;
    } catch (error) { return this.api.auth.error(error); }
  }

  async applyFee(id: string, targetYearId = this.year()?.id): Promise<string | null> {
    const context = this.context();
    const yearId = targetYearId;
    if (!yearId) return 'Select an academic year before applying a fee.';
    try {
      await this.api.write(`finance/fees/${id}/apply`, {});
      if (context === this.context()) await this.loadYear(yearId, true);
      return null;
    } catch (error) { return this.api.auth.error(error); }
  }

  async recordPayment(input: { chargeId?: string; studentId: string; term: string; amount: number; method: string; reference: string; date: string; reason?: string }, originalId?: string): Promise<string | null> {
    const context = this.context();
    const yearId = this.year()?.id;
    if (!yearId) return 'Select an academic year before recording a payment.';
    try {
      this.lastPaymentId.set('');
      const saved = await this.api.write(originalId ? `finance/payments/${originalId}/correct` : 'finance/payments', { ...input, yearId });
      this.lastPaymentId.set(saved.id);
      if (context === this.context()) await this.loadYear(yearId, true);
      return null;
    } catch (error) { return this.api.auth.error(error); }
  }

  async voidPayment(id: string, reason: string): Promise<string | null> {
    const context = this.context();
    const yearId = this.year()?.id;
    if (!yearId) return 'Select an academic year before voiding a payment.';
    try {
      await this.api.write(`finance/payments/${id}/void`, { reason });
      if (context === this.context()) await this.loadYear(yearId, true);
      return null;
    } catch (error) { return this.api.auth.error(error); }
  }

  async adjust(input: { studentId: string; term: string; amount: number; kind: string; reason: string }): Promise<string | null> {
    const context = this.context();
    const yearId = this.year()?.id;
    if (!yearId) return 'Select an academic year before recording an adjustment.';
    try {
      await this.api.write('finance/adjustments', { ...input, yearId });
      if (context === this.context()) await this.loadYear(yearId, true);
      return null;
    } catch (error) { return this.api.auth.error(error); }
  }
}
