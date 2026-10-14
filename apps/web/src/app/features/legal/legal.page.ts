import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LogoComponent } from '../../shared/components/logo/logo.component';
import { PublicFooterComponent } from '../../shared/components/public-footer/public-footer.component';

@Component({
  standalone: true,
  imports: [RouterLink, LogoComponent, PublicFooterComponent],
  templateUrl: './legal.page.html',
  styleUrls: ['./legal.page.scss'],
})
export class LegalPage {
  private readonly route = inject(ActivatedRoute);
  readonly isPrivacy = this.route.snapshot.data['document'] === 'privacy';
}
