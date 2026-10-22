import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { requestErrorMessage } from '../../core/services/request-error';

@Component({ selector: 'app-demo-request', standalone: true, imports: [CommonModule, ReactiveFormsModule, RouterLink], templateUrl: './demo-request.page.html', styleUrls: ['./demo-request.page.scss'] })
export class DemoRequestPage {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  readonly busy = signal(false);
  readonly done = signal(false);
  readonly error = signal('');
  readonly form = this.fb.group({
    schoolName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
    schoolType: ['', Validators.required], location: ['', [Validators.required, Validators.maxLength(150)]], region: ['', [Validators.required, Validators.maxLength(150)]],
    studentCount: ['', [Validators.min(0), Validators.max(1000000)]], schoolWebsite: ['', [Validators.maxLength(300), Validators.pattern(/^(|https?:\/\/[^\s]+)$/i)]],
    contactName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]], applicantPosition: ['', [Validators.required, Validators.maxLength(150)]],
    contactEmail: ['', [Validators.required, Validators.email, Validators.maxLength(254)]], contactPhone: ['', [Validators.required, Validators.pattern(/^\+?[0-9() .-]{7,40}$/)]],
    headmasterName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]], headmasterEmail: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    headmasterPhone: ['', Validators.pattern(/^(|\+?[0-9() .-]{7,40})$/)], preferredDemoMethod: [''], requestMessage: ['', Validators.maxLength(2000)],
    consent: [false, Validators.requiredTrue], websiteField: [''],
  });
  invalid(name: string): boolean { const field = this.form.get(name); return !!field && field.invalid && (field.touched || field.dirty); }
  async submit(): Promise<void> {
    if (this.busy()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.busy.set(true); this.error.set('');
    const raw = this.form.getRawValue();
    const body: Record<string, unknown> = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]));
    if (body['studentCount'] === '') delete body['studentCount']; else body['studentCount'] = Number(body['studentCount']);
    try { await firstValueFrom(this.http.post('/api/v1/demo-requests', body, { headers: { 'X-Requested-With': 'SyncAcademy' } })); this.done.set(true); }
    catch (err) { this.error.set(requestErrorMessage(err)); }
    finally { this.busy.set(false); }
  }
}
