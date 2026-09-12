import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

interface User {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: string;
  roleClass: string;
  status: 'Active' | 'Suspended';
  lastLogin: string;
}

interface RoleOverview {
  name: string;
  description: string;
  iconType: string;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.scss']
})
export class UsersPage {
  activeTab = 'Users';
  tabs = ['Users', 'Roles', 'Permissions'];

  users: User[] = [
    { id: '1', name: 'Alice Johnson', email: 'alice@example.com', initials: 'AJ', role: 'Super Administrator', roleClass: 'purple', status: 'Active', lastLogin: '2 mins ago' },
    { id: '2', name: 'Bob Smith', email: 'bob@example.com', initials: 'BS', role: 'Teacher', roleClass: 'green', status: 'Active', lastLogin: '1 hour ago' },
    { id: '3', name: 'Charlie Davis', email: 'charlie@example.com', initials: 'CD', role: 'Student', roleClass: 'gray', status: 'Suspended', lastLogin: '2 weeks ago' },
    { id: '4', name: 'Diana Prince', email: 'diana@example.com', initials: 'DP', role: 'Administrator', roleClass: 'blue', status: 'Active', lastLogin: 'Just now' }
  ];

  roles: RoleOverview[] = [
    { name: 'Super Administrator', description: 'Full access to all system settings and user management.', iconType: 'shield' },
    { name: 'Teacher', description: 'Can manage classes, grades, and student records.', iconType: 'teacher' },
    { name: 'Student', description: 'Can access assigned courses and view own grades.', iconType: 'student' }
  ];
}
