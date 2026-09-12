import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private isAuthenticated = signal(false);

  readonly isLoggedIn = this.isAuthenticated.asReadonly();

  login(email: string, password: string): void {
    console.log('Login attempt:', { email });
    this.isAuthenticated.set(true);
  }

  register(data: Record<string, unknown>): void {
    console.log('Register attempt:', data);
  }

  logout(): void {
    this.isAuthenticated.set(false);
  }
}
