import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ParentAuthService, ParentHomeSummary } from '@core/services/parent-auth.service';

@Component({
  selector: 'app-parent-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="home-view">
      @if (loading()) {
        <div style="text-align:center;padding:40px;color:#6B7280;">Loading child records...</div>
      } @else if (summary(); as data) {
        <div class="student-hero-card">
          <h2 class="student-name">{{ data.student.name }}</h2>
          <div class="student-meta">
            <span class="meta-tag">Adm: {{ data.student.admissionNumber }}</span>
            <span class="meta-tag">Class: {{ data.student.latestClass?.name || 'Assigned' }}</span>
            <span class="meta-tag">{{ data.student.school.name }}</span>
          </div>
        </div>

        <div class="quick-stats-grid">
          <a routerLink="/parent/results" class="stat-card">
            <span class="stat-label">Academic Results</span>
            <span class="stat-value">{{ data.resultsCount }}</span>
            <span class="stat-footnote">Published Reports</span>
          </a>

          <a routerLink="/parent/attendance" class="stat-card">
            <span class="stat-label">Recent Attendance</span>
            <span class="stat-value">{{ data.attendance?.latestStatus || 'Recorded' }}</span>
            <span class="stat-footnote">{{ data.attendance?.latestDate || 'Term active' }}</span>
          </a>

          <a routerLink="/parent/fees" class="stat-card" [class.has-balance]="(data.fees?.balance || 0) > 0">
            <span class="stat-label">Fee Balance</span>
            <span class="stat-value">TZS {{ (data.fees?.balance || 0) | number:'1.0-0' }}</span>
            <span class="stat-footnote">Total Invoiced: TZS {{ (data.fees?.totalInvoiced || 0) | number:'1.0-0' }}</span>
          </a>
        </div>

        <section class="section-block">
          <div class="section-header">
            <h2>School Announcements</h2>
            <a routerLink="/parent/announcements" class="view-all">View all</a>
          </div>

          @if (data.announcements.length) {
            @for (post of data.announcements; track post.id) {
              <div class="announcement-item">
                @if (post.media) {
                  <img
                    class="media-thumb"
                    [src]="'/api/v1/parent/announcements/' + post.id + '/media?variant=thumbnail'"
                    alt="Announcement attachment"
                  />
                }
                <div class="announcement-content">
                  <h3>{{ post.title }}</h3>
                  <p>{{ post.body }}</p>
                  <span class="post-date">{{ post.publishedAt | date:'mediumDate' }}</span>
                </div>
              </div>
            }
          } @else {
            <div class="empty-state">No announcements published for this school term yet.</div>
          }
        </section>
      } @else {
        <div class="empty-state" style="text-align:center;padding:48px;">
          <p>No active student profile found for this guardian account.</p>
        </div>
      }
    </div>
  `,
  styleUrls: ['./parent-home.page.scss']
})
export class ParentHomePage {
  readonly auth = inject(ParentAuthService);
  summary = signal<ParentHomeSummary | null>(null);
  loading = signal(false);

  constructor() {
    effect(() => {
      const childId = this.auth.selectedChildId();
      if (childId) {
        void this.loadSummary(childId);
      }
    });
  }

  async loadSummary(studentId: string): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.auth.request<ParentHomeSummary>('GET', `parent/children/${studentId}/home`);
      this.summary.set(data);
    } catch {
      this.summary.set(null);
    } finally {
      this.loading.set(false);
    }
  }
}
