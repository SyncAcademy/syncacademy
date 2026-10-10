import { AcademicDataService } from '../../core/services/academic-data.service';
import { SchoolApiService } from '../../core/services/school-api.service';
import { PortalConnectionComponent } from '../../shared/components/portal-connection.component';
import { AcademicYearSelectorComponent } from '../../shared/components/academic-year-selector.component';
import { AcademicStore } from './academic.store';
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
import { AcademicSidebarComponent } from './components/academic-sidebar/academic-sidebar.component';
import { NotificationBellComponent } from '../../shared/notifications/notification-bell.component';
import { LoadingSkeletonComponent } from '../../shared/loading-skeleton.component';

@Component({
  selector: 'app-academic-layout',
  standalone: true,
  host: { class: 'portal-shell' },
  templateUrl: './academic.layout.html',
  styleUrls: ['./academic.layout.scss'],
  imports: [PortalConnectionComponent, NotificationBellComponent, LoadingSkeletonComponent,
    AcademicYearSelectorComponent,
    IonApp,
    IonSplitPane,
    IonMenu,
    RouterOutlet,
    IonHeader,
    IonMenuButton,
    AcademicSidebarComponent,
  ],
})
export class AcademicLayout implements OnInit {
  readonly academicData=inject(AcademicDataService);
  readonly api=inject(SchoolApiService);

  store = inject(AcademicStore);
  @ViewChild('academicContent') academicContent?: ElementRef<HTMLElement>;

  pageTitle = signal<string>('');
  pageBreadcrumb = signal<string>('Academic');
  showScrollTop = signal(false);

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
  ) {}

  ngOnInit(): void { void this.api.enter('ACADEMIC', new URLSearchParams(location.search).get('school'));
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
      this.pageBreadcrumb.set(data['breadcrumb'] || 'Academic');
    });
  }

  onContentScroll(event: Event): void {
    const content = event.target as HTMLElement;
    this.showScrollTop.set(content.scrollTop > 200);
  }

  scrollToTop(): void {
    this.academicContent?.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
