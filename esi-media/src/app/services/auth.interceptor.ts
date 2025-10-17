import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Interceptor funcional para agregar automáticamente el token de autorización
 * a todas las peticiones HTTP hacia los endpoints del gestor.
 * 
 * TEMPORAL: Solo para desarrollo hasta integrar con el sistema de auth real.
 * Cuando esté listo el sistema de autenticación del compañero, este interceptor
 * se podrá adaptar fácilmente para usar el token real.
 */
export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> => {
  // Solo agregar el token a peticiones hacia nuestro backend
  if (req.url.includes('localhost:8080/gestor')) {
    
    // Determinar qué token usar según el endpoint
    let mockToken: string;
    
    if (req.url.includes('/audio/subir')) {
      // Token para gestor de audio (nueva notación)
      mockToken = 'mock-token-audio-new';
    } else if (req.url.includes('/video/subir')) {
      // Token para gestor de video (nueva notación)  
      mockToken = 'mock-token-video-new';
    } else {
      // Token por defecto (audio)
      mockToken = 'mock-token-audio-new';
    }
    
    // Agregar el header de autorización
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${mockToken}`
      }
    });
    
    return next(authReq);
  }
  
  // Para otras peticiones, continuar sin modificar
  return next(req);
};