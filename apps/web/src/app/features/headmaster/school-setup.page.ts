import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HeadPageHeaderComponent } from './shared/head-page-header.component';
import { SchoolSetupStore, SchoolSetupProfile, SetupStep } from './school-setup.store';
@Component({ selector: 'app-school-setup', standalone: true, imports: [CommonModule, FormsModule, RouterLink, HeadPageHeaderComponent], templateUrl: './school-setup.page.html', styleUrls: ['../academic/academic.page.scss', './school-setup.page.scss'] })
export class SchoolSetupPage {
  readonly store = inject(SchoolSetupStore);
  private readonly router = inject(Router);
  readonly error = signal(''); readonly notice = signal('');
  form: SchoolSetupProfile = { ...(this.store.profile() ?? { name: '', code: '', type: '', region: '', address: '', phone: '', email: '' }) };
  constructor() { effect(() => { const profile = this.store.profile(); if (profile) this.form = { ...profile }; }); }
  save(): void { this.error.set('School information editing is not available yet. No changes were saved.'); }
  open(step: SetupStep): void {
    if (step.available === false) return;
    if (!step.route) { document.getElementById('school-details-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (this.store.year()) this.store.years.select(step.viewer, this.store.year()!.id);
    void this.router.navigate([step.route], { queryParamsHandling: 'preserve' });
  }
}
