import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { LogoComponent } from '../../shared/components/logo/logo.component';

export interface SubjectResult {
  subject: string;
  mark?: number;
  grade?: string;
  remarks?: string;
}

export interface ReportData {
  status: 'VERIFIED' | 'CHALLENGE_REQUIRED';
  school?: {
    name: string;
    phone?: string;
    email?: string;
  };
  student?: {
    name: string;
    admissionNumber: string;
    gender?: string;
  };
  guardian?: {
    name: string;
  };
  academicYear?: string;
  className?: string;
  reportCard?: {
    period: string;
    results: SubjectResult[];
    noMarks: string[];
    summary?: string;
    publishedAt?: string;
  };
  expiresAt?: string;
  verificationType?: 'phone_last4' | 'otp';
  maskedDestination?: string;
  studentName?: string;
  schoolName?: string;
}

@Component({
  selector: 'sa-report-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule, LogoComponent],
  templateUrl: './report-viewer.page.html',
  styleUrls: ['./report-viewer.page.scss'],
})
export class ReportViewerPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);

  readonly token = signal<string>('');
  readonly loading = signal<boolean>(true);
  readonly submitting = signal<boolean>(false);
  readonly error = signal<string>('');
  
  // Challenge state
  readonly challengeRequired = signal<boolean>(false);
  readonly verificationType = signal<'phone_last4' | 'otp'>('phone_last4');
  readonly maskedDestination = signal<string>('');
  readonly challengeStudentName = signal<string>('');
  readonly challengeSchoolName = signal<string>('');
  challengeInput = '';

  // Verified report state
  readonly reportData = signal<ReportData | null>(null);

  ngOnInit(): void {
    const rawToken = this.route.snapshot.paramMap.get('token');
    if (!rawToken) {
      this.error.set('Kiunganishi hiki cha ripoti hakina token halali.');
      this.loading.set(false);
      return;
    }

    this.token.set(rawToken);
    this.verifyLink();
  }

  verifyLink(challengeResponse?: string, requestOtp?: boolean): void {
    this.loading.set(!challengeResponse);
    if (challengeResponse) this.submitting.set(true);
    this.error.set('');

    const payload: { token: string; challengeResponse?: string; requestOtp?: boolean } = {
      token: this.token(),
      challengeResponse,
      requestOtp,
    };

    this.http.post<ReportData>('/api/v1/public/reports/verify', payload, {
      headers: { 'X-Requested-With': 'SyncAcademy' },
    }).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.submitting.set(false);

        if (res.status === 'CHALLENGE_REQUIRED') {
          this.challengeRequired.set(true);
          this.verificationType.set(res.verificationType || 'phone_last4');
          this.maskedDestination.set(res.maskedDestination || '');
          this.challengeStudentName.set(res.studentName || 'Mwanafunzi');
          this.challengeSchoolName.set(res.schoolName || 'Shule');
        } else if (res.status === 'VERIFIED') {
          this.challengeRequired.set(false);
          this.reportData.set(res);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.submitting.set(false);
        const message = err.error?.message || 'Hitilafu imetokea. Tafadhali thibitisha kiunganishi chako au wasiliana na shule.';
        this.error.set(message);
      },
    });
  }

  submitChallenge(): void {
    if (!this.challengeInput.trim()) {
      this.error.set(
        this.verificationType() === 'phone_last4'
          ? 'Tafadhali weka tarakimu 4 za mwisho za namba yako ya simu.'
          : 'Tafadhali weka namba ya uthibitisho (OTP) uliyotumiwa.'
      );
      return;
    }
    this.verifyLink(this.challengeInput.trim());
  }

  requestOtpCode(): void {
    this.verifyLink(undefined, true);
  }

  printReport(): void {
    window.print();
  }

  getGradeClass(grade?: string): string {
    if (!grade) return '';
    const g = grade.toUpperCase();
    if (g === 'A') return 'grade-a';
    if (g === 'B') return 'grade-b';
    if (g === 'C') return 'grade-c';
    if (g === 'D') return 'grade-d';
    return 'grade-f';
  }
}
