import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogFocusDirective } from '../../../shared/directives/dialog-focus.directive';

export interface EditorField {
  key: string; label: string; type?: string; required?: boolean; min?: number;
  options?: string[]; choices?: { value: string; label: string }[];
}

@Component({
  selector: 'app-sa-editor', standalone: true, imports: [FormsModule, DialogFocusDirective],
  template: `
    <dialog #dialog appDialogFocus aria-labelledby="editor-title" (click)="onDialogClick($event)" (keydown.escape)="onCancel($event)">
      <form class="modal-card editor-card" #form="ngForm" (click)="$event.stopPropagation()" (ngSubmit)="form.valid && submit()">
        <header class="editor-heading"><h2 id="editor-title">{{ title }}</h2><button type="button" class="editor-button editor-button--secondary" aria-label="Close dialog" [disabled]="busy" (click)="cancelled.emit()">Close</button></header>
        <p>{{ description }}</p>
        @for (field of fields; track field.key) {
          <label [for]="'edit-' + field.key">{{ field.label }}{{ field.required ? ' *' : '' }}</label>
          @if (field.options || field.choices) {
            <select [id]="'edit-' + field.key" [name]="field.key" [(ngModel)]="values[field.key]" [required]="!!field.required">
              @for (option of field.options || []; track option) { <option [value]="option">{{ option }}</option> }
            @if (field.choices) { <option value="">Select...</option>@for (choice of field.choices; track choice.value) { <option [value]="choice.value">{{ choice.label }}</option> } }</select>
          } @else {
            <input [id]="'edit-' + field.key" [name]="field.key" [(ngModel)]="values[field.key]"
              [email]="field.type === 'email'" [type]="field.type || 'text'" [required]="!!field.required" [min]="field.min ?? null" [attr.step]="field.type === 'number' ? 1 : null" />
          }
        }
        @if (error || validationError) { <p role="alert" class="error">{{ error || validationError }}</p> }
        <footer><button type="button" class="editor-button editor-button--secondary" [disabled]="busy" (click)="cancelled.emit()">Cancel</button>
          <button type="submit" class="editor-button editor-button--primary" [disabled]="form.invalid || busy">{{ busy ? 'Saving...' : submitLabel }}</button></footer>
      </form>
    </dialog>`,
  styles: [`
    .editor-card { box-sizing:border-box; width:540px; padding:24px; color:#172033; }
    .editor-heading { display:flex; align-items:center; justify-content:space-between; gap:16px; }
    .editor-heading h2 { margin:0; font-size:1.25rem; }
    h2 { margin-top: 0; }
    p { color: #64748b; font-size: .875rem; line-height: 1.5; }
    label { display: block; margin: 14px 0 6px; font-weight: 600; font-size: .875rem; }
    input, select { box-sizing: border-box; width: 100%; min-height: 44px; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font: inherit; background: white; transition: border-color 180ms ease, box-shadow 180ms ease; }
    input:hover, select:hover { border-color: #94a3b8; }
    input:focus-visible, select:focus-visible { outline: 2px solid #b45309; outline-offset: 1px; border-color: #b45309; }
    footer { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
    .editor-button { min-height: 44px; padding: 10px 18px; border: 1px solid transparent; border-radius: 6px; font: inherit; font-weight: 600; cursor: pointer; transition: background-color 180ms ease, border-color 180ms ease, color 180ms ease; }
    .editor-button--secondary { border-color: #cbd5e1; background: #fff; color: #334155; }
    .editor-button--secondary:hover:not(:disabled) { border-color: #94a3b8; background: #f8fafc; }
    .editor-button--primary { border-color: #c85d11; background: #c85d11; color: #fff; }
    .editor-button--primary:hover:not(:disabled) { border-color: #a84a09; background: #a84a09; }
    .editor-button:focus-visible { outline: 2px solid #b45309; outline-offset: 2px; }
    .editor-button:disabled { opacity: .5; cursor: not-allowed; }
    .error { color: #b91c1c; }
    @media (max-width: 480px) { .editor-card { padding: 18px; } footer button { flex: 1 1 100%; } }
  `],
})
export class SaEditorComponent {
  validationError = '';
  @ViewChild('dialog') dialog!: ElementRef<HTMLDialogElement>;
  @Input() title = '';
  @Input() busy = false;
  @Input() description = 'Changes are saved to your school records.';
  @Input() submitLabel = 'Save';
  @Input() fields: EditorField[] = [];
  @Input() values: Record<string, any> = {};
  @Input() error = '';
  @Output() saved = new EventEmitter<Record<string, any>>();
  @Output() cancelled = new EventEmitter<void>();
  submit(): void {
    const cleaned = Object.fromEntries(Object.entries(this.values).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]));
    if (this.fields.some(f => f.required && (cleaned[f.key] === '' || cleaned[f.key] == null))) { this.validationError = 'Complete all required fields.'; return; }
    if (this.fields.some(f => f.type === 'number' && (!Number.isInteger(Number(cleaned[f.key])) || Number(cleaned[f.key]) < (f.min ?? 0)))) { this.validationError = 'Enter a whole number within the allowed range.'; return; }
    this.validationError = ''; this.saved.emit(cleaned);
  }
  onDialogClick(event: MouseEvent): void {
    const dialog = this.dialog.nativeElement;
    if (event.target !== dialog) return;
    if (!this.busy) this.cancelled.emit();
  }
  onCancel(event: Event): void {
    if (this.busy) { event.preventDefault(); return; }
    this.cancelled.emit();
  }
}
