import { inject } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {  } from '@ionic/angular/standalone';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { AuthLayoutComponent } from '@shared/layouts/auth-layout/auth-layout.component';
import { LogoComponent } from '@shared/components/logo/logo.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    AuthLayoutComponent,
    LogoComponent,
    
  ],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss']
})
export class LoginPage {
  readonly roleOptions = [
    { value: 'HEADMASTER', label: 'Headmaster', detail: 'Lead your school and manage staff.' },
    { value: 'REGISTRAR', label: 'Registrar', detail: 'Manage admissions and student records.' },
    { value: 'ACADEMIC', label: 'Academic officer', detail: 'Oversee classes and academic progress.' },
    { value: 'TEACHER', label: 'Teacher', detail: 'Open your teaching workspace.' },
    { value: 'BURSAR', label: 'Bursar', detail: 'Open your school finance workspace.' },
  ];
  readonly selectedRole = signal<(typeof this.roleOptions)[number] | null>(null);
  loginForm: FormGroup;
  showPassword = signal<boolean>(false);
  readonly sessionNotice: string;

  constructor(private fb:FormBuilder,private router:Router,route:ActivatedRoute){this.loginForm=this.fb.group({email:['',[Validators.required,Validators.email]],password:['',[Validators.required]],rememberMe:[false]});const requested=route.snapshot.paramMap.get('role');const selected=this.roleOptions.find(role=>role.value===requested)||null;this.selectedRole.set(selected);this.sessionNotice=route.snapshot.queryParamMap.get('session')==='expired'?'Your session expired. Sign in again.':'';if(requested&&!selected)void this.router.navigateByUrl('/auth/login',{replaceUrl:true});}

  togglePassword(): void {
    this.showPassword.update(show => !show);
  }

  readonly auth=inject(AuthService);readonly busy=signal(false);readonly error=signal('');async onSubmit():Promise<void>{const role=this.selectedRole();if(this.loginForm.invalid||this.busy()||!role)return;this.busy.set(true);this.error.set('');try{const {email,password,rememberMe}=this.loginForm.value;await this.auth.login(email,password,role.value,rememberMe);this.loginForm.get('password')?.reset();await this.router.navigateByUrl(this.auth.landing());}catch(e){this.error.set(this.auth.loginError(e,role.label));}finally{this.busy.set(false);}}
}
