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
  constructor() {}
  forYear(yearId: string): GradingPolicy { return this.policies()[yearId] ?? DEFAULT_GRADING; }
  save(bands: GradeBand[], passMark: number): string | null {
    const year = this.years.academicYear();
    if (!year || this.years.readOnly('academic')) return 'The academic year is read-only.';
    const clean = bands.map(b => ({ label: b.label.trim(), minimum: Number(b.minimum) }));
    if (clean.length < 2 || clean.some(b => !b.label || b.label.length > 12 || !Number.isFinite(b.minimum) || b.minimum < 0 || b.minimum > 100) ||
      new Set(clean.map(b => b.label.toLowerCase())).size !== clean.length || clean.at(-1)?.minimum !== 0 ||
      clean.some((b, i) => i > 0 && b.minimum >= clean[i - 1].minimum)) return 'Use unique grade names and strictly descending minimum scores ending at 0. Boundaries must be between 0 and 100.';
    if (!Number.isFinite(passMark) || passMark < 0 || passMark > 100) return 'Pass mark must be between 0 and 100.';
    this.policies.update(p => ({ ...p, [year.id]: { revision: this.forYear(year.id).revision + 1, bands: clean, passMark } }));
    return null;
  }
  private restore():Record<string, GradingPolicy>{return {};}
}
