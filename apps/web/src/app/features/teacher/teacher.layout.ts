import { SchoolApiService } from '../../core/services/school-api.service';
import { PortalConnectionComponent } from '../../shared/components/portal-connection.component';
import { AcademicYearSelectorComponent } from '../../shared/components/academic-year-selector.component';
import { TeacherDemoStore } from './teacher-demo.store';
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
import { TeacherSidebarComponent } from './components/teacher-sidebar/teacher-sidebar.component';

@Component({
  selector: 'app-teacher-layout',
  standalone: true,
  host: { class: 'portal-shell' },
  templateUrl: './teacher.layout.html',
  styleUrls: ['./teacher.layout.scss'],
  imports: [PortalConnectionComponent,
    AcademicYearSelectorComponent,
    IonApp,
    IonSplitPane,
    IonMenu,
    RouterOutlet,
    RouterLink,
    IonHeader,
    IonMenuButton,
    TeacherSidebarComponent,
  ],
})
export class TeacherLayout implements OnInit {
  readonly api=inject(SchoolApiService);

  store = inject(TeacherDemoStore);
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
