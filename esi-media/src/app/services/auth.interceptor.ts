import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment';

/**
 * Interceptor funcional para configurar las peticiones HTTP con withCredentials
 * para permitir el envío automático de cookies HttpOnly (JWT) al backend.
 * El navegador gestiona las cookies automáticamente.
 */
export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> => {
  
  const platformId = inject(PLATFORM_ID);

  // Si no estamos en el navegador (SSR), NO INTERCEPTAR
  if (!isPlatformBrowser(platformId)) {
    return next(req);
  }

  // Añadir withCredentials a todas las peticiones hacia nuestro backend
  // Esto permite que el navegador envíe automáticamente las cookies HttpOnly
  if (req.url.includes(environment.apiUrl)) {
    const authReq = req.clone({ 
      withCredentials: true 
    });
    return next(authReq);
  }
  
  // Para otras peticiones externas, continuar sin modificar
  return next(req);
}