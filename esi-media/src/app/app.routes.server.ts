import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'home',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'register',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'login',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'forgot-password',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'reset-password',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'confirmar-activacion',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'dashboard/listas/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'dashboard/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'multimedia/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'gestor-dashboard/gestion-listas/:id',
    renderMode: RenderMode.Server
  },
  {
    path: '**',
    renderMode: RenderMode.Server
  }
];
