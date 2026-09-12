import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss'
})
export class SettingsPage {
  settingsForm: FormGroup;
  showSuccessBanner = true; // Hardcoded to show for the requirement

  constructor(private fb: FormBuilder) {
    this.settingsForm = this.fb.group({
      // School Details
      schoolName: ['SyncAcademy International'],
      schoolCode: ['SA-001'],
      schoolType: ['Private'],
      registrationId: ['REG-12345'],
      streetAddress: ['123 Education Lane'],
      city: ['Learning City'],
      region: ['Knowledge State'],
      country: ['EduCountry'],
      phoneNumber: ['+1 234 567 8900'],
      contactEmail: ['admin@syncacademy.edu'],
      website: ['www.syncacademy.edu'],
      
      // Academic Settings
      currentAcademicYear: ['2026-2027'],
      currentTerm: ['Term 1'],
      termsPerYear: [3]
    });
  }

  saveSettings() {
    this.showSuccessBanner = true;
    setTimeout(() => {
      this.showSuccessBanner = false;
    }, 3000);
  }
}
