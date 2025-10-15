import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
<<<<<<< HEAD
import { provideHttpClient } from '@angular/common/http';
=======
import { provideHttpClient, withFetch } from '@angular/common/http';
>>>>>>> alvaro

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
<<<<<<< HEAD
    provideRouter(routes), 
    provideClientHydration(withEventReplay()),
    provideHttpClient()
=======
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch())
>>>>>>> alvaro
  ]
};
