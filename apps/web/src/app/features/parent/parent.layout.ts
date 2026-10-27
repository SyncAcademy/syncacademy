import { Component, inject, OnInit } from '@angular/core';
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
    </div>
  `,
  styleUrls: ['./parent.layout.scss']
})
export class ParentLayout implements OnInit {
  readonly auth = inject(ParentAuthService);
  private pushService = inject(NativePushService);
  private router = inject(Router);

  async ngOnInit(): Promise<void> {
    void this.pushService.init();
    if (this.auth.isAuthenticated() && !this.auth.children().length) {
      await this.auth.loadInitialData();
    }
  }

  async onChildChange(studentId: string): Promise<void> {
    await this.auth.selectChild(studentId);
    // Reload current page state if needed
  }

  async onLogout(): Promise<void> {
    await this.auth.logout();
    void this.router.navigate(['/parent/login']);
  }
}
