import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParentAuthService } from '@core/services/parent-auth.service';

export interface AttendanceRecord {
  id: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  remarks?: string;
}

export interface AttendanceResponse {
  summary: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    attendanceRate: number;
  };
  records: AttendanceRecord[];
}

@Component({
  selector: 'app-parent-attendance',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="attendance-view">
      @if (loading()) {
        <div style="text-align:center;padding:40px;color:#6B7280;">Loading attendance records...</div>
      } @else if (data(); as att) {
        <div class="attendance-summary-cards">
          <div class="stat-card present">
            <span class="label">Present</span>
            <div class="value">{{ att.summary.present || 0 }}</div>
          </div>
          <div class="stat-card absent">
            <span class="label">Absent</span>
            <div class="value">{{ att.summary.absent || 0 }}</div>
          </div>
          <div class="stat-card late">
            <span class="label">Late</span>
            <div class="value">{{ att.summary.late || 0 }}</div>
          </div>
          <div class="stat-card">
            <span class="label">Rate</span>
            <div class="value">{{ att.summary.attendanceRate || 100 }}%</div>
          </div>
        </div>

        <section class="records-card">
          <h3>Daily Attendance Log</h3>
          @if (att.records.length) {
            <table class="attendance-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                @for (r of att.records; track r.id || r.date) {
                  <tr>
                    <td>{{ r.date | date:'mediumDate' }}</td>
                    <td>
                      <span class="status-badge" [ngClass]="r.status">
                        {{ r.status }}
                      </span>
                    </td>
                    <td>{{ r.remarks || '-' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          } @else {
            <div class="empty-state">No attendance records logged for this academic term yet.</div>
          }
        </section>
      } @else {
        <div class="empty-state" style="text-align:center;padding:48px;">
          <p>Attendance records are currently unavailable for this student.</p>
        </div>
      }
    </div>
  `,
  styleUrls: ['./parent-attendance.page.scss']
})
export class ParentAttendancePage {
  readonly auth = inject(ParentAuthService);
  data = signal<AttendanceResponse | null>(null);
  loading = signal(false);

  constructor() {
    effect(() => {
      const childId = this.auth.selectedChildId();
      if (childId) {
        void this.loadAttendance(childId);
      }
    });
  }

  async loadAttendance(studentId: string): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.auth.request<any>('GET', `parent/children/${studentId}/attendance`);
      if (res && res.records) {
        this.data.set(res);
      } else if (Array.isArray(res)) {
        const records = res as AttendanceRecord[];
        const present = records.filter(r => r.status === 'PRESENT').length;
        const absent = records.filter(r => r.status === 'ABSENT').length;
        const late = records.filter(r => r.status === 'LATE').length;
        const excused = records.filter(r => r.status === 'EXCUSED').length;
        const rate = records.length ? Math.round(((present + late) / records.length) * 100) : 100;
        this.data.set({
          summary: { present, absent, late, excused, attendanceRate: rate },
          records,
        });
      } else {
        this.data.set(null);
      }
    } catch {
      this.data.set(null);
    } finally {
      this.loading.set(false);
    }
  }
}
