import { AcademicDataService } from './academic-data.service';
import { Injectable, effect, inject, signal } from '@angular/core';
import { AcademicYearService } from './academic-year.service';

export interface GradeBand { label: string; minimum: number; }
export interface GradingPolicy { revision: number; passMark: number; bands: GradeBand[]; }
export const DEFAULT_GRADING: GradingPolicy = { revision: 1, passMark: 35, bands: [
  { label: 'A', minimum: 80 }, { label: 'B', minimum: 65 }, { label: 'C', minimum: 50 }, { label: 'D', minimum: 35 }, { label: 'F', minimum: 0 },
] };
export function gradeWithPolicy(mark: number | null, policy: GradingPolicy): string | null {
  if (mark === null || !Number.isFinite(mark) || mark < 0 || mark > 100) return null;
  return policy.bands.find(b => mark >= b.minimum)?.label ?? null;
}
@Injectable({ providedIn: 'root' })
export class GradingPolicyService {
  private readonly years = inject(AcademicYearService);
  private readonly policies = signal<Record<string, GradingPolicy>>(this.restore());
  readonly storageAvailable = signal(true);
  readonly remote=inject(AcademicDataService);
  constructor() {}
  forYear(yearId:string):GradingPolicy {return this.remote.year()?.id===yearId ? this.remote.data().policy ?? DEFAULT_GRADING : DEFAULT_GRADING;}
  save(bands:GradeBand[],passMark:number):Promise<string|null>{return this.remote.command('grading',{bands,passMark});}
  private restore():Record<string,GradingPolicy>{return {};}
}
