import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-student-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './student-profile.page.html',
  styleUrls: ['./student-profile.page.scss']
})
export class StudentProfilePage {
  student = {
    name: 'Amina Juma',
    status: 'Active',
    id: 'SA-2024-0142',
    grade: 'Grade 6A',
    avatar: 'https://i.pravatar.cc/150?u=amina',
    stats: {
      attendance: '96.4%',
      academicAvg: '78.5%',
      feeBalance: '450,000'
    },
    personalInfo: {
      dob: '12 May 2012',
      gender: 'Female',
      bloodGroup: 'O+',
      enrollment: 'Jan 2024',
      address: 'Mwenge, Dar es Salaam'
    },
    parentInfo: {
      name: 'Juma Hassan',
      relationship: 'Father',
      phone: '+255 712 345 678',
      email: 'juma.hassan@email.com'
    },
    recentResults: [
      { subject: 'Math', score: 88, max: 100, grade: 'A', gradeClass: 'grade-a' },
      { subject: 'English', score: 92, max: 100, grade: 'A+', gradeClass: 'grade-aplus' },
      { subject: 'Science', score: 75, max: 100, grade: 'B', gradeClass: 'grade-b' },
      { subject: 'History', score: 65, max: 100, grade: 'C', gradeClass: 'grade-c' }
    ],
    fees: {
      paid: '1,200,000',
      outstanding: '450,000'
    }
  };

  activeTab = 'Overview';
  tabs = ['Overview', 'Academics', 'Attendance', 'Fees', 'Documents', 'Parent Info'];

  setTab(tab: string) {
    this.activeTab = tab;
  }
}
