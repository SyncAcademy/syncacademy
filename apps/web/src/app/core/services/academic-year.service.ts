import { inject } from '@angular/core';
import { SchoolApiService } from './school-api.service';
import { Injectable, computed, effect, signal } from '@angular/core';
import { AcademicYear, AcademicTerm } from '../../features/headmaster/head.models';

export type YearViewer = 'head' | 'teacher' | 'academic' | 'register' | 'bursar';

/** Browsing context only: selecting a year never changes the school's active year. */
@Injectable({ providedIn: 'root' })
export class AcademicYearService {
  private storageKey(viewer: YearViewer): string {
    const user = this.api.auth.identity()?.id;
    const school = this.api.schoolId();
    return user && school ? `syncacademy:selected-year:${user}:${school}:${viewer}` : '';
  }
  private read(key: string): string | null {
    if (!key || typeof window === 'undefined') return null;
    try { return window.localStorage.getItem(key); }
    catch { return null; }
  }
  readonly api = inject(SchoolApiService); readonly years = signal<AcademicYear[]>([]);
  private readonly selection = signal<Record<string,string>>({});
  readonly storageAvailable = signal(true);
  readonly bursarYear = computed(() => this.selected('bursar'));
  readonly headYear = computed(() => this.selected('head'));
  readonly registerYear = computed(() => this.selected('register'));
  readonly academicYear = computed(() => this.selected('academic'));
  readonly teacherYear = computed(() => this.selected('teacher'));

  constructor() { effect(() => { this.years.set((this.api.data()?.years || []).map((y:any)=>({id:y.id,label:y.name,startDate:y.startsAt.slice(0,10),endDate:y.endsAt.slice(0,10),status:y.closed?'closed':'active',terms:y.terms || []}))); }); }
  terms(viewer: YearViewer): AcademicTerm[] { return this.selected(viewer)?.terms ?? []; }
  termName(viewer: YearViewer, key: string): string { return this.terms(viewer).find(term => term.key === key)?.name ?? key; }
  available(viewer: YearViewer): AcademicYear[] {
    return this.years().filter(y => viewer !== 'teacher' || y.status !== 'draft');
  }
  selected(viewer: YearViewer): AcademicYear | undefined {
    const years = this.available(viewer);
    const key = this.storageKey(viewer);
    return years.find(y => y.id === (this.selection()[key] ?? this.read(key))) ?? years.find(y => y.status === 'active') ?? years[0];
  }
  select(viewer: YearViewer, id: string): void {
    const key = this.storageKey(viewer);
    if (!key || !this.available(viewer).some(y => y.id === id)) return;
    this.selection.update(s => ({ ...s, [key]: id }));
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem(key, id); }
    catch { this.storageAvailable.set(false); }
  }
  readOnly(viewer: YearViewer): boolean {
    const year = this.selected(viewer);
    return !year;
  }
}
