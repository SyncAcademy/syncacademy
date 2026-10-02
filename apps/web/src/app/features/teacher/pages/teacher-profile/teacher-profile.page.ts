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
  language = signal(this.readLanguage());
  saved = signal('');
  savePreferences():void {this.saved.set('Language preferences are not available yet.');}
  private readLanguage(): string {
    try { return sessionStorage.getItem('syncacademy.teacher-language') || 'en'; } catch { return 'en'; }
  }
  readonly api=inject(SchoolApiService);get teacher(){const u=this.api.auth.identity();return {fullName:u?.name||'',email:u?.email||'',phone:'Not recorded',role:'Teacher',school:this.api.schoolName(),joinedAt:null};}
}
