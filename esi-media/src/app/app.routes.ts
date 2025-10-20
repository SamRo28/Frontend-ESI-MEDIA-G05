import { Routes } from '@angular/router';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard';
import { Home } from './home/home';
import { Login } from './login/login';
import { AudioUploadComponent } from './audio-upload/audio-upload.component';
import { VideoUploadComponent } from './video-upload/video-upload.component';
import { Fa2Qr } from './fa2-qr/fa2-qr';
import { Fa2Guard } from './guards/fa2.guard';
import { Fa2Code } from './fa2-code/fa2-code';
import { Fa3Code } from './fa3-code/fa3-code';
import { Fa2CodeGuard } from './guards/fa2code.guard';
import { Fa3CodeGuard } from './guards/fa3code.guard';
import { RegistroVisualizadorComponent } from './registro-visualizador/registro-visualizador.component';
import { VisuDashboard } from './visu-dashboard/visu-dashboard';
import { GestorDashboardComponent } from './gestor-dashboard/gestor-dashboard';

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
    path: '2verification',
    component: Fa2Code,
    canActivate: [Fa2CodeGuard]
  },
  {
    path: '3verification',
    component: Fa3Code,
    canActivate: [Fa3CodeGuard]
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'register',
    component: RegistroVisualizadorComponent
  },
  {
    path: 'login',
    component: Login
  },
  {
    path: 'audio/subir',
    component: AudioUploadComponent
  },
  {
    path: 'video/subir',
    component: VideoUploadComponent
  },
  {
    path: 'dashboard',
    component: VisuDashboard
  },
  {
    path: 'gestor-dashboard',
    component: GestorDashboardComponent
  }
];
