import { Component, HostListener, inject } from '@angular/core';
import { SidebarWidthService } from '../../../core/services/sidebar-width.service';

@Component({
  selector: 'app-sidebar-resize-handle',
  standalone: true,
  template: `
    <div
      class="resize-handle"
      role="separator"
      aria-label="Resize sidebar"
      aria-orientation="vertical"
      tabindex="0"
      [attr.aria-valuemin]="sidebarWidth.minWidth"
      [attr.aria-valuemax]="sidebarWidth.maxWidth"
      [attr.aria-valuenow]="sidebarWidth.width()"
      (pointerdown)="startResize($event)"
      (keydown)="onKeydown($event)"
    ></div>
  `,
  styles: [`
    :host { position: absolute; z-index: 20; top: 0; right: 0; bottom: 0; width: 12px; }
    .resize-handle { width: 100%; height: 100%; cursor: col-resize; touch-action: none; outline: none; }
    .resize-handle::after { content: ''; position: absolute; top: 0; right: 5px; bottom: 0; width: 2px; background: #E87E24; opacity: 0; transition: opacity 120ms ease; }
    .resize-handle:hover::after, .resize-handle:focus-visible::after, .resize-handle:active::after { opacity: 0.85; }
    @media (max-width: 991px) { :host { display: none; } }
  `],
})
export class SidebarResizeHandleComponent {
  readonly sidebarWidth = inject(SidebarWidthService);
  private startX = 0;
  private startWidth = 0;
  private activePointerId: number | null = null;

  startResize(event: PointerEvent): void {
    if (event.button !== 0 || window.innerWidth < 992) return;

    event.preventDefault();
    this.startX = event.clientX;
    this.startWidth = this.sidebarWidth.width();
    this.activePointerId = event.pointerId;
  }

  @HostListener('window:pointermove', ['$event'])
  resize(event: PointerEvent): void {
    if (event.pointerId !== this.activePointerId) return;
    this.sidebarWidth.setWidth(this.startWidth + event.clientX - this.startX);
  }

  @HostListener('window:pointerup', ['$event'])
  @HostListener('window:pointercancel', ['$event'])
  stopResize(event: PointerEvent): void {
    if (event.pointerId !== this.activePointerId) return;
    this.activePointerId = null;
  }

  onKeydown(event: KeyboardEvent): void {
    const steps: Record<string, number> = { ArrowLeft: -10, ArrowRight: 10 };
    if (event.key === 'Home') {
      this.sidebarWidth.setWidth(this.sidebarWidth.minWidth);
    } else if (event.key === 'End') {
      this.sidebarWidth.setWidth(this.sidebarWidth.maxWidth);
    } else if (steps[event.key]) {
      this.sidebarWidth.setWidth(this.sidebarWidth.width() + steps[event.key]);
    } else {
      return;
    }
    event.preventDefault();
  }
}