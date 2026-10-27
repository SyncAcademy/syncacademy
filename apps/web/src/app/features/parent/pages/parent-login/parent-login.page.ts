import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { ParentAuthService } from '@core/services/parent-auth.service';

@Component({
  selector: 'app-parent-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="parent-login-container">
      <div class="login-card">
        <div class="header-section">
          <h1 class="brand-title">SyncAcademy</h1>
          <p class="subtitle">Parent & Guardian Portal</p>
        </div>

        @if (errorMessage()) {
          <div class="alert-error" role="alert">
            {{ errorMessage() }}
          </div>
        }

        @if (sessionExpired()) {
          <div class="alert-error" role="alert">
            Your session has expired. Please sign in again.
          </div>
        }

        <form (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="identifier">Phone Number or Email</label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              autocomplete="username"
              required
              [(ngModel)]="identifier"
              placeholder="+255... or name@example.com"
            />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
              [(ngModel)]="password"
              placeholder="Enter your password"
            />
          </div>

          <button type="submit" class="submit-btn" [disabled]="loading() || !identifier || !password">
            {{ loading() ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>

        <div class="footer-links">
          <a routerLink="/parent/activate">Have an invitation code? Activate account</a>
          <span class="divider">School staff? <a routerLink="/auth/login">Staff sign in</a></span>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./parent-login.page.scss']
})
export class ParentLoginPage {
  private auth = inject(ParentAuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  identifier = '';
  password = '';
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  readonly sessionExpired = signal(this.route.snapshot.queryParamMap.get('session') === 'expired');

  async onSubmit(): Promise<void> {
    if (!this.identifier || !this.password || this.loading()) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      await this.auth.login(this.identifier.trim(), this.password);
      void this.router.navigate(['/parent/home']);
    } catch (err) {
      this.errorMessage.set(this.auth.errorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }
}
