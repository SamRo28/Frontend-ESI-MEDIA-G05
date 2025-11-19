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
import { GestorContenidosComponent } from './gestor-contenidos/gestor-contenidos.component';
import { MultimediaListComponent } from './multimedia-list/multimedia-list';
import { MultimediaDetailComponent } from './multimedia-detail/multimedia-detail';
import { MultimediaGuard } from './guards/multimedia.guard';
import { GestionListasComponent } from './gestion-listas/gestion-listas';
import { CrearListaComponent } from './crear-lista/crear-lista';
import { ListaDetailComponent } from './lista-detail/lista-detail';
import { PerfilVisualizadorComponent } from './perfil-visualizador/perfil-visualizador';
import { ForgotPasswordComponent } from './forgot-password/forgot-password';
import { ResetPasswordComponent } from './reset-password/reset-password';
import { ConfirmarActivacionComponent } from './confirmar-activacion/confirmar-activacion';

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
    path: 'confirmar-activacion',
    component: ConfirmarActivacionComponent
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
    path: 'forgot-password', 
    component: ForgotPasswordComponent 
  },
  { 
    path: 'reset-password', 
    component: ResetPasswordComponent 
  },
  {
    path: 'dashboard',
    component: VisuDashboard
  },
  {
    path: 'dashboard/listas',
    component: GestionListasComponent,
    canActivate: [MultimediaGuard]
  },
  {
    path: 'dashboard/listas/crear',
    component: CrearListaComponent,
    canActivate: [MultimediaGuard]
  },
  {
    path: 'dashboard/listas/:id',
    component: ListaDetailComponent,
    canActivate: [MultimediaGuard],
    data: { prerender: false }
  },
  {
    path: 'perfil',
    component: PerfilVisualizadorComponent
  },
  {
    path: 'gestor-dashboard',
    component: GestorDashboardComponent
  },
  {
    path: 'gestor-dashboard/contenidos',
    component: GestorContenidosComponent,
    canActivate: [MultimediaGuard]
  },
  {
    // Ruta legacy eliminada: la vista principal vive en /dashboard.
    // Se mantienen redirecciones más abajo para preservar enlaces antiguos.
    path: 'multimedia',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard/videos',
    component: VisuDashboard,
    canActivate: [MultimediaGuard]
  },
  {
    path: 'dashboard/audios',
    component: VisuDashboard,
    canActivate: [MultimediaGuard]
  },
  {
    path: 'dashboard/listas-publicas',
    component: VisuDashboard,
    canActivate: [MultimediaGuard]
  },
  {
    path: 'dashboard/:id',
    component: MultimediaDetailComponent,
    canActivate: [MultimediaGuard],
    data: { prerender: false }
  },
  // Redirecciones legacy desde /multimedia* a /dashboard*
  { path: 'multimedia', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'multimedia/videos', redirectTo: 'dashboard/videos', pathMatch: 'full' },
  { path: 'multimedia/audios', redirectTo: 'dashboard/audios', pathMatch: 'full' },
  { path: 'multimedia/:id', redirectTo: 'dashboard/:id', pathMatch: 'full', data: { prerender: false } },
  {

    path: 'gestor-dashboard/gestion-listas',
    component: GestionListasComponent,
    canActivate: [MultimediaGuard]
  },
  {
    path: 'gestor-dashboard/gestion-listas/crear',
    component: CrearListaComponent,
    canActivate: [MultimediaGuard]
  },
  {
    path: 'gestor-dashboard/gestion-listas/:id',
    component: ListaDetailComponent,
    canActivate: [MultimediaGuard],
    data: { prerender: false }
  }
];
