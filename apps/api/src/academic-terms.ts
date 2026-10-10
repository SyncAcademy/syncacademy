import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value);
export const termInput = z.object({
  key: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(80),
  startsAt: calendarDate,
  endsAt: calendarDate,
}).strict();
export type AcademicTerm = z.infer<typeof termInput>;
export const termsInput = z.array(termInput).min(1).max(8);

/** Existing years had three fixed terms. Keep their stored values usable until edited. */
export function termsForYear(year: { terms?: unknown; startsAt: Date; endsAt: Date }): AcademicTerm[] {
  const parsed = termsInput.safeParse(year.terms);
  if (parsed.success) return parsed.data;
  const start = Date.UTC(year.startsAt.getUTCFullYear(), year.startsAt.getUTCMonth(), year.startsAt.getUTCDate());
  const end = Date.UTC(year.endsAt.getUTCFullYear(), year.endsAt.getUTCMonth(), year.endsAt.getUTCDate());
  const days = Math.max(1, Math.round((end - start) / 86400000) + 1);
  return [0, 1, 2].map(index => ({
    key: `Term ${index + 1}`, name: `Term ${index + 1}`,
    startsAt: new Date(start + Math.floor(days * index / 3) * 86400000).toISOString().slice(0, 10),
    endsAt: new Date(start + (Math.floor(days * (index + 1) / 3) - 1) * 86400000).toISOString().slice(0, 10),
  }));
}

export function validateTerms(terms: AcademicTerm[], startsAt: string, endsAt: string): void {
  const keys = new Set<string>(); const names = new Set<string>();
  terms.forEach((term, index) => {
    const name = term.name.toLocaleLowerCase();
    if (keys.has(term.key) || names.has(name)) throw new BadRequestException('Each term needs a distinct name and identifier.');
    keys.add(term.key); names.add(name);
    if (term.startsAt < startsAt || term.endsAt > endsAt || term.endsAt < term.startsAt)
      throw new BadRequestException('Term dates must be ordered within the academic year.');
    if (index && term.startsAt <= terms[index - 1].endsAt)
      throw new BadRequestException('Term dates cannot overlap and must be in order.');
  });
}

export function requireYearTerm(year: { terms?: unknown; startsAt: Date; endsAt: Date }, key: string, fullYear = false): void {
  if (fullYear && key === 'Full year') return;
  if (!termsForYear(year).some(term => term.key === key)) throw new BadRequestException('Choose a term configured for this academic year.');
}
