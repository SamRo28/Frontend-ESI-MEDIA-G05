import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, VisualizadorGestionDTO, GestorGestionDTO, AdministradorGestionDTO } from '../services/admin.service';
import { firstValueFrom } from 'rxjs';

interface UserManagementTab {
  id: string;
  label: string;
  icon: string;
  count: number;
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-management.html',
  styleUrls: ['./user-management.css']
})
export class UserManagementComponent implements OnInit {
  // Pestañas de navegación
  activeTab: string = 'visualizadores';
  tabs: UserManagementTab[] = [
    { id: 'visualizadores', label: 'Visualizadores', icon: 'eye', count: 0 },
    { id: 'gestores', label: 'Gestores', icon: 'cog', count: 0 },
    { id: 'administradores', label: 'Administradores', icon: 'shield', count: 0 }
  ];

  // Datos de usuarios
  visualizadores: VisualizadorGestionDTO[] = [];
  gestores: GestorGestionDTO[] = [];
  administradores: AdministradorGestionDTO[] = [];

  // Estados de carga
  loading = true;
  processing = false;

  // Paginación
  currentPage = 0;
  pageSize = 10;
  totalPages = 0;

  // Filtros y búsqueda
  searchTerm = '';
  filteredUsers: any[] = [];

  // Modal de edición
  showEditModal = false;
  editingUser: any = null;
  editForm: any = {};

  // Modal de eliminación
  showDeleteModal = false;
  userToDelete: any = null;

  // Modal de cambio de estado
  showToggleStatusModal = false;
  userToToggleStatus: any = null;

  // Estados de éxito y error
  successMessage = '';
  errorMessage = '';
  currentAdminId: string | null = null;

  constructor(
    private readonly adminService: AdminService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAllUserTypes();
    if (isPlatformBrowser(this.platformId)) {
      try {
        const userRaw = sessionStorage.getItem('user');
        if (userRaw) {
          const user = JSON.parse(userRaw);
          this.currentAdminId = user?.id || user?._id || null;
        }
      } catch (e) {
        console.error('Error al obtener el ID del administrador desde sessionStorage', e);
      }
    }
  }

  // ====== MÉTODOS DE CARGA DE DATOS ======
  async loadAllUserTypes(): Promise<void> {
    this.loading = true;
    try {
      await Promise.all([
        this.loadVisualizadores(),
        this.loadGestores(),
        this.loadAdministradores()
      ]);
      this.updateTabCounts();
      this.applyFilters();
    } catch (error) {
      console.error('Error cargando usuarios del sistema:', error);
      this.showError('Error cargando usuarios del sistema');
    } finally {
      this.loading = false;
    }
  }

  async loadVisualizadores(): Promise<void> {
    try {
      const response = await firstValueFrom(this.adminService.getAllVisualizadores(this.currentPage, this.pageSize));
      if (response) {
        this.visualizadores = response.content;
        if (this.activeTab === 'visualizadores') {
          this.totalPages = response.totalPages;
        }
      }
    } catch (error) {
      console.error('Error cargando visualizadores:', error);
      throw error;
    }
  }

  async loadGestores(): Promise<void> {
    try {
      const response = await firstValueFrom(this.adminService.getAllGestores(this.currentPage, this.pageSize));
      if (response) {
        this.gestores = response.content;
        if (this.activeTab === 'gestores') {
          this.totalPages = response.totalPages;
        }
      }
    } catch (error) {
      console.error('Error cargando gestores:', error);
      throw error;
    }
  }

  async loadAdministradores(): Promise<void> {
    try {
      const response = await firstValueFrom(this.adminService.getAllAdministradores(this.currentPage, this.pageSize));
      if (response) {
        this.administradores = response.content;
        if (this.activeTab === 'administradores') {
          this.totalPages = response.totalPages;
        }
      }
    } catch (error) {
      console.error('Error cargando administradores:', error);
      throw error;
    }
  }

  // ====== NAVEGACIÓN Y FILTROS ======
  setActiveTab(tabId: string): void {
    if (this.activeTab !== tabId) {
      this.activeTab = tabId;
      this.currentPage = 0;
      this.searchTerm = '';
      this.applyFilters();
      this.loadCurrentTabData();
    }
  }

  async loadCurrentTabData(): Promise<void> {
    this.loading = true;
    try {
      switch (this.activeTab) {
        case 'visualizadores':
          await this.loadVisualizadores();
          break;
        case 'gestores':
          await this.loadGestores();
          break;
        case 'administradores':
          await this.loadAdministradores();
          break;
      }
      this.applyFilters();
    } finally {
      this.loading = false;
    }
  }

  updateTabCounts(): void {
    for (const tab of this.tabs) {
      switch (tab.id) {
        case 'visualizadores':
          tab.count = this.visualizadores.length;
          break;
        case 'gestores':
          tab.count = this.gestores.length;
          break;
        case 'administradores':
          tab.count = this.administradores.length;
          break;
      }
    }
  }

  applyFilters(): void {
    let users: any[] = [];
    
    switch (this.activeTab) {
      case 'visualizadores':
        users = this.visualizadores;
        break;
      case 'gestores':
        users = this.gestores;
        break;
      case 'administradores':
        users = this.administradores;
        break;
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      users = users.filter(user => 
        user.nombre.toLowerCase().includes(term) ||
        user.apellidos.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        (user.apodo?.toLowerCase().includes(term))
      );
    }

    this.filteredUsers = users;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

  // ====== GESTIÓN DE USUARIOS ======
  openEditModal(user: any): void {
    this.editingUser = user;
    this.editForm = { ...user };
    this.showEditModal = true;
    this.clearMessages();
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingUser = null;
    this.editForm = {};
    this.clearMessages();
  }

  async saveUserChanges(): Promise<void> {
  if (!this.editingUser || !this.editForm.id) return;

  // Evitar que el administrador se bloquee a sí mismo desde la edición
  if (this.activeTab === 'administradores'
      && this.editForm.id === this.currentAdminId
      && this.editForm.bloqueado) {

    this.closeEditModal(); // cierra la ventana
    this.showError('No puedes bloquear tu propia cuenta de administrador.');
    return;
  }

  this.processing = true;
  try {
    let updatedUser;
    
    switch (this.activeTab) {
      case 'visualizadores':
        updatedUser = await firstValueFrom(this.adminService.updateVisualizador(this.editForm.id, this.editForm));
        break;
      case 'gestores':
        updatedUser = await firstValueFrom(this.adminService.updateGestor(this.editForm.id, this.editForm));
        break;
      case 'administradores':
        updatedUser = await firstValueFrom(this.adminService.updateAdministrador(this.editForm.id, this.editForm));
        break;
    }

    if (updatedUser) {
      this.showSuccess('Usuario actualizado correctamente');
      await this.loadCurrentTabData();
      this.closeEditModal();
    }
  } catch (error: any) {
    this.showError(error.error?.message || 'Error actualizando usuario');
  } finally {
    this.processing = false;
  }
}

  openDeleteModal(user: any): void {
    this.userToDelete = user;
    this.showDeleteModal = true;
    this.clearMessages();
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.userToDelete = null;
    this.clearMessages();
  }

  async confirmDelete(): Promise<void> {
    if (!this.userToDelete?.id) return;

    this.processing = true;
    try {
      switch (this.activeTab) {
        case 'visualizadores':
          await firstValueFrom(this.adminService.deleteVisualizador(this.userToDelete.id));
          break;
        case 'gestores':
          await firstValueFrom(this.adminService.deleteGestor(this.userToDelete.id));
          break;
        case 'administradores':
          await firstValueFrom(this.adminService.deleteAdministrador(this.userToDelete.id));
          break;
      }

      this.showSuccess(`${this.getTypeLabel()} eliminado correctamente`);
      await this.loadCurrentTabData();
      this.closeDeleteModal();
    } catch (error: any) {
      this.showError(error.error?.message || 'Error eliminando usuario');
    } finally {
      this.processing = false;
    }
  }

  // ====== UTILIDADES ======
  getTypeLabel(): string {
    switch (this.activeTab) {
      case 'visualizadores':
        return 'Visualizador';
      case 'gestores':
        return 'Gestor';
      case 'administradores':
        return 'Administrador';
      default:
        return 'Usuario';
    }
  }

  getFieldsForCurrentType(): string[] {
    switch (this.activeTab) {
      case 'visualizadores':
        return ['nombre', 'apellidos', 'email', 'foto', 'departamento', 'apodo', 'bloqueado'];
      case 'gestores':
        return ['nombre', 'apellidos', 'email', 'foto', 'departamento', 'apodo', 'bloqueado'];
      case 'administradores':
        return ['nombre', 'apellidos', 'email', 'foto', 'departamento', 'apodo', 'bloqueado'];
      default:
        return [];
    }
  }

  canEditField(field: string): boolean {
    const readOnlyFields = ['email', 'id'];
    return !readOnlyFields.includes(field);
  }

  getStatusColor(user: any): string {
    return user.bloqueado ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
  }

  getStatusText(user: any): string {
    return user.bloqueado ? 'Bloqueado' : 'Activo';
  }

  // ====== PAGINACIÓN ======
  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.loadCurrentTabData();
    }
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  previousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  // ====== GESTIÓN DE ESTADO (BLOQUEO/DESBLOQUEO) ======
  openToggleStatusModal(user: any): void {
    this.userToToggleStatus = { ...user };
    this.showToggleStatusModal = true;
    this.clearMessages();
  }

  closeToggleStatusModal(): void {
    this.showToggleStatusModal = false;
    this.userToToggleStatus = null;
  }

  async confirmToggleStatus(): Promise<void> {
  if (!this.userToToggleStatus) return;

  const isBlocking = !this.userToToggleStatus.bloqueado;

  // Evitar que el administrador se bloquee a sí mismo desde el modal de estado
  if (this.activeTab === 'administradores'
      && this.userToToggleStatus.id === this.currentAdminId
      && isBlocking) {

    this.closeToggleStatusModal(); // cierra el modal de confirmar
    this.showError('No puedes bloquear tu propia cuenta de administrador.');
    // Forzamos la detección de cambios para que el mensaje aparezca inmediatamente
    this.cdr.detectChanges();
    // Limpiamos el mensaje después de 5 segundos
    setTimeout(() => this.clearMessages(), 5000);
    return;
  }

  this.processing = true;
  const payload = { ...this.userToToggleStatus, bloqueado: isBlocking };

  try {
    switch (this.activeTab) {
      case 'visualizadores':
        await firstValueFrom(this.adminService.updateVisualizador(payload.id, payload));
        break;
      case 'gestores':
        await firstValueFrom(this.adminService.updateGestor(payload.id, payload));
        break;
      case 'administradores':
        await firstValueFrom(this.adminService.updateAdministrador(payload.id, payload));
        break;
    }
    this.closeToggleStatusModal(); // Mover el cierre del modal aquí
    this.showSuccess(`Usuario ${isBlocking ? 'bloqueado' : 'desbloqueado'} correctamente.`);
    await this.loadCurrentTabData();
  } catch (error: any) {
    this.showError(error.error?.message || `Error al ${isBlocking ? 'bloquear' : 'desbloquear'} usuario.`);
  } finally {
    this.processing = false;
  }
}


  // ====== MENSAJES ======
  showSuccess(message: string): void {
    this.successMessage = message;
    this.errorMessage = '';
    setTimeout(() => this.clearMessages(), 5000);
  }

  showError(message: string): void {
    this.errorMessage = message;
    this.successMessage = '';
    setTimeout(() => this.clearMessages(), 5000);
  }

  clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }

  // ====== EXPORTACIÓN Y UTILIDADES ADICIONALES ======
  exportUsers(): void {
    // Implementar exportación a CSV/Excel
    console.log('Exportar usuarios', this.filteredUsers);
  }

  refreshData(): void {
    this.loadCurrentTabData();
  }
}