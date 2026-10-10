import { Injectable, computed, inject } from '@angular/core';
import { AcademicDataService } from '../../core/services/academic-data.service';
import { HeadStore } from '../../features/headmaster/head.store';
import { ReportStore } from '../../features/headmaster/report.store';
import { RegistrarStore } from '../../features/registrar/registrar.store';
import { BursarStore } from '../../features/bursar/bursar.store';
import { SuperAdminStore } from '../../features/super-admin/super-admin.store';

export type NotificationAudience = 'academic' | 'head' | 'teacher' | 'register' | 'bursar' | 'super-admin';
export interface NotificationItem {
  id: string;
  title: string;
  detail: string;
  route: string;
  createdAt?: string;
  read: boolean;
  persistent: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationCenterService {
  private readonly academic = inject(AcademicDataService);
  private readonly head = inject(HeadStore);
  private readonly reports = inject(ReportStore);
  private readonly registrar = inject(RegistrarStore);
  private readonly bursar = inject(BursarStore);
  private readonly admin = inject(SuperAdminStore);

  private academicItems(audience: 'academic' | 'head' | 'teacher'): NotificationItem[] {
    const base = audience === 'head' ? '/head' : audience === 'teacher' ? '/teacher' : '/academic';
    return (this.academic.data().notifications ?? []).map((entry: any) => ({
      id: entry.id,
      title: ({ support_response: 'Student support response', support_assigned: 'Student support assigned', marks_approved: 'Marks approved', marks_returned: 'Marks returned', roster_issue_resolved: 'Roster issue resolved' } as Record<string, string>)[entry.type] ?? 'Academic update',
      detail: entry.message,
      route: entry.relatedSupportId ? (audience === 'teacher' ? '/teacher/support' : audience === 'head' ? '/head/notifications' : '/academic/interventions') : entry.relatedAssignmentId ? (audience === 'teacher' ? `/teacher/${entry.relatedAssignmentId}/${entry.type === 'roster_issue_resolved' ? 'roster' : 'status'}` : audience === 'head' ? '/head/academic-results' : '/academic/marks-review') : `${base}/notifications`,
      createdAt: entry.createdAt,
      read: !!entry.read,
      persistent: true,
    }));
  }

  private attention(id: string, title: string, detail: string, route: string): NotificationItem {
    return { id, title, detail, route, read: false, persistent: false };
  }

  readonly academicNotifications = computed(() => [
    ...this.academicItems('academic'),
    ...((this.academic.data().submissions ?? []).filter((submission: any) => submission.assessmentProgress?.status === 'submitted').length ? [this.attention('academic-marks-review', 'Marks awaiting review', `${(this.academic.data().submissions ?? []).filter((submission: any) => submission.assessmentProgress?.status === 'submitted').length} subject submissions need a decision`, '/academic/marks-review')] : []),
    ...(this.registrar.openIssues() ? [this.attention('academic-roster-issues', 'Roster issues', `${this.registrar.openIssues()} student roster issues need review`, '/academic/roster-issues')] : []),
  ]);
  readonly headNotifications = computed(() => [
    ...this.academicItems('head'),
    ...(this.head.invitations().filter(i => i.status === 'active' && Date.parse(i.expiresAt) > Date.now()).length ? [this.attention('head-invitations', 'Pending staff invitations', `${this.head.invitations().filter(i => i.status === 'active' && Date.parse(i.expiresAt) > Date.now()).length} invitations awaiting acceptance`, '/head/staff/pending')] : []),
    ...(this.reports.reports().filter(r => r.status === 'generated').length ? [this.attention('head-reports', 'Reports awaiting review', `${this.reports.reports().filter(r => r.status === 'generated').length} student reports need review`, '/head/reports')] : []),
  ]);
  readonly teacherNotifications = computed(() => this.academicItems('teacher'));
  readonly registrarNotifications = computed(() => [
    ...(this.registrar.openIssues() ? [this.attention('registrar-issues', 'Roster issues', `${this.registrar.openIssues()} student roster corrections need review`, '/register/roster-issues')] : []),
    ...(this.registrar.pending().length ? [this.attention('registrar-admissions', 'Pending admissions', `${this.registrar.pending().length} admissions need review`, '/register/admissions')] : []),
    ...(this.registrar.unassigned().length ? [this.attention('registrar-unassigned', 'Students without a class', `${this.registrar.unassigned().length} students need enrolment`, '/register/enrolment')] : []),
  ]);
  readonly bursarNotifications = computed(() => this.bursar.accounts().filter(account => account.balance > 0).map(account => this.attention(`balance-${account.id}`, 'Outstanding balance', `${account.name} has an outstanding balance`, '/bursar/page')));
  readonly adminNotifications = computed(() => this.admin.attention().map(item => this.attention(`admin-${item.id}`, item.title, item.detail, item.route)));

  items(audience: NotificationAudience): NotificationItem[] {
    const list = ({ academic: this.academicNotifications, head: this.headNotifications, teacher: this.teacherNotifications, register: this.registrarNotifications, bursar: this.bursarNotifications, 'super-admin': this.adminNotifications })[audience]();
    return [...list].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  }
  unread(audience: NotificationAudience): number { return this.items(audience).filter(item => !item.read).length; }
  async markRead(id?: string): Promise<string | null> { return this.academic.command('read-notifications', id ? { id } : {}); }
}
