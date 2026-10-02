import { Component } from '@angular/core';

@Component({
  selector: 'app-record-card',
  standalone: true,
  template: `<div class="rc"><ng-content></ng-content></div>`,
  styles: [`
    @use 'variables' as *;
    .rc {
      background: #fff; border: 1px solid $input-border; border-radius: $radius-lg;
      padding: 16px; display: flex; flex-direction: column; gap: 10px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
  `],
})
export class RecordCardComponent {}
