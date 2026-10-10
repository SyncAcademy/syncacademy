import { Component, ElementRef, HostListener, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NotificationAudience, NotificationCenterService } from './notification-center.service';

@Component({
  selector: 'app-notification-bell', standalone: true, imports: [RouterLink, DatePipe],
  template: `<div class="notification-bell">
    <button type="button" class="notification-bell__button" [attr.aria-label]="'Notifications, ' + unread() + ' items'" [attr.aria-expanded]="open()" (click)="open.set(!open())">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
      @if (unread()) { <span class="notification-bell__count">{{ unread() > 99 ? '99+' : unread() }}</span> }
    </button>
    @if (open()) { <div class="notification-bell__panel" role="region" aria-label="Recent notifications">
      <div class="notification-bell__heading"><strong>Notifications</strong><button type="button" aria-label="Close notifications" (click)="open.set(false)">×</button></div>
      @for (item of preview(); track item.id) { <a class="notification-bell__item" [routerLink]="item.route" queryParamsHandling="preserve" (click)="open.set(false)">
        <strong>{{ item.title }}</strong><span>{{ item.detail }}</span>@if (item.createdAt) { <small>{{ item.createdAt | date:'mediumDate' }}</small> }
      </a> } @empty { <p class="notification-bell__empty">No notifications right now.</p> }
      <a class="notification-bell__more" [routerLink]="['/', audience(), 'notifications']" queryParamsHandling="preserve" (click)="open.set(false)">View all notifications →</a>
    </div> }
  </div>`,
  styles: [`.notification-bell{position:relative;display:block}.notification-bell__button{position:relative;display:grid;place-items:center;width:40px;height:40px;border:1px solid #dce4ed;border-radius:10px;background:#fff;color:#334155;cursor:pointer}.notification-bell__button:hover,.notification-bell__button[aria-expanded=true]{border-color:#e69a54;background:#fff7ed;color:#9a4b0d}.notification-bell__button svg{width:20px;height:20px}.notification-bell__count{position:absolute;top:-5px;right:-6px;display:grid;place-items:center;min-width:18px;height:18px;padding:0 3px;border-radius:999px;background:#e96f18;color:#fff;font-size:10px;font-weight:800}.notification-bell__panel{position:absolute;right:0;top:calc(100% + 9px);z-index:1002;width:min(320px,calc(100vw - 32px));overflow:hidden;border:1px solid #dde5ed;border-radius:12px;background:#fff;box-shadow:0 14px 36px #17233824}.notification-bell__heading{display:flex;align-items:center;justify-content:space-between;padding:11px 13px;border-bottom:1px solid #eef1f5;font-size:.82rem}.notification-bell__heading button{border:0;background:transparent;color:#64748b;font-size:18px;cursor:pointer}.notification-bell__item{display:grid;gap:3px;padding:10px 13px;border-bottom:1px solid #f0f2f5;color:#172338;text-decoration:none}.notification-bell__item:hover{background:#fff7ed}.notification-bell__item strong{font-size:.77rem}.notification-bell__item span{display:-webkit-box;overflow:hidden;-webkit-line-clamp:2;-webkit-box-orient:vertical;color:#52637b;font-size:.73rem;line-height:1.35}.notification-bell__item small{color:#7a8799;font-size:.66rem}.notification-bell__empty{margin:0;padding:18px 13px;color:#64748b;font-size:.78rem}.notification-bell__more{display:block;padding:11px 13px;color:#9a4b0d;font-size:.76rem;font-weight:800;text-align:center;text-decoration:none}.notification-bell__more:hover{background:#fff7ed}`],
})
export class NotificationBellComponent {
  readonly audience = input<NotificationAudience>('teacher');
  readonly center = inject(NotificationCenterService);
  private readonly host = inject(ElementRef<HTMLElement>);
  readonly open = signal(false);
  readonly unread = computed(() => this.center.unread(this.audience()));
  readonly preview = computed(() => this.center.items(this.audience()).slice(0, 3));
  @HostListener('document:click', ['$event']) closeOutside(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
  }
  @HostListener('document:keydown.escape') closeEscape(): void { this.open.set(false); }
}
