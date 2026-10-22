import { SchoolApiService } from '../../core/services/school-api.service';
import { PortalConnectionComponent } from '../../shared/components/portal-connection.component';
import { AcademicYearSelectorComponent } from '../../shared/components/academic-year-selector.component';
import { RegistrarStore } from './registrar.store';
import { Component, ElementRef, OnInit, ViewChild, signal, inject } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';
import {
  IonApp,
  IonSplitPane,
  IonMenu,
  IonHeader,
  IonMenuButton,
} from '@ionic/angular/standalone';
import { RegistrarSidebarComponent } from './components/registrar-sidebar/registrar-sidebar.component';
import { NotificationBellComponent } from '../../shared/notifications/notification-bell.component';
import { LoadingSkeletonComponent } from '../../shared/loading-skeleton.component';

@Component({
  selector: 'app-registrar-layout',
  standalone: true,
  host: { class: 'portal-shell' },
  templateUrl: './registrar.layout.html',
  styleUrls: ['./registrar.layout.scss'],
  imports: [PortalConnectionComponent, NotificationBellComponent, LoadingSkeletonComponent,
    AcademicYearSelectorComponent,
    IonApp,
    IonSplitPane,
    IonMenu,
    RouterOutlet,
    IonHeader,
    IonMenuButton,
    RegistrarSidebarComponent,
  ],
})
export class RegistrarLayout implements OnInit {
  readonly api=inject(SchoolApiService);

  store = inject(RegistrarStore);
  @ViewChild('registrarContent') registrarContent?: ElementRef<HTMLElement>;

  pageTitle = signal<string>('');
  pageBreadcrumb = signal<string>('Registrar');
  menuOpen = false;
  showScrollTop = signal(false);

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
  ) {}

  ngOnInit(): void { void this.api.enter('REGISTRAR', new URLSearchParams(location.search).get('school'));
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
      this.pageBreadcrumb.set(data['breadcrumb'] || 'Registrar');
    });
  }

  onContentScroll(event: Event): void {
    const content = event.target as HTMLElement;
    this.showScrollTop.set(content.scrollTop > 200);
  }

  scrollToTop(): void {
    this.registrarContent?.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
