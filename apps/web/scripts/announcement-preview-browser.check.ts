import 'zone.js';
import '@angular/compiler';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { AnnouncementsPage } from '../src/app/features/announcements/announcements.page';
import { SchoolApiService } from '../src/app/core/services/school-api.service';
import { AcademicYearService } from '../src/app/core/services/academic-year.service';

const passed: string[] = [];
const check = (condition: unknown, label: string) => { if (!condition) throw Error(label); passed.push(label); };
const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
const year = { id: 'year-preview', label: '2026', status: 'active' };
const school = {
  schoolId: signal('school-preview'), role: signal('ACADEMIC'), schoolName: signal('Kigoma Secondary'),
  data: signal({ classes: [] }), auth: { request: async () => ({ items: [], nextCursor: null }), error: String },
};
TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
TestBed.configureTestingModule({ imports: [AnnouncementsPage], providers: [provideHttpClient(),
  { provide: SchoolApiService, useValue: school },
  { provide: AcademicYearService, useValue: { selected: () => year, available: () => [year], years: () => [year], select: () => {} } },
] });

(async () => {
  if (location.search.includes('zoom')) document.documentElement.style.fontSize = '200%';
  const fixture = TestBed.createComponent(AnnouncementsPage);
  document.body.appendChild(fixture.nativeElement);
  fixture.detectChanges();
  await fixture.whenStable();
  const page = fixture.componentInstance;
  const title = 'Parent and teacher meeting: learning together';
  const body = ('Dear parents and guardians,\nPlease join us to discuss your child’s progress and the next academic term.\n\n').repeat(35).trim();
  const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 900;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#195b46'; context.fillRect(0, 0, 600, 900);
  context.fillStyle = '#fff'; context.font = 'bold 36px Arial'; context.fillText('School announcement', 40, 100);
  const image = canvas.toDataURL();
  for (const mode of ['details', 'composer', 'text']) {
    if (mode === 'composer') {
      page.closeComposer(); page.openComposer(); page.title.set(title); page.body.set(body); page.composerStep.set(3); page.imageUrl.set(image);
    } else {
      page.openAnnouncement({ id: 'preview', yearId: year.id, classId: null, title, body,
        publishedAt: '2026-10-26T09:00:00Z', createdAt: '2026-10-26T09:00:00Z', unpublishedAt: null, media: null });
      if (mode !== 'text') page.imageUrl.set(image);
    }
    fixture.detectChanges(); await frame();
    const root = fixture.nativeElement as HTMLElement;
    const preview = root.querySelector<HTMLElement>('.workflow-content')!;
    const post = root.querySelector<HTMLElement>('.mobile-post')!;
    const content = root.querySelector<HTMLElement>('.mobile-post-body')!;
    const heading = content.querySelector<HTMLElement>('h3')!;
    const message = content.querySelector<HTMLElement>('p')!;
    check(heading.textContent === title && message.textContent === body, `${mode}: actual title and message render`);
    check(content.getBoundingClientRect().bottom <= post.getBoundingClientRect().bottom + 1, `${mode}: post does not clip its title or message`);
    check(preview.scrollHeight > preview.clientHeight, `${mode}: long announcement has a scroll range`);
    preview.scrollTop = 0;
    const titleOffset = heading.getBoundingClientRect().top - preview.getBoundingClientRect().top;
    preview.scrollTop = titleOffset; await frame();
    const titleRect = heading.getBoundingClientRect(), previewRect = preview.getBoundingClientRect();
    check(titleRect.top >= previewRect.top - 2 && titleRect.top < previewRect.bottom, `${mode}: scrolling reaches title below image`);
    preview.scrollTop = preview.scrollHeight; await frame();
    check(content.getBoundingClientRect().bottom <= preview.getBoundingClientRect().bottom + 1, `${mode}: scrolling reaches end of message`);
    const footer = root.querySelector<HTMLElement>('.workflow-footer')!.getBoundingClientRect();
    check(footer.bottom <= innerHeight + 1 && footer.top >= 0, `${mode}: footer actions stay visible`);
    check(document.documentElement.scrollWidth <= innerWidth + 1, `${mode}: no horizontal page overflow`);
    preview.scrollTop = titleOffset; await frame();
  }
  document.body.dataset['testResult'] = JSON.stringify({ passed });
})().catch(error => document.body.dataset['testResult'] = JSON.stringify({ failed: String(error), passed }));
