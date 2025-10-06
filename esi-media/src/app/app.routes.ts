import { Routes } from '@angular/router';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard';

export const routes: Routes = [
  {
    path: 'admin',
    component: AdminDashboardComponent
  },
  {
    path: '',
    redirectTo: 'admin',
    pathMatch: 'full'
  }
];