import { SchoolApiService } from '../../core/services/school-api.service';
import { PortalConnectionComponent } from '../../shared/components/portal-connection.component';
import { AcademicYearSelectorComponent } from '../../shared/components/academic-year-selector.component';
import { CommonModule } from '@angular/common';
import { HeadDemoStore } from './head-demo.store';
import { ReportDemoStore } from './report-demo.store';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import { Component, ElementRef, OnInit, ViewChild, signal, inject, computed } from '@angular/core';
import { Router, RouterOutlet, RouterLink, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';
import {
  IonApp,
  IonSplitPane,
  IonMenu,
  IonHeader,
  IonMenuButton,
} from '@ionic/angular/standalone';
import { HeadSidebarComponent } from './components/head-sidebar/head-sidebar.component';

@Component({
  selector: 'app-headmaster-layout',
  standalone: true,
  host: { class: 'portal-shell' },
  templateUrl: './headmaster.layout.html',
  styleUrls: ['./headmaster.layout.scss'],
  imports: [PortalConnectionComponent,
    AcademicYearSelectorComponent,
    IonApp,
    IonSplitPane,
    IonMenu,
    RouterOutlet,
    RouterLink,
    CommonModule,
    DialogFocusDirective,
    IonHeader,
    IonMenuButton,
    HeadSidebarComponent,
  ],
})
export class HeadmasterLayout implements OnInit {
  readonly api=inject(SchoolApiService);

  store = inject(HeadDemoStore);
  reports = inject(ReportDemoStore);
  showNotifications = signal(false);
  notificationCount = computed(() => this.store.pending().length + this.reports.stats().failed);
  @ViewChild('headContent') headContent?: ElementRef<HTMLElement>;

  pageTitle = signal<string>('');
  pageBreadcrumb = signal<string>('Headmaster');
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
