import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';

/**
 * Guard simplificado. La autenticación ahora se gestiona mediante cookies HttpOnly.
 * El backend validará automáticamente la cookie en cada petición.
 * Este guard ahora solo verifica que exista información de usuario en sessionStorage.
 */
@Injectable({ providedIn: 'root' })
export class MultimediaGuard implements CanActivate {
  constructor(private readonly router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    // Evitar errores en SSR
    const hasWindow = globalThis.window !== undefined;
    const hasSessionStorage = hasWindow && typeof sessionStorage !== 'undefined';

    let token = hasSessionStorage ? (sessionStorage.getItem('token') || '') : '';
    // Fallbacks por si el token se guardó en localStorage con otra clave
    if (!token && hasWindow) {
      try {
        token = localStorage.getItem('authToken') || localStorage.getItem('userToken') || localStorage.getItem('currentUserToken') || '';
      } catch {}
    }

    // Log de depuración eliminado para reducir ruido
    // Verificar si hay información de usuario en sessionStorage
    const hasUser = hasSessionStorage && sessionStorage.getItem('user');

    if (hasUser) {
      return true;
    }
    
    // Redirigir a login y preservar returnUrl para volver tras autenticación
    return this.router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
}
