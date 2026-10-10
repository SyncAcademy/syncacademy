import { AcademicDataService } from '../../core/services/academic-data.service';
import { SchoolApiService } from '../../core/services/school-api.service';
import { PortalConnectionComponent } from '../../shared/components/portal-connection.component';
import { AcademicYearSelectorComponent } from '../../shared/components/academic-year-selector.component';
import { TeacherStore } from './teacher.store';
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
import { TeacherSidebarComponent } from './components/teacher-sidebar/teacher-sidebar.component';
import { NotificationBellComponent } from '../../shared/notifications/notification-bell.component';
import { LoadingSkeletonComponent } from '../../shared/loading-skeleton.component';

@Component({
  selector: 'app-teacher-layout',
  standalone: true,
  host: { class: 'portal-shell' },
  templateUrl: './teacher.layout.html',
  styleUrls: ['./teacher.layout.scss'],
  imports: [PortalConnectionComponent, NotificationBellComponent, LoadingSkeletonComponent,
    AcademicYearSelectorComponent,
    IonApp,
    IonSplitPane,
    IonMenu,
    RouterOutlet,
    IonHeader,
    IonMenuButton,
    TeacherSidebarComponent,
  ],
})
export class TeacherLayout implements OnInit {
  readonly academicData=inject(AcademicDataService);
  readonly api=inject(SchoolApiService);

  store = inject(TeacherStore);
  @ViewChild('teacherContent') teacherContent?: ElementRef<HTMLElement>;

  pageTitle = signal<string>('');
  pageBreadcrumb = signal<string>('Teacher');
  showScrollTop = signal(false);

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
  ) {}

  ngOnInit(): void { void this.api.enter('TEACHER', new URLSearchParams(location.search).get('school'));
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
      this.pageTitle.set(data['title'] || 'My Assignments');
      this.pageBreadcrumb.set(data['breadcrumb'] || 'Teacher');
    });
  }

  onContentScroll(event: Event): void {
    const content = event.target as HTMLElement;
    this.showScrollTop.set(content.scrollTop > 200);
  }

  scrollToTop(): void {
    this.teacherContent?.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
