import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParentAuthService } from '@core/services/parent-auth.service';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  type?: string;
}

@Component({
  selector: 'app-parent-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notifications-view">
      <div class="header-bar">
        <h2>Parent Alerts</h2>
        @if (items().length) {
          <button type="button" class="mark-all-btn" (click)="markAllAsRead()">
            Mark all read
          </button>
        }
      </div>

      @if (loading()) {
        <div style="text-align:center;padding:40px;color:#6B7280;">Loading alerts...</div>
      } @else if (items().length) {
        <div class="notifications-list">
          @for (item of items(); track item.id) {
            <div
              class="notification-item"
              [class.unread]="!item.read"
              (click)="markAsRead(item)"
            >
              <div class="item-body">
                <h4>{{ item.title }}</h4>
                <p>{{ item.body }}</p>
                <span class="item-time">{{ item.createdAt | date:'short' }}</span>
              </div>
              @if (!item.read) {
                <div class="unread-indicator" title="Unread"></div>
              }
            </div>
          }
        </div>
      } @else {
        <div class="empty-state">
          <h3>No Alerts</h3>
          <p>You are caught up. There are no pending alerts for your children.</p>
        </div>
      }
    </div>
  `,
  styleUrls: ['./parent-notifications.page.scss']
})
export class ParentNotificationsPage implements OnInit {
  readonly auth = inject(ParentAuthService);
  items = signal<NotificationItem[]>([]);
  loading = signal(false);

  ngOnInit(): void {
    void this.loadNotifications();
  }

  async loadNotifications(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.auth.request<{ items: NotificationItem[] }>('GET', 'parent/notifications');
      this.items.set(res.items || (Array.isArray(res) ? res : []));
    } catch {
      this.items.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  async markAsRead(item: NotificationItem): Promise<void> {
    if (item.read) return;
    try {
      item.read = true;
      this.items.set([...this.items()]);
      await this.auth.request('PATCH', `parent/notifications/${item.id}/read`, {});
    } catch {
      // Handled silently
    }
  }

  async markAllAsRead(): Promise<void> {
    try {
      const updated = this.items().map(i => ({ ...i, read: true }));
      this.items.set(updated);
      await this.auth.request('POST', 'parent/notifications/read-all', {});
    } catch {
      // Handled silently
    }
  }
}
