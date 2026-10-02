import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { TeacherDemoStore } from '../../teacher-demo.store';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TeacherPageHeaderComponent } from '../../shared/teacher-page-header.component';
import { TeacherNotification } from '../../teacher.models';
import { MOCK_TEACHER_NOTIFICATIONS } from '../../teacher-mock-data';

@Component({
  selector: 'app-teacher-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule, TeacherPageHeaderComponent],
  templateUrl: './teacher-notifications.page.html',
  styleUrls: ['./teacher-notifications.page.scss'],
})
export class TeacherNotificationsPage implements OnInit {
  loading = signal<boolean>(true);
  store = inject(TeacherDemoStore);
  notifications = computed(() => [...this.store.notifications()].sort((a,b) => b.createdAt.localeCompare(a.createdAt)));
  unreadCount = this.store.unreadCount;
  ngOnInit(): void { this.loading.set(false); }
  markAsRead(id: string): void { this.store.markRead(id); }
  markAllRead(): void { this.store.markRead(); }
  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      reminder: 'M12 8v4l3 3',
      marks_approved: 'M22 11.08V12a10 10 0 1 1-5.93-9.14',
      marks_returned: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3',
      roster_issue_resolved: 'M9 12l2 2 4-4',
      system: 'M13 16h-1v-4h-1m1-4h.01',
    };
    return icons[type] || icons['system'];
  }
}
