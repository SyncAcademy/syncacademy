import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, signal, inject, computed, effect } from '@angular/core';
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
import { NotificationBellComponent } from '../../shared/notifications/notification-bell.component';
import { LoadingSkeletonComponent } from '../../shared/loading-skeleton.component';

@Component({
  selector: 'app-super-admin-layout',
  standalone: true,
  host: { class: 'portal-shell' },
  templateUrl: './super-admin.layout.html',
  styleUrls: ['./super-admin.layout.scss'],
  imports: [
    NotificationBellComponent,
    LoadingSkeletonComponent,
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
  menuOpen = false;
  showScrollTop = signal(false);
  showNotifications = signal(false);

  search = signal('');
  searchResults = signal<{id:string;label:string;type:string;route:string}[]>([]);
  private searchSeq=0;

  alertCount = computed(() => {
    return this.store.attention().length;
  });

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
  ) {effect(()=>{const q=this.search().trim();const seq=++this.searchSeq;this.searchResults.set([]);if(q.length<2)return;setTimeout(async()=>{if(seq!==this.searchSeq)return;try{const result=await this.store.auth.request('GET','platform/search?q='+encodeURIComponent(q));if(seq===this.searchSeq)this.searchResults.set([...result.schools.map((school:any)=>({id:school.id,label:school.name,type:'School',route:'/super-admin/schools'})),...result.leads.map((lead:any)=>({id:lead.id,label:lead.schoolName,type:'Lead',route:'/super-admin/leads'}))]);}catch{if(seq===this.searchSeq)this.searchResults.set([]);}},250);});}

  ngOnInit(): void { void this.store.load();
    this.updateTitle();
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateTitle();
        this.saContent?.nativeElement.scrollTo({ top: 0, behavior: 'instant' });
        this.showScrollTop.set(false);
      });
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
