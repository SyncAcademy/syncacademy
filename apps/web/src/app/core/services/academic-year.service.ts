import { inject } from '@angular/core';
import { SchoolApiService } from './school-api.service';
import { Injectable, computed, effect, signal } from '@angular/core';
import { MOCK_ACADEMIC_YEARS } from '../../features/headmaster/head-mock-data';
import { AcademicYear } from '../../features/headmaster/head.models';

export type YearViewer = 'head' | 'teacher' | 'academic' | 'register' | 'bursar';

/** Browsing context only: selecting a year never changes the school's active year. */
@Injectable({ providedIn: 'root' })
export class AcademicYearService {
  private read(key:string):any { return null; }
  readonly api = inject(SchoolApiService); readonly years = signal<AcademicYear[]>([]);
  private readonly selection = signal<Partial<Record<YearViewer,string>>>({});
  readonly storageAvailable = signal(true);
  readonly bursarYear = computed(() => this.selected('bursar'));
  readonly headYear = computed(() => this.selected('head'));
  readonly registerYear = computed(() => this.selected('register'));
  readonly academicYear = computed(() => this.selected('academic'));
  readonly teacherYear = computed(() => this.selected('teacher'));

  constructor() { effect(() => { this.years.set((this.api.data()?.years || []).map((y:any)=>({id:y.id,label:y.name,startDate:y.startsAt.slice(0,10),endDate:y.endsAt.slice(0,10),status:y.closed?'closed':'active'}))); }); }
  available(viewer: YearViewer): AcademicYear[] {
    return this.years().filter(y => viewer !== 'teacher' || y.status !== 'draft');
  }
  selected(viewer: YearViewer): AcademicYear | undefined {
    const years = this.available(viewer);
    return years.find(y => y.id === this.selection()[viewer]) ?? years.find(y => y.status === 'active') ?? years[0];
  }
  select(viewer: YearViewer, id: string): void {
    if (this.available(viewer).some(y => y.id === id)) this.selection.update(s => ({ ...s, [viewer]: id }));
  }
  readOnly(viewer: YearViewer): boolean {
    const year = this.selected(viewer);
    return !year || year.status === 'closed';
  }
}
