import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ParentAuthService } from '@core/services/parent-auth.service';
import { NativePushService } from '@core/services/native-push.service';

@Component({
  selector: 'app-parent-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="parent-shell">
      @if (auth.isOfflineData()) {
        <div class="offline-banner" role="status">
          Offline mode: Displaying cached school records
        </div>
      }

      <header class="parent-header">
        <div class="header-content">
          <div class="brand-group">
            <h1 class="brand-title">SyncAcademy</h1>
            <span class="badge-parent">Parents</span>
          </div>

          <div class="header-actions" style="display:flex;align-items:center;gap:8px;">
            @if (auth.children().length > 1) {
              <div class="child-selector-container">
                <select [ngModel]="auth.selectedChildId()" (ngModelChange)="onChildChange($event)">
                  @for (child of auth.children(); track child.id) {
                    <option [value]="child.id">{{ child.name }} ({{ child.latestClass?.name || 'Enrolled' }})</option>
                  }
                </select>
              </div>
            }

            <button type="button" class="account-btn" (click)="openAccountModal()">
              Account
            </button>

            <button type="button" class="logout-btn" (click)="onLogout()">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main class="parent-main">
        <router-outlet></router-outlet>
      </main>

      <nav class="parent-nav-bar">
        <a routerLink="/parent/home" routerLinkActive="active" class="nav-item">
          <span class="nav-icon">&#9679;</span>
          <span>Home</span>
        </a>
        <a routerLink="/parent/results" routerLinkActive="active" class="nav-item">
          <span class="nav-icon">&#9638;</span>
          <span>Results</span>
        </a>
        <a routerLink="/parent/fees" routerLinkActive="active" class="nav-item">
          <span class="nav-icon">&#9776;</span>
          <span>Fees</span>
        </a>
        <a routerLink="/parent/attendance" routerLinkActive="active" class="nav-item">
          <span class="nav-icon">&#10003;</span>
          <span>Attendance</span>
        </a>
        <a routerLink="/parent/announcements" routerLinkActive="active" class="nav-item">
          <span class="nav-icon">&#9733;</span>
          <span>Updates</span>
        </a>
        <a routerLink="/parent/notifications" routerLinkActive="active" class="nav-item">
          <span class="nav-icon">&#9993;</span>
          <span>Alerts</span>
        </a>
      </nav>

      @if (showAccountModal()) {
        <div class="modal-backdrop" (click)="closeAccountModal()">
          <div class="account-modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Parent Account & Privacy</h2>
              <button type="button" class="btn-close" (click)="closeAccountModal()">&times;</button>
            </div>

            <div class="modal-body">
              <div class="user-info-row">
                <span class="label">Name:</span>
                <span class="value">{{ auth.parentUser()?.name || 'Guardian' }}</span>
              </div>
              @if (auth.parentUser()?.phone) {
                <div class="user-info-row">
                  <span class="label">Mobile Phone:</span>
                  <span class="value">{{ auth.parentUser()?.phone }}</span>
                </div>
              }
              @if (auth.parentUser()?.email) {
                <div class="user-info-row">
                  <span class="label">Email:</span>
                  <span class="value">{{ auth.parentUser()?.email }}</span>
                </div>
              }
              <div class="user-info-row">
                <span class="label">Linked Children:</span>
                <span class="value">{{ auth.children().length }} registered</span>
              </div>

              <hr class="modal-divider" />

              <div class="danger-zone">
                <h3>Account Deletion</h3>
                <p class="deletion-notice">
                  Under App Store and Google Play privacy guidelines, you can request immediate deactivation and deletion of your parent mobile account.
                  This revokes all mobile sessions, removes registered push tokens, and unlinks your contact credentials.
                </p>

                @if (!deleteConfirm()) {
                  <button type="button" class="btn-danger-outline" (click)="deleteConfirm.set(true)">
                    Delete Parent Account...
                  </button>
                } @else {
                  <div class="confirmation-form">
                    <label for="delete-password-input">Confirm your password to delete:</label>
                    <input
                      id="delete-password-input"
                      type="password"
                      [(ngModel)]="deletePassword"
                      placeholder="Current account password"
                      class="password-confirm-input"
                    />

                    @if (deleteError()) {
                      <div class="error-msg">{{ deleteError() }}</div>
                    }

                    <div class="confirm-actions">
                      <button type="button" class="btn-cancel" (click)="deleteConfirm.set(false)">Cancel</button>
                      <button
                        type="button"
                        class="btn-danger-solid"
                        [disabled]="isDeleting() || !deletePassword().trim()"
                        (click)="confirmDeleteAccount()"
                      >
                        {{ isDeleting() ? 'Deactivating...' : 'Confirm Account Deletion' }}
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styleUrls: ['./parent.layout.scss']
})
export class ParentLayout implements OnInit {
  readonly auth = inject(ParentAuthService);
  private pushService = inject(NativePushService);
  private router = inject(Router);

  showAccountModal = signal(false);
  deleteConfirm = signal(false);
  deletePassword = signal('');
  deleteError = signal('');
  isDeleting = signal(false);

  async ngOnInit(): Promise<void> {
    void this.pushService.init();
    if (this.auth.isAuthenticated() && !this.auth.children().length) {
      await this.auth.loadInitialData();
    }
  }

  async onChildChange(studentId: string): Promise<void> {
    await this.auth.selectChild(studentId);
  }

  async onLogout(): Promise<void> {
    await this.auth.logout();
    void this.router.navigate(['/parent/login']);
  }

  openAccountModal(): void {
    this.deleteConfirm.set(false);
    this.deletePassword.set('');
    this.deleteError.set('');
    this.showAccountModal.set(true);
  }

  closeAccountModal(): void {
    this.showAccountModal.set(false);
  }

  async confirmDeleteAccount(): Promise<void> {
    const pwd = this.deletePassword().trim();
    if (!pwd) return;

    this.isDeleting.set(true);
    this.deleteError.set('');

    try {
      await this.auth.deleteAccount(pwd);
      this.showAccountModal.set(false);
      void this.router.navigate(['/parent/login'], {
        queryParams: { message: 'Your parent account has been successfully deleted.' }
      });
    } catch (err: unknown) {
      this.deleteError.set(this.auth.errorMessage(err));
    } finally {
      this.isDeleting.set(false);
    }
  }
}
