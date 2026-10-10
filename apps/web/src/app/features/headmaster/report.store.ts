import { AcademicDataService } from '../../core/services/academic-data.service';
import { Injectable, computed, effect, signal, inject } from '@angular/core';

import { AcademicYearService } from '../../core/services/academic-year.service';
import { newestFirst } from '../../shared/recent-records';

export interface ReportRecipient {
  name: string; phone: string; verified: boolean; channel: 'WhatsApp' | 'SMS';
  status: 'not_sent' | 'sent' | 'delivered' | 'viewed' | 'failed';
  attempts: number; lastSent: string | null;
}
export interface SchoolReport {
  assessmentId?: string;
  classId?: string;
  results?: { subject: string; mark: number; grade: string }[];
  noMarks?: string[];
  academicYearId: string;
  id: string; student: string; studentNumber: string; className: string;
  createdAt?: string;
  period: string; academicApproved: boolean; status: 'generated' | 'approved' | 'released';
  recipients: ReportRecipient[];
}

export function reportAverage(results: SchoolReport['results']): number | null {
  const scores = (results ?? []).map(result => result.mark).filter(Number.isFinite);
  return scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
}

@Injectable({ providedIn: 'root' })
export class ReportStore {
  readonly storageAvailable = signal(true);
  readonly yearContext = inject(AcademicYearService);
  readonly readOnly = computed(() => this.yearContext.readOnly('head'));
  readonly remote=inject(AcademicDataService);
  private readonly allReports = computed<SchoolReport[]>(()=>this.remote.data().reports);
  readonly reports = computed(() => newestFirst(this.allReports().filter(r => r.academicYearId === this.yearContext.headYear()?.id), r => r.createdAt));
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
  forYear(yearId: string): SchoolReport[] { return this.allReports().filter(r => r.academicYearId === yearId); }
  updateRegistryContacts(..._args: unknown[]): number { return 0; }
  receiveAcademicReports(_records: SchoolReport[]): number { return 0; }
  approve(id:string){return this.remote.command('approve-report',{id});}
  eligible(_report: SchoolReport): boolean { return false; }
  send(_ids: string[], _resend = false): number { return 0; }
  private restore(): SchoolReport[] { return []; }
}
