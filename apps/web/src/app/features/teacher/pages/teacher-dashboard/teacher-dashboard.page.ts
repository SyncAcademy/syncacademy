import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { TeacherStore } from '../../teacher.store';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TeacherPageHeaderComponent } from '../../shared/teacher-page-header.component';
import { TeacherAssignment, TeacherDashboardStats } from '../../teacher.models';
@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TeacherPageHeaderComponent],
  templateUrl: './teacher-dashboard.page.html',
  styleUrls: ['./teacher-dashboard.page.scss'],
})
export class TeacherDashboardPage implements OnInit {
  loading = computed(()=>this.store.api.loading() || this.store.remote.loading());
  error = computed(()=>!!this.store.api.error() || !!this.store.remote.error());
  store = inject(TeacherStore);
  stats = this.store.stats;
  assignments = this.store.assignments;
  search = signal('');
  statusFilter = signal('all');
  page=signal(1);
  filteredAssignments = computed(() => this.assignments().filter(a =>
    (this.statusFilter() === 'all' || a.assessmentProgress.status === this.statusFilter()) &&
    (a.subjectName + ' ' + (a.classStream || a.className)).toLowerCase().includes(this.search().toLowerCase())
  ).sort((a,b) => Number(b.assessmentProgress.status === 'returned') - Number(a.assessmentProgress.status === 'returned')));
  pages=computed(()=>Math.max(1,Math.ceil(this.filteredAssignments().length/25)));
  visibleAssignments=computed(()=>this.filteredAssignments().slice((this.page()-1)*25,this.page()*25));

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {if(!this.store.remote.hasData())void this.store.remote.load();}

  retry(): void {
    void this.store.remote.load();
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
