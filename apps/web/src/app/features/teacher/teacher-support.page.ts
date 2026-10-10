import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AcademicDataService } from '../../core/services/academic-data.service';
import { TeacherPageHeaderComponent } from './shared/teacher-page-header.component';
import { newestFirst } from '../../shared/recent-records';

@Component({
  selector: 'app-teacher-support',
  standalone: true,
  imports: [CommonModule, FormsModule, TeacherPageHeaderComponent],
  templateUrl: './teacher-support.page.html',
  styleUrls: ['./teacher-support.page.scss'],
})
export class TeacherSupportPage {
  readonly remote = inject(AcademicDataService);
  readonly plans = computed(() => newestFirst(this.remote.data().support, (plan: any) => plan.createdAt));
  readonly pending = computed(() => this.plans().filter((plan: any) => plan.status === 'pending').length);
  readonly busyId = signal('');
  readonly error = signal('');
  readonly notice = signal('');
  reasons: Record<string, string> = {};

  async respond(id: string, decision: 'accepted' | 'rejected'): Promise<void> {
    if (this.busyId()) return;
    const reason = (this.reasons[id] ?? '').trim();
    if (decision === 'rejected' && reason.length < 10) {
      this.error.set('Explain why you cannot take this support plan in at least 10 characters.');
      return;
    }
    this.error.set(''); this.notice.set(''); this.busyId.set(id);
    const error = await this.remote.command('support-response', { id, decision, reason });
    this.busyId.set('');
    if (error) this.error.set(error);
    else { delete this.reasons[id]; this.notice.set(decision === 'accepted' ? 'Support plan accepted.' : 'Support plan rejected with your reason.'); }
  }
}
