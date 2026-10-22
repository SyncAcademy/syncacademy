import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { networkActivityInterceptor } from './app/core/services/network-activity.service';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes, withInMemoryScrolling({
      anchorScrolling: 'enabled',
      scrollPositionRestoration: 'top'
    })),
    provideIonicAngular({ mode: 'md' }),
    provideHttpClient(withInterceptors([networkActivityInterceptor]))
  ],
}).catch(err => console.error(err));
