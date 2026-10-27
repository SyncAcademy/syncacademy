import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParentAuthService } from '@core/services/parent-auth.service';

export interface PublishedResultItem {
  id: string;
  title: string;
  yearName: string;
  termName: string;
  publishedAt: string;
  averageScore?: number;
  overallGrade?: string;
  classPosition?: string;
  subjects?: Array<{
    name: string;
    score: number;
    maxScore: number;
    grade: string;
    remarks?: string;
  }>;
}

@Component({
  selector: 'app-parent-results',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="results-view">
      <div class="filter-bar">
        <label style="font-size:0.875rem;font-weight:600;align-self:center;">Published Results</label>
      </div>

      @if (loading()) {
        <div style="text-align:center;padding:40px;color:#6B7280;">Loading academic results...</div>
      } @else if (results().length) {
        @for (item of results(); track item.id) {
          <article class="result-card">
            <div class="card-header">
              <div class="title-group">
                <h3>{{ item.title || (item.yearName + ' - ' + item.termName) }}</h3>
                <span class="date-text">Published on {{ item.publishedAt | date:'mediumDate' }}</span>
              </div>

              <button
                type="button"
                class="download-pdf-btn"
                [disabled]="downloadingId() === item.id"
                (click)="downloadPdf(item.id, item.title || 'report-card')"
              >
                {{ downloadingId() === item.id ? 'Downloading...' : 'Download PDF' }}
              </button>
            </div>

            @if (item.averageScore != null || item.overallGrade || item.classPosition) {
              <div class="summary-metrics">
                @if (item.averageScore != null) {
                  <div class="metric-pill">
                    <span class="metric-name">Average:</span>
                    <span class="metric-val">{{ item.averageScore }}%</span>
                  </div>
                }
                @if (item.overallGrade) {
                  <div class="metric-pill">
                    <span class="metric-name">Grade:</span>
                    <span class="metric-val">{{ item.overallGrade }}</span>
                  </div>
                }
                @if (item.classPosition) {
                  <div class="metric-pill">
                    <span class="metric-name">Position:</span>
                    <span class="metric-val">{{ item.classPosition }}</span>
                  </div>
                }
              </div>
            }

            @if (item.subjects?.length) {
              <div class="table-responsive">
                <table class="marks-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th class="num-col">Score</th>
                      <th class="num-col">Grade</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (sub of item.subjects; track sub.name) {
                      <tr>
                        <td><strong>{{ sub.name }}</strong></td>
                        <td class="num-col">{{ sub.score }} / {{ sub.maxScore || 100 }}</td>
                        <td class="num-col">{{ sub.grade }}</td>
                        <td>{{ sub.remarks || '-' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </article>
        }
      } @else {
        <div class="empty-state">
          <h3>No published reports available</h3>
          <p>Results will be displayed here as soon as approved and published by the school administration.</p>
        </div>
      }
    </div>
  `,
  styleUrls: ['./parent-results.page.scss']
})
export class ParentResultsPage {
  readonly auth = inject(ParentAuthService);
  results = signal<PublishedResultItem[]>([]);
  loading = signal(false);
  downloadingId = signal<string | null>(null);

  constructor() {
    effect(() => {
      const childId = this.auth.selectedChildId();
      if (childId) {
        void this.loadResults(childId);
      }
    });
  }

  async loadResults(studentId: string): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.auth.request<{ items: PublishedResultItem[] }>('GET', `parent/children/${studentId}/results`);
      this.results.set(res.items || (Array.isArray(res) ? res : []));
    } catch {
      this.results.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  async downloadPdf(publicationId: string, title: string): Promise<void> {
    const studentId = this.auth.selectedChildId();
    if (!studentId || this.downloadingId()) return;

    this.downloadingId.set(publicationId);
    try {
      const blob = await this.auth.requestBlob(`parent/children/${studentId}/results/${publicationId}/pdf`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      // Error handled
    } finally {
      this.downloadingId.set(null);
    }
  }
}
