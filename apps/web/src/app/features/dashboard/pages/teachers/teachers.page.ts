import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Teacher {
  id: string;
  name: string;
  avatarUrl?: string;
  department: string;
  status: 'Active' | 'On Leave';
  subjects: string[];
  phone: string;
  email: string;
}

@Component({
  selector: 'app-teachers',
  templateUrl: './teachers.page.html',
  styleUrls: ['./teachers.page.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class TeachersPage implements OnInit {
  teachers: Teacher[] = [
    {
      id: '1',
      name: 'Sarah Jenkins',
      department: 'Science',
      status: 'Active',
      subjects: ['Biology', 'Chemistry'],
      phone: '(555) 123-4567',
      email: 's.jenkins@school.edu'
    },
    {
      id: '2',
      name: 'Michael Chang',
      department: 'Mathematics',
      status: 'Active',
      subjects: ['Algebra', 'Calculus'],
      phone: '(555) 234-5678',
      email: 'm.chang@school.edu'
    },
    {
      id: '3',
      name: 'Elena Rodriguez',
      department: 'Languages',
      status: 'On Leave',
      subjects: ['Spanish I', 'Spanish II'],
      phone: '(555) 345-6789',
      email: 'e.rodriguez@school.edu'
    },
    {
      id: '4',
      name: 'David Smith',
      department: 'Humanities',
      status: 'Active',
      subjects: ['World History', 'Geography'],
      phone: '(555) 456-7890',
      email: 'd.smith@school.edu'
    },
    {
      id: '5',
      name: 'Jessica Taylor',
      department: 'Arts',
      status: 'Active',
      subjects: ['Studio Art', 'Art History'],
      phone: '(555) 567-8901',
      email: 'j.taylor@school.edu'
    },
    {
      id: '6',
      name: 'Robert Wilson',
      department: 'Physical Education',
      status: 'Active',
      subjects: ['Physical Ed', 'Health'],
      phone: '(555) 678-9012',
      email: 'r.wilson@school.edu'
    }
  ];

  constructor() { }

  ngOnInit(): void {
  }
}
