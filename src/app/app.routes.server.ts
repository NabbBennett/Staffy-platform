import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Dynamic routes that cannot be prerendered without knowing parameter values
  {
    path: 'opportunities/:id/apply',
    renderMode: RenderMode.Server
  },
  {
    path: 'opportunities/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'organization/dashboard',
    renderMode: RenderMode.Server
  },
  {
    path: 'organization/profile',
    renderMode: RenderMode.Server
  },
  {
    path: 'organization/volunteers',
    renderMode: RenderMode.Server
  },
  // Default: prerender static routes
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
