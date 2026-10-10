import { inject } from '@angular/core';
import { SchoolApiService } from '../../../../core/services/school-api.service';
import { FormsModule } from '@angular/forms';
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TeacherPageHeaderComponent } from '../../shared/teacher-page-header.component';

@Component({
  selector: 'app-teacher-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, TeacherPageHeaderComponent],
  templateUrl: './teacher-profile.page.html',
  styleUrls: ['./teacher-profile.page.scss'],
})
export class TeacherProfilePage {
  readonly api=inject(SchoolApiService);get teacher(){const u=this.api.auth.identity();return {fullName:u?.name||'',email:u?.email||'',role:'Teacher',school:this.api.schoolName()};}
}
