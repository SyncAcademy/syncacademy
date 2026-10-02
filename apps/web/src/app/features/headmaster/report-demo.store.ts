import { Injectable, computed, effect, signal, inject } from '@angular/core';

import { AcademicYearService } from '../../core/services/academic-year.service';

export interface DemoRecipient {
  name: string; phone: string; verified: boolean; channel: 'WhatsApp' | 'SMS';
  status: 'not_sent' | 'sent' | 'delivered' | 'viewed' | 'failed';
  attempts: number; lastSent: string | null;
}
export interface DemoReport {
  assessmentId?: string;
  results?: { subject: string; mark: number; grade: string }[];
  academicYearId: string;
  id: string; student: string; studentNumber: string; className: string;
  period: string; academicApproved: boolean; status: 'generated' | 'approved' | 'released';
  recipients: DemoRecipient[];
}

@Injectable({ providedIn: 'root' })
export class ReportDemoStore {
  private key = 'syncacademy.report-demo.v1';
  readonly storageAvailable = signal(true);
  readonly yearContext = inject(AcademicYearService);
  readonly readOnly = computed(() => this.yearContext.readOnly('head'));
  private readonly allReports = signal<DemoReport[]>(this.restore());
  readonly reports = computed(() => this.allReports().filter(r => r.academicYearId === this.yearContext.headYear()?.id));
  readonly stats = computed(() => {
    const reports = this.reports(); const messages = reports.flatMap(r => r.recipients);
    return { generated: reports.length, approved: reports.filter(r => r.status !== 'generated').length,
      released: reports.filter(r => r.status === 'released').length,
      sent: messages.filter(m => m.status !== 'not_sent').length,
      delivered: messages.filter(m => ['delivered','viewed'].includes(m.status)).length,
      viewed: messages.filter(m => m.status === 'viewed').length,
      failed: messages.filter(m => m.status === 'failed').length };
  });
  constructor() {}
  forYear(yearId: string): DemoReport[] { return this.allReports().filter(r => r.academicYearId === yearId); }
  updateRegistryContacts(yearId: string, students: { studentNumber: string; contacts: { name: string; phone: string; verified: boolean }[] }[]): number {
    if (this.yearContext.registerYear()?.id !== yearId || this.yearContext.readOnly('register')) return 0;
    let updated = 0;
    this.allReports.update(list => list.map(report => {
      if (report.academicYearId !== yearId || report.status === 'released') return report;
      const student = students.find(s => s.studentNumber === report.studentNumber);
      if (!student) return report;
      const recipients: DemoRecipient[] = student.contacts.map(g => ({ ...g, channel: 'SMS', status: 'not_sent', attempts: 0, lastSent: null }));
      if (JSON.stringify(report.recipients) === JSON.stringify(recipients)) return report;
      updated++;
      return { ...report, recipients };
    }));
    return updated;
  }
  receiveAcademicReports(records: DemoReport[]): number {
    const year = this.yearContext.academicYear();
    if (!year || this.yearContext.readOnly('academic')) return 0;
    const additions = records.filter(r => r.academicYearId === year.id && r.academicApproved &&
      r.results?.length && !this.allReports().some(existing => existing.id === r.id));
    this.allReports.update(list => [...additions.map(r => ({ ...r, status: 'generated' as const })), ...list]);
    return additions.length;
  }
  approve(id: string): void {
    if (this.readOnly() || !this.reports().some(r => r.id === id)) return;
    this.allReports.update(list => list.map(r => r.id === id && r.academicApproved && r.status === 'generated' ? { ...r, status: 'approved' } : r));
  }
  eligible(report: DemoReport): boolean {
    return !this.readOnly() && report.academicYearId === this.yearContext.headYear()?.id && report.academicApproved && report.status !== 'generated' && report.recipients.some(g => g.verified && ['not_sent','failed'].includes(g.status));
  }
  send(ids: string[], resend = false): number {
    if (this.readOnly()) return 0;
    ids = ids.filter(id => this.reports().some(r => r.id === id));
    let count = 0;
    this.allReports.update(list => list.map(r => {
      if (!ids.includes(r.id) || !r.academicApproved || r.status === 'generated') return r;
      let changed = false;
      const recipients = r.recipients.map(g => {
        if (!g.verified || (!resend && !['not_sent','failed'].includes(g.status))) return g;
        count++; changed = true;
        return { ...g, status: 'sent' as const, attempts: g.attempts + 1, lastSent: new Date().toISOString() };
      });
      return changed ? { ...r, status: 'released' as const, recipients } : r;
    }));
    return count;
  }
  private restore():DemoReport[]{return [];}
}
