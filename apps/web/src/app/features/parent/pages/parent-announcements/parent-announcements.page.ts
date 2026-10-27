import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParentAuthService } from '@core/services/parent-auth.service';

export interface AnnouncementPost {
  id: string;
  title: string;
  body: string;
  publishedAt: string;
  media: {
    id: string;
    mimeType: string;
    byteSize: number;
    width: number;
    height: number;
  } | null;
}

@Component({
  selector: 'app-parent-announcements',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="announcements-view">
      <div class="page-header">
        <h2>School Updates & Announcements</h2>
      </div>

      @if (loading()) {
        <div style="text-align:center;padding:40px;color:#6B7280;">Loading announcements...</div>
      } @else if (posts().length) {
        @for (post of posts(); track post.id) {
          <article class="post-card">
            @if (post.media) {
              <div class="post-media-container" (click)="openImage(post.id)">
                <img
                  [src]="'/api/v1/parent/announcements/' + post.id + '/media?variant=display'"
                  alt="Announcement image attachment"
                  loading="lazy"
                />
              </div>
            }

            <div class="post-body">
              <h3 class="post-title">{{ post.title }}</h3>
              <p class="post-text">{{ post.body }}</p>
              <div class="post-footer">
                <span>{{ post.publishedAt | date:'mediumDate' }}</span>
                @if (post.media) {
                  <span style="font-size:0.75rem;color:#E87E24;">Tap image to view full</span>
                }
              </div>
            </div>
          </article>
        }
      } @else {
        <div class="empty-state">
          <h3>No Announcements</h3>
          <p>Important circulars and messages from your school will appear here.</p>
        </div>
      }

      @if (lightboxImageId()) {
        <div class="modal-lightbox" (click)="closeImage()">
          <div class="lightbox-content" (click)="$event.stopPropagation()">
            <img
              [src]="'/api/v1/parent/announcements/' + lightboxImageId() + '/media?variant=original'"
              alt="Full size view"
            />
            <button type="button" class="close-btn" (click)="closeImage()">Close</button>
          </div>
        </div>
      }
    </div>
  `,
  styleUrls: ['./parent-announcements.page.scss']
})
export class ParentAnnouncementsPage implements OnInit, OnDestroy {
  readonly auth = inject(ParentAuthService);
  posts = signal<AnnouncementPost[]>([]);
  loading = signal(false);
  lightboxImageId = signal<string | null>(null);

  private eventSource?: EventSource;

  ngOnInit(): void {
    void this.loadPosts();
    this.initSse();
  }

  ngOnDestroy(): void {
    this.eventSource?.close();
  }

  async loadPosts(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.auth.request<{ items: AnnouncementPost[] }>('GET', 'parent/announcements');
      this.posts.set(res.items || (Array.isArray(res) ? res : []));
    } catch {
      this.posts.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  private initSse(): void {
    const token = this.auth.token();
    if (!token || typeof window === 'undefined' || !window.EventSource) return;

    try {
      // Stream authentication uses bearer token or cookie query if configured
      this.eventSource = new EventSource(`/api/v1/parent/announcements/stream`);
      this.eventSource.addEventListener('changed', () => {
        void this.loadPosts();
      });
    } catch {
      // Fallback to polling or standard reloads
    }
  }

  openImage(id: string): void {
    this.lightboxImageId.set(id);
  }

  closeImage(): void {
    this.lightboxImageId.set(null);
  }
}
