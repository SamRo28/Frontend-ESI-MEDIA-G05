import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Interceptor funcional para agregar automáticamente el token de autorización
 * a todas las peticiones HTTP hacia los endpoints del gestor.
 * 
 */
export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> => {
  
  const platformId = inject(PLATFORM_ID);

  // Si no estamos en el navegador (SSR), NO INTERCEPTAR - deja que la petición continúe sin token
  // El componente se encargará de recargar cuando esté en el navegador
  if (!isPlatformBrowser(platformId)) {
    console.log('� INTERCEPTOR - SSR detectado, saltando interceptor para:', req.url);
    return next(req);
  }

  // Solo agregar el token a peticiones hacia nuestro backend
  if (req.url.includes('localhost:8080/gestor') || req.url.includes('localhost:8080/users/listar')) {


    let token = '';

    // Acceder a sessionStorage directamente (ya sabemos que estamos en el navegador)
    try {
      token = sessionStorage.getItem('token') || '';
    } catch (error) {
      console.error('Error accediendo a sessionStorage:', error);
    }

    // Agregar el header de autorización si hay token
    if (token) {

      const authReq = req.clone({
        setHeaders: {
          Authorization: `${token}`
        }
      });

      return next(authReq);
    }
  }
  // Para otras peticiones o sin token, continuar sin modificar
  return next(req);

}