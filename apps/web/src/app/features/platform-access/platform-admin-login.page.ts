import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthLayoutComponent } from '@shared/layouts/auth-layout/auth-layout.component';
import { LogoComponent } from '@shared/components/logo/logo.component';
import { AuthService } from '@core/services/auth.service';

type PlatformStage = 'login' | 'password-change' | 'enrollment' | 'totp' | 'recovery-ack';
type ChallengeResponse = { stage: PlatformStage; secret?: string; qr?: string; recoveryCodes?: string[]; id?: string };

@Component({
  selector: 'app-platform-admin-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AuthLayoutComponent, LogoComponent],
  templateUrl: './platform-admin-login.page.html',
  styleUrl: './platform-admin-login.page.scss',
})
export class PlatformAdminLoginPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  readonly stage = signal<PlatformStage>('login');
  readonly busy = signal(false);
  readonly showPassword = signal(false);
  readonly recoveryMode = signal(false);
  readonly error = signal('');
  readonly sessionNotice = this.route.snapshot.queryParamMap.get('session') === 'expired' ? 'Your administrator session expired. Sign in again.' : '';
  readonly setup = signal<{ secret: string; qr: string } | null>(null);
  readonly recoveryCodes = signal<string[]>([]);
  readonly passwordForm = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    password: ['', [Validators.required, Validators.maxLength(128)]],
  });
  readonly replacementPasswordForm = this.formBuilder.group({
    password: ['', [Validators.required, Validators.minLength(15), Validators.maxLength(128)]],
    confirm: ['', [Validators.required]],
  });
  readonly codeForm = this.formBuilder.group({ code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]] });
  readonly recoveryForm = this.formBuilder.group({ code: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(20)]] });

  async ngOnInit(): Promise<void> {
    try {
      this.applyChallenge(await this.auth.request<ChallengeResponse>('GET', 'auth/platform/challenge'));
    } catch {}
  }

  togglePassword(): void {
    this.showPassword.update(value => !value);
  }

  toggleRecovery(): void {
    this.recoveryMode.update(value => !value);
  }

  private applyChallenge(result: ChallengeResponse): void {
    if (result.id) {
      this.auth.identity.set(result as any);
      void this.router.navigateByUrl('/super-admin');
      return;
    }
    this.stage.set(result.stage);
    this.setup.set(result.secret && result.qr ? { secret: result.secret, qr: result.qr } : null);
    if (result.recoveryCodes) this.recoveryCodes.set(result.recoveryCodes);
  }

  private async run(action: () => Promise<ChallengeResponse>): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      this.applyChallenge(await action());
    } catch (error) {
      this.error.set(this.auth.error(error));
    } finally {
      this.busy.set(false);
    }
  }

  async signIn(): Promise<void> {
    if (this.passwordForm.invalid) return;
    const { email, password } = this.passwordForm.getRawValue();
    await this.run(async () => {
      this.auth.identity.set(null);
      this.passwordForm.controls.password.reset();
      return this.auth.request('POST', 'auth/platform/login', { email, password });
    });
  }

  async changePassword(): Promise<void> {
    if (this.replacementPasswordForm.invalid) return;
    const { password, confirm } = this.replacementPasswordForm.getRawValue();
    if (password !== confirm) {
      this.error.set('Passwords do not match.');
      return;
    }
    await this.run(() => this.auth.request('POST', 'auth/platform/password', { password }));
    this.replacementPasswordForm.reset();
  }

  async verify(): Promise<void> {
    if (this.codeForm.invalid) return;
    const code = this.codeForm.controls.code.value!;
    await this.run(() => this.auth.request('POST', 'auth/platform/verify', { code }));
    this.codeForm.reset();
  }

  async recover(): Promise<void> {
    if (this.recoveryForm.invalid) return;
    const code = this.recoveryForm.controls.code.value!.trim();
    await this.run(async () => {
      const identity = await this.auth.request('POST', 'auth/platform/recovery', { code });
      this.auth.identity.set(identity as any);
      await this.router.navigateByUrl('/super-admin');
      return { stage: 'login' };
    });
    this.recoveryForm.reset();
  }

  async acknowledgeRecovery(): Promise<void> {
    await this.run(async () => {
      const identity = await this.auth.request('POST', 'auth/platform/acknowledge-recovery', {});
      this.auth.identity.set(identity as any);
      await this.router.navigateByUrl('/super-admin');
      return { stage: 'login' };
    });
  }
}
