import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LogoComponent } from '../../shared/components/logo/logo.component';

@Component({
  selector: 'app-parent-activation',
  standalone: true,
  imports: [LogoComponent],
  template: `<main class="activation"><section class="card"><app-logo></app-logo><h1>Activate your parent account</h1><p>Open this invitation on a phone with the SyncAcademy Parents app installed. If the app is not installed, ask your school for its installation link or install it through your school's approved distribution method.</p>@if (token) { <p>After installing, choose <strong>Activate your account</strong> and enter this invitation code:</p><output>{{ token }}</output><p>The invitation expires 48 hours after it was sent. Viewing this page does not use the code.</p> } @else { <p>This link has no invitation code. Ask your school to resend the invitation.</p> }</section></main>`,
  styles: [`.activation{min-height:100dvh;display:grid;place-items:center;padding:24px;background:#f8fafc}.card{width:min(100%,560px);padding:clamp(20px,5vw,40px);background:white;border:1px solid #e2e8f0;border-radius:14px;box-shadow:0 20px 60px #0f172310;color:#172338}.card h1{font-size:1.5rem;margin:28px 0 12px}.card p{line-height:1.6;color:#475569}.card output{display:block;padding:16px;border-radius:8px;background:#fff7ed;color:#92400e;font-family:monospace;font-size:1.1rem;letter-spacing:.04em;overflow-wrap:anywhere}`],
})
export class ParentActivationPage {
  readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token') || '';
  constructor() { if (this.token) history.replaceState(null, '', '/parent/activate'); }
}
