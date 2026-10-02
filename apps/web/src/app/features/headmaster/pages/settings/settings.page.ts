import { effect } from '@angular/core';
import { SchoolApiService } from '../../../../core/services/school-api.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss'
})
export class SettingsPage {
  readonly isHeadSettings = inject(ActivatedRoute).snapshot.data['breadcrumb'] === 'Headmaster / Settings';
  settingsForm: FormGroup;
  showSuccessBanner=false; readonly api=inject(SchoolApiService); // Hardcoded to show for the requirement

  constructor(private fb:FormBuilder){this.settingsForm=this.fb.group({schoolName:[''],schoolCode:[''],schoolType:[''],registrationId:[''],streetAddress:[''],city:[''],region:[''],country:[''],phoneNumber:[''],contactEmail:[''],website:[''],currentAcademicYear:[''],currentTerm:[''],termsPerYear:[null]});this.settingsForm.disable();effect(()=>{const s=this.api.data()?.school;this.settingsForm.patchValue({schoolName:s?.name||'',schoolCode:s?.code||'',region:s?.region||''});});}

  saveSettings(){this.api.error.set('School preference editing is not available yet.');}
}
