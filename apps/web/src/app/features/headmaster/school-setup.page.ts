import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HeadPageHeaderComponent } from './shared/head-page-header.component';
import { SchoolSetupStore, SchoolSetupProfile, SetupStep } from './school-setup.store';
import { SchoolApiService } from '../../core/services/school-api.service';
@Component({ selector: 'app-school-setup', standalone: true, imports: [CommonModule, FormsModule, RouterLink, HeadPageHeaderComponent], templateUrl: './school-setup.page.html', styleUrls: ['../academic/academic.page.scss', './school-setup.page.scss'] })
export class SchoolSetupPage {
  readonly store = inject(SchoolSetupStore);
  readonly api = inject(SchoolApiService);
  private readonly router = inject(Router);
  readonly error = signal(''); readonly notice = signal('');
  form: SchoolSetupProfile = { ...(this.store.profile() ?? { name: '', code: '', region: '', schoolType:'', address:'', phone:'', email:'', website:'' }) };
  constructor() { effect(() => { const profile = this.store.profile(); if (profile) this.form = { ...profile }; }); }
  saving=false;
  async save():Promise<void>{if(this.saving)return;this.error.set('');this.notice.set('');if(this.form.name.trim().length<2||this.form.region.trim().length<2){this.error.set('Enter the school name and region.');return;}if(this.form.email.trim()&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email.trim())){this.error.set('Enter a valid school email address.');return;}this.saving=true;try{await this.api.write('profile',{name:this.form.name.trim(),region:this.form.region.trim(),schoolType:this.form.schoolType.trim(),address:this.form.address.trim(),phone:this.form.phone.trim(),email:this.form.email.trim(),website:this.form.website.trim()},'PATCH');this.notice.set('School information saved.');}catch(e){this.error.set(this.api.auth.error(e));}finally{this.saving=false;}}
  open(step: SetupStep): void {
    if (!step.route) { document.getElementById('school-details-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (this.store.year()) this.store.years.select(step.viewer, this.store.year()!.id);
    void this.router.navigate([step.route], { queryParamsHandling: 'preserve' });
  }
}
