import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AdminService } from '../../../services/admin.service';

export interface Usuario {
  id?: number;
  username?: string;
  email: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento?: string;
  telefono?: string;
  genero?: string;
  fechaCreacion?: string;
  ultimoAcceso?: string;
  estado: boolean;
  rol: 'ADMINISTRADOR' | 'VISUALIZADOR' | 'GESTOR_CONTENIDOS';
  foto?: string;
}

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  type?: 'text' | 'date' | 'boolean' | 'badge';
  width?: string;
}

export interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

@Component({
  selector: 'app-user-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-table.component.html',
  styleUrls: ['./user-table.component.css']
})
export class UserTableComponent implements OnInit {
  @Input() users: Usuario[] = [];
  @Input() loading: boolean = false;
  @Input() searchTerm: string = '';
  @Input() showActions: boolean = true;
  @Input() selectable: boolean = false;
  @Input() pageSize: number = 10;
  @Input() currentUserId: string | number | null = null;
  
  @Output() userSelect = new EventEmitter<Usuario>();
  @Output() userEdit = new EventEmitter<Usuario>();
  @Output() userDelete = new EventEmitter<Usuario>();
  @Output() userToggleStatus = new EventEmitter<Usuario>();
  @Output() userViewProfile = new EventEmitter<Usuario>();
  @Output() searchTermChange = new EventEmitter<string>();
  @Output() sortChange = new EventEmitter<SortConfig>();
  
  // Nuevos eventos para notificar acciones completadas exitosamente
  @Output() userDeletedSuccessfully = new EventEmitter<Usuario>();
  @Output() userStatusToggledSuccessfully = new EventEmitter<Usuario>();

  // Estado interno del componente
  selectedUsers: Set<number> = new Set();
  currentPage: number = 1;
  sortConfig: SortConfig | null = null;

  // Estados de modales de eliminación y bloqueo
  showDeleteModal = false;
  showBloqueoModal = false;
  usuarioAEliminar: Usuario | null = null;
  usuarioABloquear: Usuario | null = null;
  isDeleting = false;
  loadingBloqueo = false;
  accionBloqueo: 'bloquear' | 'desbloquear' = 'bloquear';
  confirmBloqueoStep = 1;
  errorBloqueo: string | null = null;

  // Configuración de columnas
  columns: TableColumn[] = [
    { key: 'username', label: 'Usuario', sortable: true, width: '15%' },
    { key: 'nombres', label: 'Nombres', sortable: true, width: '15%' },
    { key: 'apellidos', label: 'Apellidos', sortable: true, width: '15%' },
    { key: 'email', label: 'Email', sortable: true, width: '20%' },
    { key: 'rol', label: 'Rol', type: 'badge', sortable: true, width: '10%' },
    { key: 'estado', label: 'Estado', type: 'boolean', sortable: true, width: '8%' },
    { key: 'fechaCreacion', label: 'F. Creación', type: 'date', sortable: true, width: '12%' },
    { key: 'ultimoAcceso', label: 'Último Acceso', type: 'date', sortable: true, width: '12%' }
  ];

  constructor(private readonly adminService: AdminService) {}

  get filteredUsers(): Usuario[] {
    if (!this.searchTerm) {
      return this.users;
    }
    
    const search = this.searchTerm.toLowerCase();
    return this.users.filter(user => 
      user.username?.toLowerCase().includes(search) ||
      user.nombres.toLowerCase().includes(search) ||
      user.apellidos.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search) ||
      user.rol.toLowerCase().includes(search)
    );
  }

  get sortedUsers(): Usuario[] {
    const filtered = this.filteredUsers;
    
    if (!this.sortConfig) {
      return filtered;
    }

    return [...filtered].sort((a, b) => {
      const aValue = this.getNestedValue(a, this.sortConfig!.column);
      const bValue = this.getNestedValue(b, this.sortConfig!.column);
      
      let comparison = 0;
      
      if (aValue < bValue) {
        comparison = -1;
      } else if (aValue > bValue) {
        comparison = 1;
      }
      
      return this.sortConfig!.direction === 'desc' ? comparison * -1 : comparison;
    });
  }

  get paginatedUsers(): Usuario[] {
    const sorted = this.sortedUsers;
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return sorted.slice(start, end);
  }

  get totalPages(): number {
    return Math.ceil(this.sortedUsers.length / this.pageSize);
  }

  get totalUsers(): number {
    return this.sortedUsers.length;
  }

  get startIndex(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalUsers);
  }

  onSearchTermChange(term: string): void {
    this.searchTermChange.emit(term);
    this.currentPage = 1; // Reset a la primera página
  }

  onSort(columnKey: string): void {
    if (!this.isColumnSortable(columnKey)) {
      return;
    }

    let direction: 'asc' | 'desc' = 'asc';
    
    if (this.sortConfig && this.sortConfig.column === columnKey) {
      direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
    }
    
    this.sortConfig = { column: columnKey, direction };
    this.sortChange.emit(this.sortConfig);
  }

  getSortIcon(columnKey: string): string {
    if (!this.sortConfig || this.sortConfig.column !== columnKey) {
      return '';
    }
    return this.sortConfig.direction === 'asc' ? '↑' : '↓';
  }

  isColumnSortable(columnKey: string): boolean {
    const column = this.columns.find(col => col.key === columnKey);
    return column ? column.sortable || false : false;
  }

  onUserSelect(user: Usuario): void {
    this.userSelect.emit(user);
  }

  // Estado para prevenir doble clic
  isLoadingEdit = false;

  onUserEdit(user: Usuario): void {
    // Prevenir múltiples clics mientras se está cargando
    if (this.isLoadingEdit) {
      console.log('⏳ Edición ya en progreso, ignorando clic adicional');
      return;
    }
    
    console.log('✏️ Iniciando edición de usuario:', user.id);
    this.isLoadingEdit = true;
    this.userEdit.emit(user);
    
    // Resetear el estado después de un delay más corto
    setTimeout(() => {
      this.isLoadingEdit = false;
      console.log('✅ Estado de edición reseteado');
    }, 1000);
  }

  // Métodos originales removidos - ahora manejados con modales

  onUserViewProfile(user: Usuario): void {
    this.userViewProfile.emit(user);
  }

  toggleUserSelection(userId: number): void {
    if (this.selectedUsers.has(userId)) {
      this.selectedUsers.delete(userId);
    } else {
      this.selectedUsers.add(userId);
    }
  }

  isUserSelected(userId: number): boolean {
    return this.selectedUsers.has(userId);
  }

  selectAllUsers(): void {
    this.paginatedUsers.forEach(user => {
      if (user.id) {
        this.selectedUsers.add(user.id);
      }
    });
  }

  deselectAllUsers(): void {
    this.selectedUsers.clear();
  }

  get allUsersSelected(): boolean {
    return this.paginatedUsers.every(user => 
      user.id ? this.selectedUsers.has(user.id) : false
    );
  }

  get someUsersSelected(): boolean {
    return this.paginatedUsers.some(user => 
      user.id ? this.selectedUsers.has(user.id) : false
    );
  }

  toggleAllUsersSelection(): void {
    if (this.allUsersSelected) {
      this.deselectAllUsers();
    } else {
      this.selectAllUsers();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  previousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  getCellValue(user: Usuario, column: TableColumn): any {
    return this.getNestedValue(user, column.key);
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj) || '';
  }

  getRoleBadgeClass(rol: string): string {
    const roleClasses = {
      'ADMINISTRADOR': 'badge-admin',
      'GESTOR_CONTENIDOS': 'badge-gestor',
      'VISUALIZADOR': 'badge-visualizador'
    };
    return roleClasses[rol as keyof typeof roleClasses] || 'badge-default';
  }

  getRoleLabel(rol: string): string {
    const roleLabels = {
      'ADMINISTRADOR': 'Administrador',
      'GESTOR_CONTENIDOS': 'Gestor',
      'VISUALIZADOR': 'Visualizador'
    };
    return roleLabels[rol as keyof typeof roleLabels] || rol;
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  }

  formatDateTime(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  }

  getFotoUrl(foto: any): string {
    if (!foto) return '';
    if (typeof foto === 'string') {
      // Si ya es una URL absoluta, usar tal cual
      if (foto.startsWith('http://') || foto.startsWith('https://') || foto.startsWith('/')) {
        return foto;
      }
    }
    // Los archivos en public/ se sirven directamente desde la raíz
    return `/${foto}`;
  }

  getRoleDisplayName(rol: string): string {
    switch (rol) {
      case 'ADMINISTRADOR':
        return 'Administrador';
      case 'GESTOR_CONTENIDOS':
        return 'Gestor';
      case 'VISUALIZADOR':
        return 'Visualizador';
      default:
        return rol || 'Visualizador';
    }
  }

  isCurrentUser(usuario: Usuario): boolean {
    if (!this.currentUserId || !usuario.id) {
      return false;
    }
    // Comparar tanto como string como number para asegurar compatibilidad
    return String(this.currentUserId) === String(usuario.id);
  }

  private getCurrentUserId(): string | null {
    try {
      // Intentar obtener el usuario actual del localStorage o sessionStorage
      const userStr = localStorage.getItem('currentUserClass') || 
                     localStorage.getItem('currentUser') || 
                     sessionStorage.getItem('user') || 
                     sessionStorage.getItem('currentUser');
      
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.id?.toString() || null;
      }
    } catch (error) {
      console.error('Error getting current user ID:', error);
    }
    return null;
  }

  ngOnInit(): void {
    // Si no se ha proporcionado currentUserId, intentar obtenerlo del storage
    if (!this.currentUserId) {
      this.currentUserId = this.getCurrentUserId();
    }
  }

  // ==================== MÉTODOS DE MODAL DE ELIMINACIÓN ====================
  onUserDelete(user: Usuario): void {
    this.usuarioAEliminar = user;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.usuarioAEliminar = null;
  }

  async deleteUser(): Promise<void> {
    if (this.usuarioAEliminar) {
      this.isDeleting = true;
      try {
        if (this.usuarioAEliminar.id) {
          await firstValueFrom(this.adminService.deleteUser(this.usuarioAEliminar.id.toString()));
          const deletedUser = this.usuarioAEliminar;
          this.userDelete.emit(deletedUser);
          // Emitir evento de éxito para refrescar la lista
          this.userDeletedSuccessfully.emit(deletedUser);
          this.closeDeleteModal();
        }
      } catch (error) {
        console.error('Error deleting user:', error);
      } finally {
        this.isDeleting = false;
      }
    }
  }

  // ==================== MÉTODOS DE MODAL DE BLOQUEO ====================
  onUserToggleStatus(user: Usuario): void {
    this.usuarioABloquear = user;
    this.accionBloqueo = user.estado ? 'bloquear' : 'desbloquear';
    this.showBloqueoModal = true;
    this.confirmBloqueoStep = 1;
    this.errorBloqueo = null;
  }

  cerrarModalBloqueo(): void {
    this.showBloqueoModal = false;
    this.usuarioABloquear = null;
    this.loadingBloqueo = false;
    this.confirmBloqueoStep = 1;
    this.errorBloqueo = null;
  }

  async confirmarBloqueo(): Promise<void> {
    if (this.usuarioABloquear) {
      this.loadingBloqueo = true;
      try {
        const adminId = this.getCurrentUserId();
        if (adminId && this.usuarioABloquear.id) {
          if (this.accionBloqueo === 'bloquear') {
            await firstValueFrom(this.adminService.bloquearUsuario(this.usuarioABloquear.id.toString(), adminId));
          } else {
            await firstValueFrom(this.adminService.desbloquearUsuario(this.usuarioABloquear.id.toString(), adminId));
          }
          const toggledUser = this.usuarioABloquear;
          this.userToggleStatus.emit(toggledUser);
          // Emitir evento de éxito para refrescar la lista
          this.userStatusToggledSuccessfully.emit(toggledUser);
          this.cerrarModalBloqueo();
        }
      } catch (error) {
        console.error('Error toggling user status:', error);
        this.errorBloqueo = 'Error al cambiar el estado del usuario';
      } finally {
        this.loadingBloqueo = false;
      }
    }
  }
}