import { SchoolApiService } from '../../core/services/school-api.service';
import { PortalConnectionComponent } from '../../shared/components/portal-connection.component';
import { AcademicYearSelectorComponent } from '../../shared/components/academic-year-selector.component';
import { BursarStore } from './bursar.store';
import { Component, ElementRef, OnInit, ViewChild, signal, inject } from '@angular/core';
import { Router, RouterOutlet, RouterLink, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';
import {
  IonApp,
  IonSplitPane,
  IonMenu,
  IonHeader,
  IonMenuButton,
} from '@ionic/angular/standalone';
import { BursarSidebarComponent } from './components/bursar-sidebar/bursar-sidebar.component';

@Component({
  selector: 'app-bursar-layout',
  standalone: true,
  host: { class: 'portal-shell' },
  templateUrl: './bursar.layout.html',
  styleUrls: ['./bursar.layout.scss'],
  imports: [PortalConnectionComponent,
    AcademicYearSelectorComponent,
    IonApp,
    IonSplitPane,
    IonMenu,
    RouterOutlet,
    RouterLink,
    IonHeader,
    IonMenuButton,
    BursarSidebarComponent,
  ],
})
export class BursarLayout implements OnInit {
  readonly api=inject(SchoolApiService);

  store = inject(BursarStore);
  @ViewChild('bursarContent') bursarContent?: ElementRef<HTMLElement>;

  pageTitle = signal<string>('');
  pageBreadcrumb = signal<string>('Bursar');
  showScrollTop = signal(false);

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
  ) {}

  ngOnInit(): void { void this.api.enter('BURSAR', new URLSearchParams(location.search).get('school'));
    this.updateTitle();
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => this.updateTitle());
  }

  private updateTitle(): void {
    let route = this.activatedRoute;
    while (route.firstChild) {
      route = route.firstChild;
    }
    route.data.subscribe(data => {
      this.pageTitle.set(data['title'] || 'Overview');
      this.pageBreadcrumb.set(data['breadcrumb'] || 'Bursar');
    });
  }

  onContentScroll(event: Event): void {
    const content = event.target as HTMLElement;
    this.showScrollTop.set(content.scrollTop > 200);
  }

  scrollToTop(): void {
    this.bursarContent?.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
