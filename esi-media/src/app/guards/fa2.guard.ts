import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class Fa2Guard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    // Accesso permitido solo si la navegación aporta extras.state.allowFa2 === true
    // Primero intentamos leer la navegación actual (extras.state) — disponible durante la navegación.
    let navAllow = false;
    const nav = this.router.getCurrentNavigation?.() || null;
    navAllow = !!(nav && (nav.extras as any) && (nav.extras as any).state && (nav.extras as any).state.allowFa2 === true);

    // Fallback: si por alguna razón getCurrentNavigation no contiene el estado, usamos history.state de forma segura
    const historyAllow = (typeof history !== 'undefined' && (history.state as any) && (history.state as any).allowFa2) === true;

    if (navAllow === true || historyAllow === true) {
      return true;
    }

    // Si no, redirigir a home
    return this.router.parseUrl('/home');
  }
}
