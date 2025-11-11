import { Component, OnInit, ChangeDetectorRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, Usuario } from '../services/admin.service';
import { EditUserModalComponent } from '../edit-user-modal.component/edit-user-modal.component';
import { BlockUserModalComponent } from '../block-user-modal.component/block-user-modal.component';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, EditUserModalComponent, BlockUserModalComponent]
})
export class UserListComponent implements OnInit {
  @Output() userDeleted = new EventEmitter<void>();
  @Output() userUpdated = new EventEmitter<void>();
  
  usuarios: Usuario[] = [];
  usuariosFiltrados: Usuario[] = [];
  
  // Filtros
  filtroRol = 'Todos';
  busquedaNombre = '';
  
  // Mensajes
  successMessage = '';
  errorMessage = '';
  
  // Estados de modales
  showEditUserModal = false;
  showDeleteModal = false;
  showBloqueoModal = false;
  showPerfilModal = false;
  
  // Usuarios seleccionados
  editingUser: Usuario | null = null;
  usuarioAEliminar: Usuario | null = null;
  usuarioABloquear: Usuario | null = null;
  perfilDetalle: any = null;
  
  // Estados de carga
  isDeleting = false;
  loadingBloqueo = false;
  loadingPerfil = false;
  errorPerfil = '';
  
  // Fotos disponibles
  fotosDisponibles = [
    { id: 'perfil1.png', nombre: 'Perfil 1' },
    { id: 'perfil2.png', nombre: 'Perfil 2' },
    { id: 'perfil3.png', nombre: 'Perfil 3' },
    { id: 'perfil4.png', nombre: 'Perfil 4' }
  ];

  constructor(
    private readonly adminService: AdminService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadUsuarios();
  }

  loadUsuarios() {
    this.errorMessage = '';
    
    this.adminService.getUsuarios().subscribe({
      next: (usuarios) => {
        console.log('✅ Usuarios cargados:', usuarios.length);
        this.usuarios = usuarios;
        this.aplicarFiltros();
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('❌ Error al cargar usuarios:', error);
        
        if (error.status === 401) {
          this.errorMessage = '❌ No tienes autorización para ver la lista de usuarios.';
        } else {
          this.errorMessage = 'Error al cargar la lista de usuarios';
        }
        
        this.cdr.detectChanges();
      }
    });
  }

  aplicarFiltros() {
    let usuariosFiltrados = [...this.usuarios];

    if (this.filtroRol !== 'Todos') {
      usuariosFiltrados = usuariosFiltrados.filter(usuario => usuario.rol === this.filtroRol);
    }

    if (this.busquedaNombre.trim()) {
      const busqueda = this.busquedaNombre.toLowerCase().trim();
      usuariosFiltrados = usuariosFiltrados.filter(usuario => {
        const nombreCompleto = `${usuario.nombre} ${usuario.apellidos}`.toLowerCase();
        return nombreCompleto.includes(busqueda) || 
               usuario.email.toLowerCase().includes(busqueda);
      });
    }

    this.usuariosFiltrados = usuariosFiltrados;
  }

  onFiltroRolChange() {
    this.aplicarFiltros();
  }

  onBusquedaChange() {
    this.aplicarFiltros();
  }

  limpiarFiltros() {
    this.filtroRol = 'Todos';
    this.busquedaNombre = '';
    this.aplicarFiltros();
  }

  // Métodos para abrir modales
  verPerfil(usuario: Usuario) {
    this.perfilDetalle = null;
    this.loadingPerfil = true;
    this.errorPerfil = '';
    this.showPerfilModal = true;

    // Obtener adminId del usuario actual
    const adminId = this.obtenerAdminId();
    if (!adminId || !usuario.id) {
      this.errorPerfil = 'No se pudo identificar al administrador o al usuario';
      this.loadingPerfil = false;
      return;
    }

    this.adminService.obtenerPerfil(usuario.id, adminId).subscribe({
      next: (perfil) => {
        this.perfilDetalle = perfil;
        this.loadingPerfil = false;
      },
      error: (error) => {
        this.errorPerfil = error?.error?.mensaje || 'Error al cargar el perfil';
        this.loadingPerfil = false;
      }
    });
  }

  openEditUserModal(usuario: Usuario) {
    this.editingUser = usuario;
    this.showEditUserModal = true;
  }

  openDeleteModal(usuario: Usuario) {
    this.usuarioAEliminar = usuario;
    this.showDeleteModal = true;
  }

  abrirModalBloqueo(usuario: Usuario) {
    this.usuarioABloquear = usuario;
    this.showBloqueoModal = true;
  }

  // Métodos de cierre de modales
  closeEditUserModal() {
    this.showEditUserModal = false;
    this.editingUser = null;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.usuarioAEliminar = null;
    this.isDeleting = false;
  }

  cerrarModalBloqueo() {
    this.showBloqueoModal = false;
    this.usuarioABloquear = null;
    this.loadingBloqueo = false;
  }

  cerrarPerfilModal() {
    this.showPerfilModal = false;
    this.perfilDetalle = null;
    this.loadingPerfil = false;
    this.errorPerfil = '';
  }

  // Método para eliminar usuario
  deleteUser() {
    if (!this.usuarioAEliminar || this.isDeleting) return;

    const userId = this.usuarioAEliminar.id || (this.usuarioAEliminar as any)._id;
    const nombreUsuario = this.usuarioAEliminar.nombre;
    const apellidosUsuario = this.usuarioAEliminar.apellidos;

    if (!userId) {
      this.errorMessage = 'Error: ID de usuario no disponible';
      this.closeDeleteModal();
      return;
    }
    
    this.isDeleting = true;
    const tempId = userId;
    const tempNombre = nombreUsuario;
    const tempApellidos = apellidosUsuario;
    
    this.showDeleteModal = false;
    
    this.adminService.deleteUser(tempId).subscribe({
      next: (response: any) => {
        console.log('Usuario eliminado correctamente:', response);
        
        this.usuarios = this.usuarios.filter(u => u.id !== tempId);
        this.aplicarFiltros();
        this.usuarioAEliminar = null;
        
        this.successMessage = `Usuario ${tempNombre} ${tempApellidos} eliminado correctamente`;
        this.userDeleted.emit();
        
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        console.error('Error al eliminar usuario:', error);
        this.usuarioAEliminar = null;
        this.errorMessage = `Error al eliminar el usuario ${tempNombre}. Inténtelo de nuevo.`;
        this.loadUsuarios();
        
        setTimeout(() => {
          this.errorMessage = '';
        }, 5000);
      },
      complete: () => {
        this.isDeleting = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Callback cuando se actualiza un usuario desde el modal de edición
  onUserUpdated() {
    this.loadUsuarios();
    this.userUpdated.emit();
    this.successMessage = 'Usuario actualizado correctamente';
    
    setTimeout(() => {
      this.successMessage = '';
    }, 3000);
  }

  // Callback cuando se bloquea/desbloquea un usuario
  onUserBlocked(blocked: boolean) {
    this.loadUsuarios();
    this.successMessage = blocked ? 'Usuario bloqueado correctamente' : 'Usuario desbloqueado correctamente';
    
    setTimeout(() => {
      this.successMessage = '';
    }, 3000);
  }

  // Utilidades
  getFotoUrl(foto: any): string {
    if (!foto) return '';
    if (typeof foto === 'string') {
      if (foto.startsWith('http://') || foto.startsWith('https://') || foto.startsWith('/')) {
        return foto;
      }
    }
    return `/${foto}`;
  }

  formatearFecha(fecha: Date | undefined): string {
    if (!fecha) return 'No disponible';
    
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Obtiene el ID del administrador actual (para obtenerPerfil)
   */
  public obtenerAdminId(): string | undefined {
    // Intentar obtener del sessionStorage
    const userStr = sessionStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return user.id || user._id;
      } catch (e) {
        console.error('Error al parsear usuario:', e);
      }
    }
    return undefined;
  }
}