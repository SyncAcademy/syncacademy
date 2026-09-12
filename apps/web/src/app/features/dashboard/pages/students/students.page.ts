import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Student {
  id: string;
  photo: string;
  studentId: string;
  fullName: string;
  studentClass: string;
  gender: string;
  parent: string;
  feeStatus: 'Pending' | 'Paid' | 'Overdue';
  status: 'Active' | 'Inactive';
}

@Component({
  selector: 'app-students-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './students.page.html',
  styleUrls: ['./students.page.scss']
})
export class StudentsPage {
  students: Student[] = [
    { id: '1', photo: '/assets/images/amani-juma.svg', studentId: 'STD-23-001', fullName: 'Amani Juma', studentClass: 'Grade 6', gender: 'Male', parent: 'Rashid Juma', feeStatus: 'Paid', status: 'Active' },
    { id: '2', photo: 'assets/avatars/2.jpg', studentId: 'STD-23-002', fullName: 'John Mwangi', studentClass: 'Grade 6', gender: 'Male', parent: 'Peter Mwangi', feeStatus: 'Pending', status: 'Active' },
    { id: '3', photo: 'assets/avatars/3.jpg', studentId: 'STD-23-003', fullName: 'Sarah Ochieng', studentClass: 'Grade 6', gender: 'Female', parent: 'Mary Ochieng', feeStatus: 'Overdue', status: 'Inactive' },
    { id: '4', photo: 'assets/avatars/4.jpg', studentId: 'STD-23-004', fullName: 'David Kamau', studentClass: 'Grade 6', gender: 'Male', parent: 'Alice Kamau', feeStatus: 'Paid', status: 'Active' },
    { id: '5', photo: 'assets/avatars/5.jpg', studentId: 'STD-23-005', fullName: 'Faith Mutua', studentClass: 'Grade 6', gender: 'Female', parent: 'Joseph Mutua', feeStatus: 'Pending', status: 'Active' },
    { id: '6', photo: 'assets/avatars/6.jpg', studentId: 'STD-23-006', fullName: 'Kevin Kiprono', studentClass: 'Grade 6', gender: 'Male', parent: 'Sarah Kiprono', feeStatus: 'Paid', status: 'Active' },
    { id: '7', photo: 'assets/avatars/7.jpg', studentId: 'STD-23-007', fullName: 'Joy Wanjiku', studentClass: 'Grade 6', gender: 'Female', parent: 'James Wanjiku', feeStatus: 'Overdue', status: 'Inactive' }
  ];
}
