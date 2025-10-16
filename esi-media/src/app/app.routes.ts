import { Routes } from '@angular/router';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard';
import { Home } from './home/home';
import { Login } from './login/login';
import { Fa2Qr } from './fa2-qr/fa2-qr';
import { Fa2Guard } from './guards/fa2.guard';
import { RegistroVisualizadorComponent } from './registro-visualizador/registro-visualizador.component';

export const routes: Routes = [
  {
    path: 'home',
    component: Home
  },
  {
    path: 'admin-dashboard',
    component: AdminDashboardComponent
  },
  {
    path: '2fa',
    component: Fa2Qr,
    canActivate: [Fa2Guard]
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'registro',
    component: RegistroVisualizadorComponent
  },
  {
    path: 'login',
    component: Login
  }
];
