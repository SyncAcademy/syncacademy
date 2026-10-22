import { SchoolApiService } from '../../core/services/school-api.service';
import { PortalConnectionComponent } from '../../shared/components/portal-connection.component';
import { AcademicYearSelectorComponent } from '../../shared/components/academic-year-selector.component';
import { CommonModule } from '@angular/common';
import { HeadStore } from './head.store';
import { ReportStore } from './report.store';
import { Component, ElementRef, OnInit, ViewChild, signal, inject, computed } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';
import {
  IonApp,
  IonSplitPane,
  IonMenu,
  IonHeader,
  IonMenuButton,
} from '@ionic/angular/standalone';
import { HeadSidebarComponent } from './components/head-sidebar/head-sidebar.component';
import { NotificationBellComponent } from '../../shared/notifications/notification-bell.component';
import { LoadingSkeletonComponent } from '../../shared/loading-skeleton.component';
import { AcademicDataService } from '../../core/services/academic-data.service';

@Component({
  selector: 'app-headmaster-layout',
  standalone: true,
  host: { class: 'portal-shell' },
  templateUrl: './headmaster.layout.html',
  styleUrls: ['./headmaster.layout.scss'],
  imports: [PortalConnectionComponent, NotificationBellComponent, LoadingSkeletonComponent,
    AcademicYearSelectorComponent,
    IonApp,
    IonSplitPane,
    IonMenu,
    RouterOutlet,
    CommonModule,
    IonHeader,
    IonMenuButton,
    HeadSidebarComponent,
  ],
})
export class HeadmasterLayout implements OnInit {
  readonly api=inject(SchoolApiService);
  readonly academicData=inject(AcademicDataService);

  store = inject(HeadStore);
  reports = inject(ReportStore);
  showNotifications = signal(false);
  pendingReportCount = computed(() => 0);
  pendingInvitationCount = computed(() => this.store.invitations().filter(i=>i.status==='active'&&Date.parse(i.expiresAt)>Date.now()).length);
  notificationCount = computed(() => this.pendingInvitationCount() + this.pendingReportCount());
  @ViewChild('headContent') headContent?: ElementRef<HTMLElement>;

  pageTitle = signal<string>('');
  pageBreadcrumb = signal<string>('Headmaster');
  menuOpen = false;
  showScrollTop = signal(false);

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
  ) {}

  ngOnInit(): void { void this.api.enter('HEADMASTER', new URLSearchParams(location.search).get('school'));
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
      this.pageTitle.set(data['title'] || 'Dashboard');
      this.pageBreadcrumb.set(data['breadcrumb'] || 'Headmaster');
    });
  }

  onContentScroll(event: Event): void {
    const content = event.target as HTMLElement;
    this.showScrollTop.set(content.scrollTop > 200);
  }

  scrollToTop(): void {
    this.headContent?.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
