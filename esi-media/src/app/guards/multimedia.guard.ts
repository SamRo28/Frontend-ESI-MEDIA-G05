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
    const hasSessionStorage = globalThis.window !== undefined && typeof sessionStorage !== 'undefined';

    // Log de depuración eliminado para reducir ruido
    // Verificar si hay información de usuario en sessionStorage
    const hasUser = hasSessionStorage && sessionStorage.getItem('user');

    if (!hasUser) {
      // Redirigir a login y preservar returnUrl para volver tras autenticación
      return this.router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }

    // Si la ruta especifica un tipo de usuario esperado, comprobarlo
    const expectedTipo = (route && route.data && (route.data as any).tipoUsuario) ? String((route.data as any).tipoUsuario) : null;
    if (expectedTipo) {
      try {
        const stored = hasSessionStorage ? (sessionStorage.getItem('currentUserClass') || '') : '';
        if (stored && stored === expectedTipo) {
          return true;
        }
        // Si no coincide el tipo de usuario, denegar acceso y redirigir a home
        return this.router.parseUrl('/login');
      } catch (e) {
        return this.router.parseUrl('/login');
      }
    }

    return true;
  }
}
