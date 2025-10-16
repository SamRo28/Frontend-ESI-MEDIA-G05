import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class Fa2Guard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    // Accesso permitido solo si la navegación aporta extras.state.allowFa2 === true
    // Router.navigate with { state } copies the state into history.state — usaremos eso.
    const historyAllow = (history && (history.state as any) && (history.state as any).allowFa2) === true;

    if (historyAllow === true) {
      return true;
    }

    // Si no, redirigir a home
    return this.router.parseUrl('/home');
  }
}
