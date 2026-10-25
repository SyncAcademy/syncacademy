import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, computed, effect, ElementRef, inject, OnDestroy, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { SchoolApiService } from '../../core/services/school-api.service';
import { AcademicYearService } from '../../core/services/academic-year.service';

interface AnnouncementMedia {
  id: string;
  mimeType: string;
  byteSize: number;
  width: number;
  height: number;
  status?: 'PENDING' | 'READY' | 'FAILED' | 'CLEANING';
}

interface AnnouncementRecord {
  id: string;
  yearId: string;
  classId: string | null;
  title: string;
  body: string;
  publishedAt: string | null;
  unpublishedAt: string | null;
  createdAt: string;
  media: AnnouncementMedia | null;
}

interface PendingImageDraft {
  id: string;
  mediaUploaded: boolean;
}

type AnnouncementFilter = 'all' | 'published' | 'drafts' | 'scheduled';

@Component({
  selector: 'app-announcements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  host: { '[class.announcement-modal-open]': 'composerOpen()' },
  templateUrl: './announcements.page.html',
  styleUrls: ['./announcements.page.scss'],
})
export class AnnouncementsPage implements OnDestroy {
  readonly api = inject(SchoolApiService);
  readonly years = inject(AcademicYearService);
  private readonly http = inject(HttpClient);
  private readonly imageInput = viewChild<ElementRef<HTMLInputElement>>('imageInput');
  private requestSequence = 0;

  readonly title = signal('');
  readonly body = signal('');
  readonly classId = signal('');
  readonly imageName = signal('');
  readonly imageFile = signal<File | null>(null);
  readonly imageUrl = signal('');
  readonly error = signal('');
  readonly success = signal('');
  readonly busy = signal(false);
  readonly processingImage = signal(false);
  readonly composerOpen = signal(false);
  readonly previewOpen = signal(false);
  readonly searchTerm = signal('');
  readonly announcements = signal<AnnouncementRecord[]>([]);
  readonly loadingAnnouncements = signal(false);
  readonly announcementsError = signal('');
  readonly failedImages = signal<Set<string>>(new Set());
  readonly pendingImageDraft = signal<PendingImageDraft | null>(null);
  readonly announcementType = signal<'text' | 'image'>('image');
  readonly composerStep = signal(1);
  readonly announcementFilter = signal<AnnouncementFilter>('all');
  readonly menuAnnouncementId = signal('');
  readonly editingDraft = signal<AnnouncementRecord | null>(null);
  readonly selectedAnnouncement = signal<AnnouncementRecord | null>(null);
  readonly scheduleForLater = signal(false);
  readonly scheduledAt = signal('');

  readonly viewer = computed(() => this.api.role() === 'ACADEMIC' ? 'academic' : 'head');
  readonly year = computed(() => this.years.selected(this.viewer()));
  readonly availableYears = computed(() => this.years.available(this.viewer()));
  readonly classes = computed(() => (this.api.data()?.classes ?? [])
    .filter((item: { yearId: string; id: string; name: string }) => item.yearId === this.year()?.id)
    .map((item: { id: string; name: string }) => ({ id: item.id, name: item.name })));
  readonly announcementsForYear = computed(() => this.announcements().filter(item => !this.year() || item.yearId === this.year()!.id));
  readonly announcementCounts = computed(() => {
    const records = this.announcementsForYear();
    const isActive = (item: AnnouncementRecord) => !item.unpublishedAt;
    const isScheduled = (item: AnnouncementRecord) => isActive(item) && !!item.publishedAt && new Date(item.publishedAt).getTime() > Date.now();
    const isPublished = (item: AnnouncementRecord) => isActive(item) && !!item.publishedAt && !isScheduled(item);
    return {
      all: records.length,
      published: records.filter(isPublished).length,
      drafts: records.filter(item => !item.publishedAt && isActive(item)).length,
      scheduled: records.filter(isScheduled).length,
    };
  });
  readonly filteredAnnouncements = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase();
    return this.announcementsForYear().filter(item => {
      if (item.unpublishedAt) return this.announcementFilter() === 'all';
      const isScheduled = !!item.publishedAt && new Date(item.publishedAt).getTime() > Date.now();
      const matchesFilter = this.announcementFilter() === 'all' ||
        (this.announcementFilter() === 'published' && !!item.publishedAt && !isScheduled) ||
        (this.announcementFilter() === 'drafts' && !item.publishedAt) ||
        (this.announcementFilter() === 'scheduled' && isScheduled);
      if (!matchesFilter) return false;
      if (!query) return true;
      const year = this.yearLabel(item.yearId).toLocaleLowerCase();
      const audience = this.audienceLabel(item).toLocaleLowerCase();
      return `${item.title} ${item.body} ${year} ${audience}`.toLocaleLowerCase().includes(query);
    });
  });
  readonly canContinueToAudience = computed(() => !!this.api.schoolId() &&
    ['HEADMASTER', 'ACADEMIC'].includes(this.api.role()) &&
    this.title().trim().length >= 3 && this.title().trim().length <= 160 &&
    this.body().trim().length >= 3 && this.body().trim().length <= 5000 &&
    !this.busy() && !this.processingImage());
  readonly canContinueToPreview = computed(() => !!this.year() &&
    (!this.classId() || this.classes().some((item: { id: string }) => item.id === this.classId())) &&
    !this.busy() && !this.processingImage());
  readonly canPreview = computed(() => this.canContinueToAudience() && this.canContinueToPreview() &&
    (!this.scheduleForLater() || (!!this.scheduledAt() && new Date(this.scheduledAt()).getTime() > Date.now())));

  constructor() {
    effect(() => {
      const schoolId = this.api.schoolId();
      if (schoolId) {
        void this.loadAnnouncements(schoolId);
      } else {
        this.requestSequence++;
        this.announcements.set([]);
        this.loadingAnnouncements.set(false);
      }
    });
  }

  openComposer(): void {
    this.error.set('');
    if (!this.pendingImageDraft()) this.resetForm();
    this.selectedAnnouncement.set(null);
    this.composerStep.set(1);
    this.announcementType.set('image');
    this.composerOpen.set(true);
  }

  reloadAnnouncements(): void {
    const schoolId = this.api.schoolId();
    if (schoolId) void this.loadAnnouncements(schoolId);
  }

  closeComposer(): void {
    if (this.busy()) return;
    this.composerOpen.set(false);
    this.previewOpen.set(false);
    this.error.set('');
    this.selectedAnnouncement.set(null);
    this.composerStep.set(1);
    if (!this.pendingImageDraft()) this.resetForm();
  }

  openPreview(): void {
    if (!this.canContinueToPreview()) {
      this.error.set('Choose a valid academic year and audience before continuing.');
      return;
    }
    this.error.set('');
    this.composerStep.set(3);
  }

  backToEdit(): void {
    if (this.busy()) return;
    this.previewOpen.set(false);
    this.composerOpen.set(true);
    this.composerStep.set(1);
  }

  setComposerStep(step: number): void {
    if (step < 1 || step > 3 || this.busy()) return;
    if (step > this.composerStep() && step >= 2 && !this.canContinueToAudience()) {
      this.error.set('Enter a title and message before continuing.');
      return;
    }
    if (step === 3 && !this.canContinueToPreview()) {
      this.error.set('Choose an academic year and audience before continuing.');
      return;
    }
    this.error.set('');
    this.composerStep.set(step);
  }

  setFilter(filter: AnnouncementFilter): void {
    this.announcementFilter.set(filter);
  }

  toggleAnnouncementMenu(id: string): void {
    this.menuAnnouncementId.update(current => current === id ? '' : id);
  }

  isScheduled(item: AnnouncementRecord): boolean {
    return !item.unpublishedAt && !!item.publishedAt && new Date(item.publishedAt).getTime() > Date.now();
  }

  statusLabel(item: AnnouncementRecord): string {
    if (item.unpublishedAt) return 'Unpublished';
    if (!item.publishedAt) return 'Draft';
    return this.isScheduled(item) ? 'Scheduled' : 'Published';
  }

  statusClass(item: AnnouncementRecord): string {
    if (item.unpublishedAt) return 'status--unpublished';
    if (!item.publishedAt) return 'status--draft';
    return this.isScheduled(item) ? 'status--scheduled' : 'status--published';
  }

  minimumScheduleDate(): string {
    const date = new Date(Date.now() + 60_000);
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  categoryLabel(item: AnnouncementRecord): string {
    return item.media ? 'Image announcement' : 'Text announcement';
  }

  openAnnouncement(item: AnnouncementRecord): void {
    if (this.imageUrl()) URL.revokeObjectURL(this.imageUrl());
    this.imageUrl.set('');
    this.imageFile.set(null);
    this.imageName.set('');
    this.selectedAnnouncement.set(item);
    this.years.select(this.viewer(), item.yearId);
    this.title.set(item.title);
    this.body.set(item.body);
    this.classId.set(item.classId ?? '');
    if (item.media) {
      this.announcementType.set('image');
      this.imageName.set('Attached image');
      this.imageUrl.set(this.announcementImage(item));
    } else {
      this.announcementType.set('text');
    }
    this.composerStep.set(3);
    this.composerOpen.set(true);
  }

  editDraft(item: AnnouncementRecord): void {
    if (item.publishedAt || item.unpublishedAt) return;
    this.editingDraft.set(item);
    this.openAnnouncement(item);
    this.editingDraft.set(item);
    this.composerStep.set(1);
  }

  closeAnnouncementMenu(): void {
    this.menuAnnouncementId.set('');
  }

  async toggleAnnouncementStatus(item: AnnouncementRecord): Promise<void> {
    if (this.busy() || item.unpublishedAt) return;
    const schoolId = this.api.schoolId();
    if (!schoolId) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const { csrfToken } = await this.api.auth.request<{ csrfToken: string }>('GET', `schools/${schoolId}/parent-actions/csrf`);
      const endpoint = `schools/${schoolId}/parent-announcements/${item.id}/${item.publishedAt ? 'unpublish' : 'publish'}`;
      await this.writeAnnouncementRequest('POST', endpoint, {}, csrfToken);
      this.closeAnnouncementMenu();
      this.success.set(item.publishedAt ? 'Announcement unpublished.' : 'Draft published.');
      await this.loadAnnouncements(schoolId);
    } catch (error) {
      this.announcementsError.set(this.api.auth.error(error));
    } finally {
      this.busy.set(false);
    }
  }

  selectYear(id: string): void {
    if (this.pendingImageDraft()) return;
    this.years.select(this.viewer(), id);
    this.classId.set('');
  }

  async selectImage(event: Event): Promise<void> {
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

    this.processingImage.set(true);
    try {
      const png = await this.toUploadPng(file);
      this.imageFile.set(png);
      this.imageName.set(file.name);
      this.imageUrl.set(URL.createObjectURL(png));
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'This image could not be prepared. Choose another file.');
      input.value = '';
    } finally {
      this.processingImage.set(false);
    }
  }

  private async toUploadPng(file: File): Promise<File> {
    const bitmap = await createImageBitmap(file);
    try {
      if (bitmap.width > 4096 || bitmap.height > 4096 || bitmap.width * bitmap.height > 12_000_000) {
        throw new Error('Choose an image no larger than 4096 px per side or 12 megapixels.');
      }
      if (file.type === 'image/png') return file;

      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('This image could not be prepared. Choose another file.');
      context.drawImage(bitmap, 0, 0);
      const png = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('This image could not be prepared. Choose another file.')), 'image/png');
      });
      if (png.size > 5 * 1024 * 1024) {
        throw new Error('The converted PNG is larger than 5 MB. Choose a smaller image.');
      }
      const name = file.name.replace(/\.[^.]+$/, '') || 'announcement';
      return new File([png], `${name}.png`, { type: 'image/png', lastModified: file.lastModified });
    } finally {
      bitmap.close();
    }
  }

  clearImage(): void {
    if (this.pendingImageDraft() || this.selectedAnnouncement()?.media) return;
    if (this.imageUrl()) URL.revokeObjectURL(this.imageUrl());
    this.imageUrl.set('');
    this.imageName.set('');
    this.imageFile.set(null);
    if (this.imageInput()) this.imageInput()!.nativeElement.value = '';
  }

  announcementImage(item: AnnouncementRecord): string {
    if (!item.media || this.failedImages().has(item.id)) return '';
    return `/api/v1/schools/${this.api.schoolId()}/parent-announcements/${item.id}/media`;
  }

  markImageFailed(id: string): void {
    this.failedImages.update(failed => new Set(failed).add(id));
  }

  yearLabel(id: string): string {
    return this.years.years().find(year => year.id === id)?.label ?? 'Academic year';
  }

  audienceLabel(item: AnnouncementRecord): string {
    if (!item.classId) return 'Whole school';
    const classroom = (this.api.data()?.classes ?? []).find((entry: { id: string }) => entry.id === item.classId);
    return classroom?.name ?? 'Selected class';
  }

  selectedAudienceLabel(): string {
    if (!this.classId()) return 'Whole school';
    return this.classes().find((item: { id: string; name: string }) => item.id === this.classId())?.name ?? 'Selected class';
  }

  async saveDraft(): Promise<void> {
    this.error.set('');
    this.success.set('');
    if (!this.canContinueToAudience() || !this.canContinueToPreview()) {
      this.error.set('Choose a valid academic year, audience, title, and message before saving a draft.');
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
      const editing = this.editingDraft();
      if (editing) {
        await this.writeAnnouncementRequest('PATCH', `schools/${schoolId}/parent-announcements/${editing.id}`, {
          title: payload.title,
          body: payload.body,
        }, csrfToken);
      } else if (this.announcementType() === 'image' && this.imageFile()) {
        await this.createOrUploadImageDraft(schoolId, payload, this.imageFile()!, csrfToken);
      } else if (!this.pendingImageDraft()) {
        await this.writeAnnouncementRequest('POST', `schools/${schoolId}/parent-announcements`, {
          ...payload,
          draft: true,
        }, csrfToken);
      }
      this.success.set('Draft saved.');
      this.composerOpen.set(false);
      this.selectedAnnouncement.set(null);
      this.resetForm();
      await this.loadAnnouncements(schoolId);
    } catch (error) {
      this.error.set(this.api.auth.error(error));
    } finally {
      this.busy.set(false);
    }
  }

  async publish(): Promise<void> {
    this.error.set('');
    this.success.set('');
    if (!this.canPreview()) {
      this.error.set('Choose a valid academic year, audience, title, and message before publishing.');
      return;
    }

    const schoolId = this.api.schoolId();
    const yearId = this.year()!.id;
    const image = this.announcementType() === 'image' ? this.imageFile() : null;
    const scheduleAt = this.scheduleForLater() ? new Date(this.scheduledAt()).toISOString() : undefined;
    const payload = {
      yearId,
      ...(this.classId() ? { classId: this.classId() } : {}),
      title: this.title().trim(),
      body: this.body().trim(),
    };
    this.busy.set(true);
    try {
      const { csrfToken } = await this.api.auth.request<{ csrfToken: string }>(
        'GET',
        `schools/${schoolId}/parent-actions/csrf`,
      );
      if (schoolId !== this.api.schoolId() || yearId !== this.year()?.id) {
        this.error.set('School or academic year changed. Review the audience and try again.');
        return;
      }

      const editing = this.editingDraft();
      if (editing) {
        await this.writeAnnouncementRequest('PATCH', `schools/${schoolId}/parent-announcements/${editing.id}`, {
          title: payload.title,
          body: payload.body,
        }, csrfToken);
        await this.writeAnnouncementRequest('POST', `schools/${schoolId}/parent-announcements/${editing.id}/publish`, scheduleAt ? { scheduleAt } : {}, csrfToken);
      } else if (!image) {
        await this.writeAnnouncementRequest('POST', `schools/${schoolId}/parent-announcements`, {
          ...payload,
          ...(scheduleAt ? { scheduleAt } : {}),
        }, csrfToken);
      } else {
        await this.publishImageAnnouncement(schoolId, payload, image, csrfToken, scheduleAt);
      }

      this.success.set(scheduleAt ? 'Announcement scheduled for the selected date.' : 'Announcement published to the selected parent audience.');
      this.composerOpen.set(false);
      this.previewOpen.set(false);
      this.editingDraft.set(null);
      this.resetForm();
      await this.loadAnnouncements(schoolId);
    } catch (error) {
      this.error.set(this.api.auth.error(error));
    } finally {
      this.busy.set(false);
    }
  }

  private async publishImageAnnouncement(
    schoolId: string,
    payload: { yearId: string; classId?: string; title: string; body: string },
    image: File,
    csrfToken: string,
    scheduleAt?: string,
  ): Promise<void> {
    const draftId = await this.createOrUploadImageDraft(schoolId, payload, image, csrfToken);
    await firstValueFrom(this.http.post(
      `/api/v1/schools/${schoolId}/parent-announcements/${draftId}/publish`,
      scheduleAt ? { scheduleAt } : {},
      { headers: { 'x-csrf-token': csrfToken, 'X-Requested-With': 'SyncAcademy' }, withCredentials: true },
    ));
    this.pendingImageDraft.set(null);
  }

  private async createOrUploadImageDraft(
    schoolId: string,
    payload: { yearId: string; classId?: string; title: string; body: string },
    image: File,
    csrfToken: string,
  ): Promise<string> {
    let pending = this.pendingImageDraft();
    if (!pending) {
      const draft = await firstValueFrom(this.http.post<{ id: string }>(
        `/api/v1/schools/${schoolId}/parent-announcements`,
        { ...payload, draft: true },
        { headers: { 'x-csrf-token': csrfToken, 'X-Requested-With': 'SyncAcademy' }, withCredentials: true },
      ));
      pending = { id: draft.id, mediaUploaded: false };
      this.pendingImageDraft.set(pending);
    }

    if (!pending.mediaUploaded) {
      const details = await this.api.auth.request<AnnouncementRecord>(
        'GET',
        `schools/${schoolId}/parent-announcements/${pending.id}`,
      );
      if (details.media?.status && details.media.status !== 'READY') {
        throw new Error(details.media.status === 'PENDING'
          ? 'The image is still processing. Try again shortly.'
          : 'The previous upload is being cleaned up. Try again shortly.');
      }
      if (details.media) {
        pending = { ...pending, mediaUploaded: true };
        this.pendingImageDraft.set(pending);
      } else {
        const headers = new HttpHeaders({
          'Content-Type': 'image/png',
          'x-csrf-token': csrfToken,
          'X-Requested-With': 'SyncAcademy',
        });
        await firstValueFrom(this.http.put(
          `/api/v1/schools/${schoolId}/parent-announcements/${pending.id}/media`,
          image,
          { headers, withCredentials: true },
        ));
        pending = { ...pending, mediaUploaded: true };
        this.pendingImageDraft.set(pending);
      }
    }

    return pending.id;
  }

  private async writeAnnouncementRequest<T>(
    method: string,
    path: string,
    body: unknown,
    csrfToken: string,
  ): Promise<T> {
    return firstValueFrom(this.http.request<T>(method, `/api/v1/${path}`, {
      body,
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
        'X-Requested-With': 'SyncAcademy',
      },
      withCredentials: true,
    }));
  }

  private async loadAnnouncements(schoolId: string): Promise<void> {
    const sequence = ++this.requestSequence;
    this.loadingAnnouncements.set(true);
    this.announcementsError.set('');
    try {
      const items: AnnouncementRecord[] = [];
      let cursor: string | null = null;
      do {
        const queryString: string = cursor ? `?limit=50&cursor=${encodeURIComponent(cursor)}` : '?limit=50';
        const page: { items: AnnouncementRecord[]; nextCursor: string | null } = await this.api.auth.request<{ items: AnnouncementRecord[]; nextCursor: string | null }>(
          'GET',
          `schools/${schoolId}/parent-announcements${queryString}`,
        );
        items.push(...page.items);
        cursor = page.nextCursor;
      } while (cursor && sequence === this.requestSequence && schoolId === this.api.schoolId());
      if (sequence === this.requestSequence && schoolId === this.api.schoolId()) {
        this.announcements.set(items);
        this.failedImages.set(new Set());
      }
    } catch (error) {
      if (sequence === this.requestSequence && schoolId === this.api.schoolId()) {
        this.announcementsError.set(this.api.auth.error(error));
      }
    } finally {
      if (sequence === this.requestSequence) this.loadingAnnouncements.set(false);
    }
  }

  private resetForm(): void {
    this.title.set('');
    this.body.set('');
    this.classId.set('');
    this.pendingImageDraft.set(null);
    this.editingDraft.set(null);
    this.selectedAnnouncement.set(null);
    this.scheduleForLater.set(false);
    this.scheduledAt.set('');
    this.announcementType.set('image');
    this.clearImage();
    this.error.set('');
  }

  ngOnDestroy(): void {
    this.requestSequence++;
    if (this.imageUrl()) URL.revokeObjectURL(this.imageUrl());
  }
}
