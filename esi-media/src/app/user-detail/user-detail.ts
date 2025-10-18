import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService, PerfilDetalle, Usuario } from '../services/admin.service';

@Component({
  selector: 'app-user-detail',
  template: `
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="max-w-3xl mx-auto">
      <button class="mb-4 text-blue-600 hover:underline" (click)="goBack()">← Volver</button>

      <div class="bg-white rounded-xl shadow p-6 border">
        <h1 class="text-2xl font-bold mb-4">Perfil de Usuario</h1>

        <div *ngIf="loading" class="text-gray-500">Cargando...</div>
        <div *ngIf="error" class="text-red-600">{{ error }}</div>

        <div *ngIf="perfil && !loading" class="space-y-3">
          <div class="flex items-center gap-4">
            <img *ngIf="perfil.foto" [src]="'/' + perfil.foto" class="w-20 h-20 rounded-full object-cover border" />
            <div>
              <div class="text-xl font-semibold">{{ perfil.nombre }} {{ perfil.apellidos }}</div>
              <div class="text-gray-600">{{ perfil.email }}</div>
              <div class="mt-1 inline-block px-2 py-0.5 text-xs rounded"
                   [ngClass]="{
                     'bg-amber-100 text-amber-700': perfil.rol === 'Administrador',
                     'bg-blue-100 text-blue-700': perfil.rol === 'Gestor',
                     'bg-gray-100 text-gray-700': perfil.rol === 'Visualizador'
                   }">{{ perfil.rol }}</div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div *ngIf="perfil.departamento">
              <div class="text-sm text-gray-500">Departamento</div>
              <div class="font-medium">{{ perfil.departamento }}</div>
            </div>
            <div *ngIf="perfil.alias">
              <div class="text-sm text-gray-500">Alias</div>
              <div class="font-medium">{{ perfil.alias }}</div>
            </div>
            <div *ngIf="perfil.descripcion">
              <div class="text-sm text-gray-500">Descripción</div>
              <div class="font-medium">{{ perfil.descripcion }}</div>
            </div>
            <div *ngIf="perfil.especialidad">
              <div class="text-sm text-gray-500">Especialidad</div>
              <div class="font-medium">{{ perfil.especialidad }}</div>
            </div>
            <div *ngIf="perfil.tipoContenido">
              <div class="text-sm text-gray-500">Tipo de contenido</div>
              <div class="font-medium">{{ perfil.tipoContenido }}</div>
            </div>
            <div *ngIf="perfil.vip !== undefined">
              <div class="text-sm text-gray-500">VIP</div>
              <div class="font-medium">{{ perfil.vip ? 'Sí' : 'No' }}</div>
            </div>
            <div *ngIf="perfil.edad">
              <div class="text-sm text-gray-500">Edad</div>
              <div class="font-medium">{{ perfil.edad }}</div>
            </div>
            <div *ngIf="perfil.fechaRegistro">
              <div class="text-sm text-gray-500">Fecha de registro</div>
              <div class="font-medium">{{ perfil.fechaRegistro | date: 'longDate' }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  `,
  standalone: true,
  imports: [CommonModule]
})
export class UserDetailComponent implements OnInit {
  perfil: PerfilDetalle | null = null;
  loading = true;
  error = '';
  private adminId: string | null = null;
  private usuariosCache: Usuario[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminService: AdminService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'ID de usuario no válido';
      this.loading = false;
      return;
    }
    this.resolveAdminId();
    if (!this.adminId) {
      this.error = 'No hay administrador autenticado';
      this.loading = false;
      return;
    }
    this.adminService.obtenerPerfil(id, this.adminId).subscribe({
      next: perfil => {
        this.perfil = perfil;
        this.loading = false;
      },
      error: err => {
        this.error = err?.error?.error || 'Error al cargar el perfil';
        this.loading = false;
      }
    });
  }

  private resolveAdminId() {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const currentUserRaw = localStorage.getItem('currentUser');
      const current = currentUserRaw ? JSON.parse(currentUserRaw) : null;
      this.adminId = current?.id || null;
      if (!this.adminId && current?.email) {
        // optional improvement: if you had a list in storage
        const cacheRaw = sessionStorage.getItem('usuarios');
        this.usuariosCache = cacheRaw ? JSON.parse(cacheRaw) : [];
        const admin = this.usuariosCache.find(u => u.email === current.email) as any;
        if (admin?.id) this.adminId = admin.id;
      }
    } catch {
      this.adminId = null;
    }
  }

  goBack() {
    this.router.navigate(['/admin-dashboard']);
  }
}
