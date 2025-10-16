import { Routes } from '@angular/router';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard';
import { Home } from './home/home';
import { Login } from './login/login';
import { Fa2Qr } from './fa2-qr/fa2-qr';
import { Fa2Guard } from './guards/fa2.guard';

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
    path: 'login',
    component: Login
  }
];
