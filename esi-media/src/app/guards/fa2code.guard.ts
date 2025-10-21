import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class Fa2CodeGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    // Permitir acceso solo si la navegación incluye extras.state.allowFa2Code === true
    let navAllow = false;
    const nav = this.router.getCurrentNavigation?.() || null;
    navAllow = !!(nav && (nav.extras as any) && (nav.extras as any).state && (nav.extras as any).state.allowFa2Code === true);

    // Fallback: revisar history.state de forma segura (evitar ReferenceError en SSR)
    const historyAllow = (typeof history !== 'undefined' && (history.state as any) && (history.state as any).allowFa2Code) === true;

    if (navAllow === true || historyAllow === true) {
      return true;
    }

    return this.router.parseUrl('/home');
  }
}
