import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {  } from '@ionic/angular/standalone';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthLayoutComponent } from '@shared/layouts/auth-layout/auth-layout.component';
import { LogoComponent } from '@shared/components/logo/logo.component';

export function matchPasswordValidator(passwordKey: string, confirmPasswordKey: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const formGroup = control as FormGroup;
    const password = formGroup.get(passwordKey)?.value;
    const confirmPassword = formGroup.get(confirmPasswordKey)?.value;
    
    if (!password || !confirmPassword) {
      return null;
    }
    
    if (password !== confirmPassword) {
      formGroup.get(confirmPasswordKey)?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    const confirmControl = formGroup.get(confirmPasswordKey);
    if (confirmControl?.errors && confirmControl.errors['passwordMismatch']) {
      delete confirmControl.errors['passwordMismatch'];
      if (Object.keys(confirmControl.errors).length === 0) {
        confirmControl.setErrors(null);
      }
    }
    
    return null;
  };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    AuthLayoutComponent,
    LogoComponent,
    
  ],
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss']
})
export class RegisterPage {
  registerForm: FormGroup;
  showPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);
  
  schoolOptions = [
    'Sync Academy Dar es Salaam', 
    'Sync Academy Arusha', 
    'Sync Academy Dodoma'
  ];
  
  roleOptions = [
    'Administrator', 
    'Teacher', 
    'Accountant', 
    'Secretary'
  ];

  constructor(private fb: FormBuilder) {
    this.registerForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
      school: ['', Validators.required],
      role: ['', Validators.required],
      terms: [false, Validators.requiredTrue]
    }, { validators: matchPasswordValidator('password', 'confirmPassword') });
  }

  togglePassword(field: 'password' | 'confirm'): void {
    if (field === 'password') {
      this.showPassword.update(show => !show);
    } else {
      this.showConfirmPassword.update(show => !show);
    }
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      console.log('Register form submitted:', this.registerForm.value);
    }
  }
}
