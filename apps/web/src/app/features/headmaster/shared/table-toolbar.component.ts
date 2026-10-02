import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-table-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="toolbar">
      <div class="toolbar__left">
        <div class="toolbar__search" *ngIf="showSearch">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" [attr.aria-label]="searchPlaceholder" [placeholder]="searchPlaceholder" [ngModel]="searchValue" (ngModelChange)="searchChange.emit($event)" />
        </div>
        <ng-content select="[filters]"></ng-content>
      </div>
      <div class="toolbar__right">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    @use 'variables' as *;
    .toolbar {
      display: flex; justify-content: space-between; align-items: center;
      gap: 16px; margin-bottom: 20px; flex-wrap: wrap;
    }
    .toolbar__left { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
    .toolbar__right { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
    .toolbar__search {
      display: flex; align-items: center; background: #fff;
      border: 1px solid $input-border; border-radius: $radius-md;
      padding: 0 12px; height: 40px; min-width: 220px;
      svg { width: 16px; height: 16px; color: #596579; margin-right: 8px; flex-shrink: 0; }
      input {
        border: none; background: transparent; outline: none;
        font-size: 0.875rem; width: 100%; color: $text-primary; font-family: $font-family;
        &::placeholder { color: #596579; }
      }
    }
  `],
})
export class TableToolbarComponent {
  @Input() showSearch = true;
  @Input() searchPlaceholder = 'Search…';
  @Input() searchValue = '';
  @Output() searchChange = new EventEmitter<string>();
}
