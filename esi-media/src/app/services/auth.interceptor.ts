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
    
    // Token temporal para desarrollo
    const mockToken = 'mock-token-for-development';
    
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