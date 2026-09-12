import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './overview.page.html',
  styleUrls: ['./overview.page.scss']
})
export class OverviewPage {
  statCards = [
    { title: 'Total Students', value: '1,247', trend: '+4.2%', icon: '🎓' },
    { title: 'Teachers & Staff', value: '86', trend: '+1.5%', icon: '👥' },
    { title: 'Attendance Today', value: '94.2%', trend: '+0.8%', icon: '📅' },
    { title: 'New Admissions', value: '23', trend: '+12%', icon: '📝' }
  ];

  financeCards = [
    { title: 'Fees Collected', value: 'TZS 84,520,000', trend: 'On Track' },
    { title: 'Outstanding Fees', value: 'TZS 18,340,000', trend: 'Action Needed' }
  ];

  attendanceOverview = [
    { label: 'Present', percentage: 94.2, color: 'success' },
    { label: 'Late', percentage: 2.1, color: 'warning' },
    { label: 'Absent', percentage: 3.2, color: 'danger' },
    { label: 'Excused', percentage: 0.5, color: 'info' }
  ];

  recentActivity = [
    { text: 'Mid-term results published for Form 4', time: '2 hours ago', type: 'success' },
    { text: 'New syllabus uploaded for Physics', time: '4 hours ago', type: 'info' },
    { text: 'Parent meeting scheduled', time: '1 day ago', type: 'warning' }
  ];

  upcomingEvents = [
    { month: 'OCT', day: '30', title: 'Science Fair', desc: 'Annual science fair for all forms' },
    { month: 'NOV', day: '05', title: 'Teacher Training', desc: 'Pedagogy workshop' }
  ];
}
