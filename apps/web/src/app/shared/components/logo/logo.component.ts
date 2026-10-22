import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="logo-container" [ngClass]="[variant, size]">
      <div class="logo-icon" [class.circle]="iconShape === 'circle'">
        <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 3L1 9L12 15L21 10.09V17H23V9M5 13.18V17.18L12 21L19 17.18V13.18L12 17L5 13.18Z"/>
        </svg>
      </div>
      <div class="logo-text">
        <span class="text-sync">Sync</span>
        <span class="text-academy">Academy</span>
      </div>
    </div>
  `,
  styleUrls: ['./logo.component.scss']
})
export class LogoComponent {
  @Input() variant: 'light' | 'dark' = 'dark';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() iconShape: 'rounded' | 'circle' = 'rounded';
}
