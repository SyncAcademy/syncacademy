import { CommonModule } from '@angular/common';
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
import { SuperAdminSidebarComponent } from './components/super-admin-sidebar/super-admin-sidebar.component';
import { SuperAdminStore } from './super-admin.store';

@Component({
  selector: 'app-super-admin-layout',
  standalone: true,
  host: { class: 'portal-shell' },
  templateUrl: './super-admin.layout.html',
  styleUrls: ['./super-admin.layout.scss'],
  imports: [
    IonApp,
    IonSplitPane,
    IonMenu,
    RouterOutlet,
    RouterLink,
    CommonModule,
    IonHeader,
    IonMenuButton,
    SuperAdminSidebarComponent,
  ],
})
export class SuperAdminLayout implements OnInit {
  store = inject(SuperAdminStore);
  @ViewChild('saContent') saContent?: ElementRef<HTMLElement>;

  pageTitle = signal<string>('');
  pageBreadcrumb = signal<string>('Super Admin');
  showScrollTop = signal(false);
  showNotifications = signal(false);

  search = signal('');
  searchResults = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return [];
    return [...this.store.schools().filter(s => s.name.toLowerCase().includes(q) || s.contactName.toLowerCase().includes(q)).map(s => ({ id: s.id, label: s.name, type: 'School', route: '/super-admin/schools' })), ...this.store.leads().filter(l => l.schoolName.toLowerCase().includes(q) || l.contactName.toLowerCase().includes(q)).map(l => ({ id: l.id, label: l.schoolName, type: 'Lead', route: '/super-admin/leads' }))].slice(0, 8);
  });

  alertCount = computed(() => {
    return this.store.attention().length;
  });

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
  ) {}

  ngOnInit(): void { void this.store.load();
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
      this.pageBreadcrumb.set(data['breadcrumb'] || 'Super Admin');
    });
  }

  onContentScroll(event: Event): void {
    const content = event.target as HTMLElement;
    this.showScrollTop.set(content.scrollTop > 200);
  }

  scrollToTop(): void {
    this.saContent?.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
