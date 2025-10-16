import { Routes } from '@angular/router';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard';
import { Home } from './home/home';
import { Login } from './login/login';
import { RegistroVisualizadorComponent } from './registro-visualizador/registro-visualizador.component';

export const routes: Routes = [
  {
    path: 'home',
    component: Home
  },
  {
    path: 'admin',
    component: AdminDashboardComponent
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
