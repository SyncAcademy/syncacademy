import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LogoComponent } from '../logo/logo.component';

@Component({
  selector: 'app-public-footer',
  standalone: true,
  imports: [RouterLink, LogoComponent],
  templateUrl: './public-footer.component.html',
  styleUrls: ['./public-footer.component.scss'],
})
export class PublicFooterComponent {}
