import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { NotificationAudience, NotificationCenterService } from './notification-center.service';

@Component({
  selector: 'app-notifications-page', standalone: true, imports: [DatePipe, RouterLink],
  template: `<div class="notifications-page">
    <header class="notifications-page__header"><div><span class="eyebrow">Updates and alerts</span><h1>Notifications</h1><p>Review messages and the work that needs your attention.</p></div>
      @if (recordUnread()) { <button type="button" class="action" [disabled]="busy()" (click)="markAll()">Mark all as read</button> }
    </header>
    @if (error()) { <p class="portal-notice portal-notice--error" role="alert">{{ error() }}</p> }
    <div class="notifications-page__filters"><button type="button" [class.is-active]="filter() === 'all'" (click)="setFilter('all')">All <span>{{ items().length }}</span></button><button type="button" [class.is-active]="filter() === 'unread'" (click)="setFilter('unread')">Unread <span>{{ unread() }}</span></button></div>
    <div class="notifications-page__list">
      @for (item of pageItems(); track item.id) { <article class="notification-row" [class.notification-row--unread]="!item.read">
        <div class="notification-row__top"><strong>{{ item.title }}</strong>@if (item.createdAt) { <time>{{ item.createdAt | date:'medium' }}</time> }</div>
        <p>{{ item.detail }}</p><div class="notification-row__actions">@if (item.route !== '/' + audience() + '/notifications') { <a [routerLink]="item.route" queryParamsHandling="preserve">View more →</a> }@if (item.persistent && !item.read) { <button type="button" [disabled]="busy()" (click)="mark(item.id)">Mark as read</button> }</div>
      </article> } @empty { <div class="notifications-page__empty">{{ filter() === 'unread' ? 'You have no unread notifications.' : 'No notifications right now.' }}</div> }
    </div>
    @if (filtered().length > 10) { <nav class="notifications-page__pagination" aria-label="Notification pages"><span>Page {{ currentPage() }} of {{ pages() }} · {{ filtered().length }} items</span><div><button type="button" [disabled]="currentPage() === 1" (click)="page.set(currentPage()-1)">Previous</button><button type="button" [disabled]="currentPage() === pages()" (click)="page.set(currentPage()+1)">Next</button></div></nav> }
  </div>`,
  styles: [`.notifications-page{max-width:900px;margin:0 auto;color:#172338}.notifications-page__header{display:flex;align-items:end;justify-content:space-between;flex-wrap:wrap;gap:14px;margin-bottom:20px}.eyebrow{color:#b45309;font-size:.7rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.notifications-page h1{margin:5px 0;font-size:clamp(1.5rem,3vw,2rem)}.notifications-page__header p{margin:0;color:#64748b;font-size:.84rem}.action,.notifications-page__pagination button{min-height:38px;padding:8px 13px;border:1px solid #d6dfe9;border-radius:8px;background:#fff;color:#334155;font:inherit;font-size:.78rem;font-weight:700;cursor:pointer}.action:hover,.notifications-page__pagination button:hover:not(:disabled){border-color:#e69a54;color:#9a4b0d}.notifications-page__filters{display:flex;gap:6px;margin-bottom:12px}.notifications-page__filters button{min-height:36px;padding:7px 13px;border:1px solid #dfe6ee;border-radius:8px;background:#fff;color:#52637b;font:inherit;font-size:.78rem;font-weight:700;cursor:pointer}.notifications-page__filters button.is-active{border-color:#f0cb9e;background:#fff7ed;color:#9a4b0d}.notifications-page__filters span{margin-left:4px}.notifications-page__list{overflow:hidden;border:1px solid #dfe6ee;border-radius:12px;background:#fff}.notification-row{padding:14px 17px;border-bottom:1px solid #eef1f5}.notification-row:last-child{border-bottom:0}.notification-row--unread{box-shadow:inset 3px 0 #ed8b29;background:#fffaf3}.notification-row__top{display:flex;justify-content:space-between;flex-wrap:wrap;gap:7px}.notification-row__top strong{font-size:.83rem}.notification-row__top time{color:#75849a;font-size:.72rem}.notification-row p{margin:7px 0 10px;color:#4d5e73;font-size:.8rem;line-height:1.5;overflow-wrap:anywhere}.notification-row__actions{display:flex;gap:14px;align-items:center}.notification-row__actions a,.notification-row__actions button{border:0;background:transparent;color:#98500f;font:inherit;font-size:.76rem;font-weight:700;text-decoration:none;cursor:pointer}.notification-row__actions button{color:#596b80}.notifications-page__empty{padding:28px 17px;color:#64748b;font-size:.82rem}.notifications-page__pagination{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-top:14px;color:#64748b;font-size:.78rem}.notifications-page__pagination div{display:flex;gap:8px}button:disabled{opacity:.5;cursor:default}`],
})
export class NotificationsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly routeData = toSignal(this.route.data);
  readonly audience = computed<NotificationAudience>(() => this.routeData()?.['audience'] ?? 'teacher');
  readonly center = inject(NotificationCenterService);
  readonly items = computed(() => this.center.items(this.audience()));
  readonly unread = computed(() => this.center.unread(this.audience()));
  readonly recordUnread = computed(() => this.items().some(item => item.persistent && !item.read));
  readonly filter = signal<'all' | 'unread'>('all');
  readonly page = signal(1);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly filtered = computed(() => this.items().filter(item => this.filter() === 'all' || !item.read));
  readonly pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / 10)));
  readonly currentPage = computed(() => Math.min(this.page(), this.pages()));
  readonly pageItems = computed(() => this.filtered().slice((this.currentPage() - 1) * 10, this.currentPage() * 10));
  setFilter(value: 'all' | 'unread'): void { this.filter.set(value); this.page.set(1); }
  async mark(id: string): Promise<void> { await this.update(id); }
  async markAll(): Promise<void> { await this.update(); }
  private async update(id?: string): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true); this.error.set('');
    this.error.set(await this.center.markRead(id) ?? '');
    this.busy.set(false);
  }
}
