import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { TeacherDemoStore } from '../../teacher-demo.store';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TeacherPageHeaderComponent } from '../../shared/teacher-page-header.component';
import { TeacherAssignment, TeacherDashboardStats } from '../../teacher.models';
import { MOCK_TEACHER_ASSIGNMENTS, MOCK_TEACHER_STATS } from '../../teacher-mock-data';

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TeacherPageHeaderComponent],
  templateUrl: './teacher-dashboard.page.html',
  styleUrls: ['./teacher-dashboard.page.scss'],
})
export class TeacherDashboardPage implements OnInit {
  loading = signal<boolean>(true);
  error = signal<boolean>(false);
  store = inject(TeacherDemoStore);
  stats = this.store.stats;
  assignments = this.store.assignments;
  search = signal('');
  statusFilter = signal('all');
  filteredAssignments = computed(() => this.assignments().filter(a =>
    (this.statusFilter() === 'all' || a.assessmentProgress.status === this.statusFilter()) &&
    (a.subjectName + ' ' + (a.classStream || a.className)).toLowerCase().includes(this.search().toLowerCase())
  ).sort((a,b) => Number(b.assessmentProgress.status === 'returned') - Number(a.assessmentProgress.status === 'returned')));

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(false);

    setTimeout(() => {
      try {
        // Shared demo records are retained when navigating between pages.
        this.loading.set(false);
      } catch {
        this.error.set(true);
        this.loading.set(false);
      }
    }, 500);
  }

  retry(): void {
    this.loadData();
  }

  getProgressPercent(a: TeacherAssignment): number {
    if (a.assessmentProgress.total === 0) return 0;
    return Math.round((a.assessmentProgress.completed / a.assessmentProgress.total) * 100);
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      draft: 'In Progress',
      submitted: 'Submitted',
      approved: 'Approved',
      returned: 'Returned',
    };
    return labels[status] || status;
  }

  getRosterLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Confirm Student List',
      confirmed: 'Confirmed',
      issue_reported: 'Issue Reported',
    };
    return labels[status] || status;
  }
}
