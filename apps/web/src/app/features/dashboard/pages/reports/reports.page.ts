import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'sa-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.page.html',
  styleUrls: ['./reports.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsPage {
  selectedYear = '2025/2026';
  selectedTerm = 'All Terms';
  selectedClass = 'Secondary Campus';

  summaryIndicators = [
    { metric: 'Total Student Enrollment', status: '1,245 Students', target: '1,200', performance: 'Exceeded', performanceClass: 'perf-exceeded' },
    { metric: 'Average Daily Attendance', status: '94.2%', target: '> 92%', performance: 'Exceeded', performanceClass: 'perf-exceeded' },
    { metric: 'Fee Collection Rate', status: '78.5%', target: '85%', performance: 'Under Target', performanceClass: 'perf-under' },
    { metric: 'Active Teacher-Student Ratio', status: '1:32', target: '1:30', performance: 'Acceptable', performanceClass: 'perf-acceptable' },
    { metric: 'Termly Pass Rate', status: '68%', target: '70%', performance: 'Under Target', performanceClass: 'perf-under' },
  ];

  enrollmentData = [
    { year: '2020', value: 800, height: '40%' },
    { year: '2021', value: 850, height: '45%' },
    { year: '2022', value: 920, height: '55%' },
    { year: '2023', value: 1000, height: '65%' },
    { year: '2024', value: 1100, height: '75%' },
    { year: '2025', value: 1200, height: '85%' },
    { year: '2026', value: 1245, height: '90%' }
  ];
  
  attendanceData = [
    { grade: 'Form 1', value: 96, height: '96%' },
    { grade: 'Form 2', value: 93, height: '93%' },
    { grade: 'Form 3', value: 95, height: '95%' },
    { grade: 'Form 4', value: 91, height: '91%' }
  ];

  feeData = [
    { label: 'Term 1', collection: '80%', target: '100%' },
    { label: 'Term 2', collection: '75%', target: '100%' },
    { label: 'Term 3', collection: '60%', target: '100%' }
  ];
}
