import { CommonModule } from '@angular/common';
import { Component, computed, ElementRef, inject, OnDestroy, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SchoolApiService } from '../../core/services/school-api.service';
import { AcademicYearService } from '../../core/services/academic-year.service';

@Component({
  selector: 'app-announcements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './announcements.page.html',
  styleUrls: ['./announcements.page.scss'],
})
export class AnnouncementsPage implements OnDestroy {
  readonly api = inject(SchoolApiService);
  readonly years = inject(AcademicYearService);
  private readonly http = inject(HttpClient);
  private readonly imageInput = viewChild<ElementRef<HTMLInputElement>>('imageInput');
  readonly title = signal('');
  readonly body = signal('');
  readonly classId = signal('');
  readonly imageName = signal('');
  readonly imageUrl = signal('');
  readonly error = signal('');
  readonly success = signal('');
  readonly busy = signal(false);
  readonly preview = signal(false);
  readonly viewer = computed(() => this.api.role() === 'ACADEMIC' ? 'academic' : 'head');
  readonly year = computed(() => this.years.selected(this.viewer()));
  readonly classes = computed(() => (this.api.data()?.classes ?? [])
    .filter((item: { yearId: string }) => item.yearId === this.year()?.id)
    .map((item: { id: string; name: string }) => ({ id: item.id, name: item.name })));
  readonly canPublish = computed(() => !!this.api.schoolId() && !!this.year() &&
    ['HEADMASTER', 'ACADEMIC'].includes(this.api.role()) &&
    this.title().trim().length >= 3 && this.title().trim().length <= 160 &&
    this.body().trim().length >= 3 && this.body().trim().length <= 5000 &&
    (!this.classId() || this.classes().some(item => item.id === this.classId())) &&
    !this.imageUrl() && !this.busy());

  selectImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.clearImage();
    this.error.set('');
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      this.error.set('Choose a JPG, PNG, or WebP image under 5 MB.');
      input.value = '';
      return;
    }
    this.imageName.set(file.name);
    this.imageUrl.set(URL.createObjectURL(file));
  }

  clearImage(): void {
    if (this.imageUrl()) URL.revokeObjectURL(this.imageUrl());
    this.imageUrl.set('');
    this.imageName.set('');
    if (this.imageInput()) this.imageInput()!.nativeElement.value = '';
  }

  ngOnDestroy(): void { this.clearImage(); }

  async publish(): Promise<void> {
    this.error.set('');
    this.success.set('');
    if (this.imageUrl()) {
      this.error.set('Image publishing is unavailable until the school media service is enabled. Remove the image to publish text.');
      return;
    }
    if (!this.canPublish()) {
      this.error.set('Choose a valid audience, title, and message before publishing.');
      return;
    }
    const schoolId = this.api.schoolId();
    const yearId = this.year()!.id;
    const payload = {
      yearId,
      ...(this.classId() ? { classId: this.classId() } : {}),
      title: this.title().trim(),
      body: this.body().trim(),
    };
    this.busy.set(true);
    try {
      const { csrfToken } = await this.api.auth.request<{ csrfToken: string }>('GET', `schools/${schoolId}/parent-actions/csrf`);
      if (schoolId !== this.api.schoolId() || yearId !== this.year()?.id) {
        this.error.set('School or academic year changed. Review the audience and try again.');
        return;
      }
      await firstValueFrom(this.http.post(`/api/v1/schools/${schoolId}/parent-announcements`, payload, {
        headers: { 'x-csrf-token': csrfToken, 'X-Requested-With': 'SyncAcademy' },
      }));
      this.title.set('');
      this.body.set('');
      this.preview.set(false);
      this.success.set('Announcement published to the selected parent audience.');
    } catch (error) {
      this.error.set(this.api.auth.error(error));
    } finally {
      this.busy.set(false);
    }
  }
}
