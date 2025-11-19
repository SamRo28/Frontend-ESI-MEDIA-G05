import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class MultimediaGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    // Evitar errores en SSR: sessionStorage solo existe en navegador
    const hasWindow = typeof window !== 'undefined';
    const hasSessionStorage = hasWindow && typeof sessionStorage !== 'undefined';

    let token = hasSessionStorage ? (sessionStorage.getItem('token') || '') : '';
    // Fallbacks por si el token se guardó en localStorage con otra clave
    if (!token && hasWindow) {
      try {
        token = localStorage.getItem('authToken') || localStorage.getItem('userToken') || localStorage.getItem('currentUserToken') || '';
      } catch {}
    }

    // Log de depuración eliminado para reducir ruido

    if (token && token.trim().length > 0) {
      return true;
    }
    // Redirigir a login y preservar returnUrl para volver tras autenticación
    return this.router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
}
