import { Component, signal } from '@angular/core';
import { NgFor } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem {
  title: string;
  route: string;
  icon?: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [NgFor, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  selectedCampus = signal('Dar es Salaam Campus');

  navSections: NavSection[] = [
    {
      label: 'DASHBOARD',
      items: [
        { title: 'Overview', route: '/dashboard/overview' }
      ]
    },
    {
      label: 'STUDENTS',
      items: [
        { title: 'All Students', route: '/dashboard/students' },
        { title: 'Student Attendance', route: '/dashboard/attendance' }
      ]
    },
    {
      label: 'ACADEMICS',
      items: [
        { title: 'Classes & Subjects', route: '/dashboard/classes' },
        { title: 'Gradebook', route: '/dashboard/gradebook' }
      ]
    },
    {
      label: 'TEACHERS & STAFF',
      items: [
        { title: 'Teachers Directory', route: '/dashboard/teachers' }
      ]
    },
    {
      label: 'SCHOOL OFFICE',
      items: [
        { title: 'Finance', route: '/dashboard/finance' },
        { title: 'Communication', route: '/dashboard/communication' },
        { title: 'Reports', route: '/dashboard/reports' }
      ]
    },
    {
      label: 'ADMINISTRATION',
      items: [
        { title: 'Users & Roles', route: '/dashboard/users' },
        { title: 'School Settings', route: '/dashboard/settings' }
      ]
    }
  ];
}
