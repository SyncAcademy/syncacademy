import { Component, HostListener, OnInit, signal } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, map, mergeMap } from 'rxjs/operators';
import { 
  IonApp,
  IonSplitPane, 
  IonMenu, 
  IonContent, 
  IonRouterOutlet, 
  IonHeader, 
  IonToolbar, 
  IonButtons, 
  IonMenuButton, 
  IonTitle 
} from '@ionic/angular/standalone';
import { MenuController } from '@ionic/angular';
import { SidebarComponent } from './components/sidebar/sidebar.component';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  templateUrl: './dashboard.layout.html',
  styleUrls: ['./dashboard.layout.scss'],
  imports: [
    IonApp,
    IonSplitPane, 
    IonMenu, 
    IonContent, 
    IonRouterOutlet, 
    IonHeader, 
    IonToolbar, 
    IonButtons, 
    IonMenuButton, 
    IonTitle,
    SidebarComponent
  ]
})
export class DashboardLayout implements OnInit {
  pageTitle = signal<string>('');

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private menuController: MenuController
  ) {}

  ngOnInit() {
    // Get initial title
    this.updateTitle();

    // Listen for route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateTitle();
      void this.menuController.close('main-menu');
    });
  }

  @HostListener('document:pointerdown', ['$event'])
  @HostListener('document:touchstart', ['$event'])
  @HostListener('document:click', ['$event'])
  closeMenuWhenTouchingOutside(event: Event) {
    if (!window.matchMedia('(max-width: 991px)').matches) {
      return;
    }

    const menu = document.querySelector('ion-menu');
    const target = event.target;

    if (menu && target instanceof Node && !menu.contains(target)) {
      void (menu as HTMLIonMenuElement).close();
    }
  }

  private updateTitle() {
    let route = this.activatedRoute;
    while (route.firstChild) {
      route = route.firstChild;
    }
    route.data.subscribe(data => {
      this.pageTitle.set(data['title'] || 'Dashboard');
    });
  }
}
