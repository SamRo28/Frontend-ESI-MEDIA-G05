import { Component, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AdminService } from '../services/admin.service';

// Importar los componentes refactorizados
import { UserListComponent } from '../user-list.component/user-list.component';
import { ContentManagementComponent } from '../content-management.component/content-management.component';
import { SettingsComponent } from '../settings.component/settings.component';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterModule,
    UserListComponent,            // ✅ Lista de usuarios
    ContentManagementComponent,   // ✅ Gestión de contenidos
    SettingsComponent            // ✅ Configuración
  ]
})
export class AdminDashboardComponent implements OnInit {
  activeTab = 'inicio';
  
  // Información del usuario actual
  currentUser: any = null;
  
  // Estadísticas para la vista de inicio
  totalUsuarios = 0;
  usuariosActivos = 0;
  usuariosBloqueados = 0;
  administradores = 0;
  totalContenidos = 0;
  contenidosActivos = 0;
  
  // Admin ID para pasar a componentes hijos
  adminId?: string;
  
  constructor(
    private readonly adminService: AdminService,
    private readonly cdr: ChangeDetectorRef,
    private readonly router: Router,
    @Inject(PLATFORM_ID) private readonly platformId: Object
  ) {}

  ngOnInit() {
    // Cargar información del usuario actual
    if (isPlatformBrowser(this.platformId)) {
      const userStr = sessionStorage.getItem('user');
      if (userStr) {
        try {
          this.currentUser = JSON.parse(userStr);
          // Obtener admin ID
          this.adminId = this.obtenerAdminId();
        } catch (e) {
          console.error('❌ Error al parsear usuario desde sessionStorage:', e);
        }
      }
    }
    
    // Asegurar que activeTab esté inicializado correctamente
    if (!this.activeTab) {
      this.activeTab = 'inicio';
    }
    
    // Cargar estadísticas para la vista de inicio
    this.loadEstadisticas();
  }

  loadEstadisticas() {
    this.adminService.getUsuarios().subscribe({
      next: (usuarios) => {
        this.totalUsuarios = usuarios.length;
        this.usuariosActivos = usuarios.filter(u => !u.bloqueado).length;
        this.usuariosBloqueados = usuarios.filter(u => u.bloqueado).length;
        this.administradores = usuarios.filter(u => u.rol === 'Administrador').length;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('❌ Error al cargar estadísticas:', error);
      }
    });
    
    // Cargar estadísticas de contenidos si tenemos adminId
    if (this.adminId) {
      this.adminService.getContenidos(this.adminId).subscribe({
        next: (contenidos) => {
          this.totalContenidos = contenidos.length;
          this.contenidosActivos = contenidos.filter((c: any) => c.estado).length;
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          console.error('❌ Error al cargar estadísticas de contenidos:', error);
        }
      });
    }
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
    
    // Recargar estadísticas al volver a inicio
    if (tab === 'inicio') {
      this.loadEstadisticas();
    }
  }

  // Callback para cuando se elimina un usuario
  onUserDeleted() {
    console.log('✅ Usuario eliminado, recargando estadísticas...');
    this.loadEstadisticas();
  }

  // Callback para cuando se actualiza un usuario
  onUserUpdated() {
    console.log('✅ Usuario actualizado, recargando estadísticas...');
    this.loadEstadisticas();
  }

  // Método para abrir modal de perfil
  openProfileModal() {
    // Lógica del modal de perfil del administrador actual
    // (mantener la implementación existente)
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.removeItem('currentUserClass');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('email');
      
      setTimeout(() => {
        this.router.navigate(['/home']);
      }, 1000);
    }
  }

  getFotoUrl(foto: any): string {
    if (!foto) return '';
    if (typeof foto === 'string') {
      if (foto.startsWith('http://') || foto.startsWith('https://') || foto.startsWith('/')) {
        return foto;
      }
    }
    return `/${foto}`;
  }

  /**
   * Obtiene el ID del administrador actual
   */
  private obtenerAdminId(): string | undefined {
    // Primero intenta desde currentUser (acepta id o _id)
    if (this.currentUser?._id || this.currentUser?.id) {
      return (this.currentUser as any)._id || this.currentUser.id;
    }
    return undefined;
  }
}