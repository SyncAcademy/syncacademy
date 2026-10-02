import { HeadDemoStore } from '../../head-demo.store';
import { ReportDemoStore } from '../../report-demo.store';
import { TeacherDemoStore } from '../../../teacher/teacher-demo.store';
import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeadPageHeaderComponent } from '../../shared/head-page-header.component';
import { DashboardStats } from '../../head.models';
import { MOCK_DASHBOARD_STATS } from '../../head-mock-data';

@Component({
  selector: 'app-head-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, HeadPageHeaderComponent],
  templateUrl: './head-dashboard.page.html',
  styleUrls: ['./head-dashboard.page.scss'],
})
export class HeadDashboardPage implements OnInit {
  loading = signal<boolean>(true);
  error = signal<boolean>(false);
  store = inject(HeadDemoStore);
  reports = inject(ReportDemoStore);
  teacherDemo = inject(TeacherDemoStore);
  currentYear = computed(() => this.store.selectedYear()?.label ?? 'No academic year');
  stats = computed<DashboardStats>(() => ({ ...MOCK_DASHBOARD_STATS,
    activeStudents: this.store.yearClasses().reduce((sum,c) => sum + c.studentCount, 0),
    staffCount: this.store.staff().filter(s => s.status === 'active').length,
    verifiedGuardians: this.reports.reports().flatMap(r => r.recipients).filter(g => g.verified).length,
    pendingSubmissions: this.teacherDemo.state().assignments.filter(a => a.academicYearId === this.store.selectedYear()?.id && a.assessmentProgress.status === 'submitted').length,
    pendingStaffApprovals: this.store.pending().length,
    reportsReadyForRelease: this.reports.reports().filter(r => r.status === 'approved').length,
    reportsSent: this.reports.stats().sent, reportsDelivered: this.reports.stats().delivered,
    reportsViewed: this.reports.stats().viewed, failedMessages: this.reports.stats().failed,
  }));

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.loading.set(true);
    this.error.set(false);

    setTimeout(() => {
      try {
        // Metrics are derived from the shared demo records.
        this.loading.set(false);
      } catch {
        this.error.set(true);
        this.loading.set(false);
      }
    }, 500);
  }

  retry(): void {
    this.loadStats();
  }
}
