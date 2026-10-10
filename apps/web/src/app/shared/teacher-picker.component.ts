import { Component, EventEmitter, Input, Output, signal } from '@angular/core';

export interface TeacherOption { id: string; fullName: string; email: string; }
let nextTeacherPickerId = 0;

@Component({
  selector: 'app-teacher-picker', standalone: true,
  template: `
    <div class="teacher-picker">
      <label class="picker-label" [for]="searchId">{{ label }}</label>
      <input [id]="searchId" type="search" placeholder="Search teacher by name or email"
        [value]="search()" (input)="search.set($any($event.target).value)" [disabled]="disabled" />
      <div class="teacher-list" role="radiogroup" [attr.aria-label]="label">
        @if (allowNone && !search()) {
          <button type="button" role="radio" [attr.aria-checked]="!selectedId"
            [class.selected]="!selectedId" [disabled]="disabled" (click)="selectedIdChange.emit('')">No class teacher</button>
        }
        @for (teacher of filtered(); track teacher.id) {
          <button type="button" role="radio" [attr.aria-checked]="selectedId === teacher.id"
            [class.selected]="selectedId === teacher.id" [disabled]="disabled"
            (click)="selectedIdChange.emit(teacher.id)">
            <strong>{{ teacher.fullName }}</strong><small>{{ teacher.email }}</small>
          </button>
        } @empty { <p>No matching active teachers.</p> }
      </div>
    </div>`,
  styles: [`
    .teacher-picker { display:grid; gap:8px; min-width:0; }
    .picker-label { color:#334155; font-size:.875rem; font-weight:700; }
    input { box-sizing:border-box; width:100%; min-height:42px; border:1px solid #cbd5e1; border-radius:8px; padding:9px 12px; font:inherit; }
    .teacher-list { display:grid; gap:6px; max-height:230px; overflow-y:auto; padding:4px; border:1px solid #dbe3ec; border-radius:10px; background:#f8fafc; }
    button { display:flex; flex-direction:column; align-items:flex-start; gap:2px; width:100%; min-height:48px; border:1px solid transparent; border-radius:8px; padding:7px 10px; background:white; color:#172338; font:inherit; text-align:left; cursor:pointer; }
    button:hover, button.selected { border-color:#b45309; background:#fff7ed; }
    button:focus-visible { outline:2px solid #b45309; outline-offset:1px; }
    small { color:#64748b; }
    p { margin:10px; color:#64748b; font-size:.875rem; }
  `],
})
export class TeacherPickerComponent {
  @Input() label = 'Teacher';
  @Input() teachers: TeacherOption[] = [];
  @Input() selectedId = '';
  @Input() allowNone = false;
  @Input() disabled = false;
  @Output() selectedIdChange = new EventEmitter<string>();
  readonly search = signal('');
  readonly searchId = `teacher-search-${++nextTeacherPickerId}`;
  filtered(): TeacherOption[] {
    const query = this.search().trim().toLowerCase();
    return this.teachers.filter(t => `${t.fullName} ${t.email}`.toLowerCase().includes(query));
  }
}
