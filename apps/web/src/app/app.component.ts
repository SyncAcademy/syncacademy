import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [RouterOutlet, CommonModule]
})
export class AppComponent implements OnInit {
  showPreloader = true;
  fadePreloader = false;

  ngOnInit(): void {
    window.setTimeout(() => {
      this.fadePreloader = true;
      window.setTimeout(() => {
        this.showPreloader = false;
      }, 800);
    }, 1800);
  }
}
