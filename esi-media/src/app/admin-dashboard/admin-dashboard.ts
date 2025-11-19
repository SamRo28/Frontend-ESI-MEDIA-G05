import { Component, OnInit, OnDestroy, ChangeDetectorRef, Inject, PLATFORM_ID, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';

// Servicios refactorizados
import { UserValidationService } from '../services/user-validation.service';
import { ModalService, ModalConfig } from '../services/modal.service';
import { AdminService, Usuario, PerfilDetalle, ContenidoResumen, ContenidoDetalle } from '../services/admin.service';

// Componentes refactorizados
import { UserFormComponent, Usuario as UserFormUser } from '../shared/components/user-form/user-form.component';
import { UserTableComponent } from '../shared/components/user-table/user-table.component';
import { ConfirmationModalComponent } from '../shared/components/confirmation-modal/confirmation-modal.component';

// Interface local para datos de usuario del formulario (usando alias)
interface LocalUserForm {
  id?: number;
  username: string;
  email: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento?: string;
  telefono?: string;
  genero?: string;
  estado: boolean;
  rol: 'ADMINISTRADOR' | 'VISUALIZADOR' | 'GESTOR_CONTENIDOS';
  fechaCreacion?: Date;
  ultimoAcceso?: Date;
  password?: string;
}

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterModule,
    ConfirmationModalComponent,
    UserFormComponent,
    UserTableComponent
  ]
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Estado de la aplicación
  activeTab = 'inicio';
  loading = false;
  
  // Información del usuario actual
  currentUser: any = null;

  // Gestión de usuarios
  usuarios: Usuario[] = [];
  usuariosFiltrados: Usuario[] = [];
  searchTerm = '';
  roleFilter = 'Todos';
  
  // Gestión de contenidos (solo lectura)
  contenidos: ContenidoResumen[] = [];
  contenidosFiltrados: ContenidoResumen[] = [];
  filtroTipoContenido: 'Todos' | 'Audio' | 'Video' = 'Todos';
  busquedaContenido = '';

  // Filtros y búsqueda de usuarios
  busquedaNombre = '';
  filtroRol = 'Todos';
  
  // Mensajes de estado
  errorContenido: string | null = null;
  successMessage: string | null = null;
  errorMessage: string | null = null;
  // isSuccess eliminado - manejado por user-form component

  // Estados de modales
  showUserForm = false;
  showProfileModal = false;
  showContenidoModal = false;
  showConfirmationModal = false;
  
  // Datos para modales
  editingUser: UserFormUser | null = null;
  detalleContenido: ContenidoDetalle | null = null;
  

  
  // Variable para controlar si el formulario ha sido tocado
  formTouched = false;
  
  // Estados de validación y creación
  fieldsWithError: string[] = [];
  
  // Estados de perfil modal
  showPerfilModal = false;
  loadingPerfil = false;
  errorPerfil: string | null = null;
  perfilDetalle: Usuario | null = null;
  
  // Estados de modales de eliminación y bloqueo removidos - ahora manejado por user-table component
  
  // Estados de modal de edición
  showEditUserModal = false;
  showEditConfirmation = false;
  editUserForm: any = {};
  isUpdating = false;
  
  // Estados para modales de confirmación globales
  modalVisible = false;
  modalConfig: ModalConfig = {
    title: 'Confirmar',
    message: '¿Está seguro?',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar'
  };
  currentModalResolve: ((result: boolean) => void) | null = null;
  currentModalId: number | null = null;

  // Propiedades para componentes refactorizados
  userFormData: UserFormUser = {
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    nombres: '',
    apellidos: '',
    fechaNacimiento: '',
    telefono: '',
    genero: '',
    estado: true,
    rol: 'VISUALIZADOR'
  };
  isUserFormValid: boolean = false;
  userProfileData: any = null;
  
  // Referencias a componentes hijos
  @ViewChild(UserFormComponent, { static: false }) userFormComponent?: UserFormComponent;

  // Propiedades adicionales
  todayStr = new Date().toISOString().split('T')[0];
  minAllowedBirthStr = new Date(new Date().getFullYear() - 100, 0, 1).toISOString().split('T')[0];
  confirmationConfig: ModalConfig = {
    title: 'Confirmar',
    message: '¿Está seguro?',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar'
  };

  // Estados de operaciones
  isCreatingUser = false;
  isUpdatingUser = false;
  loadingContenido = false;

  constructor(
    private readonly adminService: AdminService,
    private readonly userValidationService: UserValidationService,
    private readonly modalService: ModalService,
    private readonly cdr: ChangeDetectorRef,
    private readonly router: Router,
    @Inject(PLATFORM_ID) private readonly platformId: Object
  ) {}

  ngOnInit(): void {
    this.initializeComponent();
    this.setupNotificationSubscriptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeComponent(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadCurrentUser();
      this.loadUsuarios();
      this.loadContenidos();
    }
  }

  private setupNotificationSubscriptions(): void {
    // Suscribirse a los modales para mostrarlos
    this.modalService.getModals()
      .pipe(takeUntil(this.destroy$))
      .subscribe((modals: any[]) => {
        if (modals.length > 0) {
          const modal = modals[0]; // Mostrar solo el primer modal
          this.modalConfig = modal.config;
          this.modalVisible = true;
          this.currentModalResolve = modal.resolve;
          this.currentModalId = modal.id;
        } else {
          this.modalVisible = false;
        }
      });
  }

  private loadCurrentUser(): void {
    try {
      const userStr = localStorage.getItem('currentUserClass') || sessionStorage.getItem('user');
      if (userStr) {
        this.currentUser = JSON.parse(userStr);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  }

  // ==================== GESTIÓN DE PESTAÑAS ====================
  
  selectTab(tab: string): void {
    this.activeTab = tab;
    
    // Cargar datos específicos según la pestaña
    switch (tab) {
      case 'usuarios':
        this.loadUsuarios();
        break;
      case 'contenidos':
        this.loadContenidos();
        break;
    }
  }

  // ==================== GESTIÓN DE USUARIOS ====================
  
  private async loadUsuarios(): Promise<void> {
    try {
      this.loading = true;
      this.usuarios = await firstValueFrom(this.adminService.getUsuarios()) || [];
      this.applyUserFilters();
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      this.loading = false;
    }
  }

  onUserSearch(searchTerm: string): void {
    this.searchTerm = searchTerm;
    this.applyUserFilters();
  }

  onRoleFilterChange(): void {
    this.applyUserFilters();
  }

  public applyUserFilters(): void {
    let filtered = [...this.usuarios];
    
    // Filtro por rol
    if (this.roleFilter !== 'Todos') {
      filtered = filtered.filter(user => user.rol === this.roleFilter);
    }
    
    // Filtro por búsqueda
    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.apodo?.toLowerCase().includes(search) ||
        user.nombre?.toLowerCase().includes(search) ||
        user.apellidos?.toLowerCase().includes(search) ||
        user.email?.toLowerCase().includes(search)
      );
    }
    
    this.usuariosFiltrados = filtered;
  }

  // ==================== ACCIONES DE USUARIO ====================

  onCreateUser(): void {
    this.editingUser = null;
    this.userProfileData = null; // Limpiar datos del perfil
    this.userFormData = this.createEmptyUserFormData(); // Inicializar con datos vacíos
    this.showUserForm = true;
  }

  onEditUser(user: Usuario): void {
    this.editingUser = this.mapToFormData(user);
    this.showUserForm = true;
  }

  onDeleteUser(user: Usuario): void {
    // Delegar al user-form component
    this.userFormComponent?.onDeleteUser(user);
  }

  onToggleUserStatus(user: Usuario): void {
    // Delegar al user-form component
    const adminId = this.obtenerAdminId();
    this.userFormComponent?.onToggleUserStatus(user, adminId || undefined);
  }

  // ==================== FORMULARIO DE USUARIO ====================

  onUserFormSubmit(userData: UserFormUser): void {
    if (this.editingUser?.id) {
      this.updateUser(this.editingUser.id, userData);
    } else {
      this.createUser(userData);
    }
  }

  onUserFormCancel(): void {
    this.showUserForm = false;
    this.editingUser = null;
    this.userProfileData = null; // Limpiar datos del perfil
  }
// esto se usa o esta en user-table component?
  private async createUser(userData: UserFormUser): Promise<void> {
    try {
      this.isCreatingUser = true;
      this.errorMessage = null;
      
      const adminData = this.mapUserFormToAdminData(userData);
      await firstValueFrom(this.adminService.crearUsuario(adminData));
      
      this.successMessage = `${userData.rol === 'ADMINISTRADOR' ? 'Administrador' : userData.rol === 'GESTOR_CONTENIDOS' ? 'Gestor de contenido' : 'Usuario'} creado exitosamente.`;
      // isSuccess eliminado - manejado por user-form component
      await this.loadUsuarios();
      // Forzar detección de cambios
      this.cdr.detectChanges();
      // Cerrar el formulario después de crear exitosamente
      this.showUserForm = false;
      this.editingUser = null;
      this.userProfileData = null;
    } catch (error) {
      console.error('Error creating user:', error);
      this.errorMessage = 'Error al crear el usuario. Por favor, inténtelo de nuevo.';
      // isSuccess eliminado - manejado por user-form component
    } finally {
      this.isCreatingUser = false;
    }
  }
// esto se usa o esta en user-table component?
  private async updateUser(userId: number, userData: UserFormUser): Promise<void> {
    try {
      this.isUpdatingUser = true;
      this.errorMessage = null;
      
      const updateData = this.mapUserFormToUpdateData(userData);
      const tipo = this.determineUserTypeFromRole(userData.rol);
      
      await firstValueFrom(this.adminService.updateUser(userId.toString(), updateData, tipo));
      
      this.successMessage = 'Usuario actualizado exitosamente.';
      // isSuccess eliminado - manejado por user-form component
      await this.loadUsuarios();
      // Forzar detección de cambios
      this.cdr.detectChanges();
      // Cerrar el formulario después de actualizar exitosamente
      this.showUserForm = false;
      this.editingUser = null;
      this.userProfileData = null;
    } catch (error) {
      console.error('Error updating user - detalle completo:', error);
      this.errorMessage = 'Error al actualizar el usuario. Por favor, inténtelo de nuevo.';
      // isSuccess eliminado - manejado por user-form component
    } finally {
      this.isUpdatingUser = false;
    }
  }

  // Las funciones executeUserDeletion y executeUserStatusToggle
  // han sido movidas al UserFormComponent

  // ==================== GESTIÓN DE CONTENIDOS ====================

  private async loadContenidos(): Promise<void> {
    const adminId = this.obtenerAdminId();
    if (!adminId) {
      console.warn('No se pudo obtener el ID del administrador');
      return;
    }

    try {
      this.loading = true;
      const contenidosRaw = await firstValueFrom(this.adminService.getContenidos(adminId)) || [];
      
      // Eliminar duplicados basándose en el ID del contenido
      const contenidosUnicos = new Map<string, any>();
      contenidosRaw.forEach(contenido => {
        if (contenido.id) {
            contenidosUnicos.set(contenido.id, contenido);
        }
      });
      
      this.contenidos = Array.from(contenidosUnicos.values());
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      this.loading = false;
    }
  }

  // ==================== UTILIDADES Y MAPPERS ====================

  private obtenerAdminId(): string | null {
    return this.currentUser?.id?.toString() || null;
  }



  private mapUserFormToAdminData(userData: any): any {
    const formData = userData.newUser || userData; // Usar newUser si está disponible
    
    return {
      nombre: formData.nombre || userData.nombres,
      apellidos: formData.apellidos || userData.apellidos,
      email: formData.email || userData.email,
      contrasenia: formData.contrasenia || userData.password,
      alias: formData.alias || formData.apodo || userData.username,
      departamento: formData.departamento || (userData.rol === 'GESTOR_CONTENIDOS' ? 'Gestión de Contenidos' : 'Administración'),
      rol: userData.rol === 'GESTOR_CONTENIDOS' ? 'Gestor' : 'Administrador',
      foto: formData.foto || 'perfil1.png',
      especialidad: formData.especialidad || (userData.rol === 'GESTOR_CONTENIDOS' ? 'Contenido Digital' : ''),
      tipoContenido: formData.tipoContenido || (userData.rol === 'GESTOR_CONTENIDOS' ? 'Audio y Video' : ''),
      descripcion: formData.descripcion || ''
    };
  }

  private mapUserFormToUpdateData(userData: any): any {
    const formData = userData.newUser || userData; // Usar newUser si está disponible
    
    const updateData: any = {
      nombres: formData.nombre || userData.nombres,
      apellidos: formData.apellidos || userData.apellidos,
      email: formData.email || userData.email,
      telefono: userData.telefono || '',
      genero: userData.genero || '',
      fechaNacimiento: formData.fechaNacimiento || userData.fechaNacimiento,
      foto: formData.foto,
      // Campos específicos según el tipo de usuario
      alias: formData.alias,
      departamento: formData.departamento,
      descripcion: formData.descripcion,
      especialidad: formData.especialidad,
      tipoContenido: formData.tipoContenido
    };

    if ((formData.contrasenia || userData.password) && (formData.contrasenia || userData.password).trim() !== '') {
      updateData.contrasenia = formData.contrasenia || userData.password;
    }

    return updateData;
  }

  // ==================== ACCIONES DE NAVEGACIÓN ====================

  logout(): void {
    this.modalService.openConfirmationModal({
      title: 'Cerrar Sesión',
      message: '¿Está seguro de que desea cerrar sesión?',
      confirmText: 'Cerrar Sesión',
      cancelText: 'Cancelar',
      confirmClass: 'warning',
      icon: 'warning'
    }).then((confirmed) => {
      if (confirmed) {
        this.executeLogout();
      }
    });
  }

  private executeLogout(): void {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.clear();
    }
    this.router.navigate(['/login']);
  }

  // ==================== GETTERS PARA ESTADÍSTICAS ====================

  get totalUsuarios(): number {
    return this.usuarios.length;
  }

  get usuariosActivos(): number {
    return this.usuarios.filter(u => !u.bloqueado).length;
  }

  get totalContenidos(): number {
    return this.contenidos.length;
  }

  get contenidosAudio(): number {
    return this.contenidos.filter(c => c.tipo === 'Audio').length;
  }

  get contenidosVideo(): number {
    return this.contenidos.filter(c => c.tipo === 'Video').length;
  }



  // Mantener compatibilidad con propiedades del template original
  get showForm(): boolean {
    return this.showUserForm;
  }

  set showForm(value: boolean) {
    this.showUserForm = value;
  }
// esto se usa?
  private determineUserType(user: Usuario): string {
    switch (user.rol) {
      case 'Administrador':
        return 'Administrador';
      case 'Gestor':
        return 'GestordeContenido';
      case 'Visualizador':
      default:
        return 'Visualizador';
    }
  }

  private determineUserTypeFromRole(role: string): string {
    switch (role) {
      case 'ADMINISTRADOR':
        return 'Administrador';
      case 'GESTOR_CONTENIDOS':
        return 'GestordeContenido';
      case 'VISUALIZADOR':
      default:
        return 'Visualizador';
    }
  }

  private mapRoleFromString(role: string): 'ADMINISTRADOR' | 'VISUALIZADOR' | 'GESTOR_CONTENIDOS' {
    switch (role) {
      case 'Administrador':
        return 'ADMINISTRADOR';
      case 'Gestor':
        return 'GESTOR_CONTENIDOS';
      case 'Visualizador':
      default:
        return 'VISUALIZADOR';
    }
  }

  // ========= MÉTODOS DE NAVEGACIÓN Y UI =========
  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  toggleForm(): void {
    this.showUserForm = !this.showUserForm;
    if (this.showUserForm) {
      // Asegurar que otros modales estén cerrados cuando se abre el formulario
      this.showEditUserModal = false;
      this.showPerfilModal = false;
      this.editingUser = null;
      // Inicializar userFormData con datos vacíos para crear usuario
      this.userFormData = this.createEmptyUserFormData();
      // Resetear estado del formulario
      this.fieldsWithError = [];
      this.successMessage = null;
      this.errorMessage = null;
      // isSuccess eliminado - manejado por user-form component
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

  verPerfil(usuario: Usuario): void {
    // NO cambiar currentUser - solo mostrar el perfil del usuario seleccionado
    this.perfilDetalle = usuario;
    this.showPerfilModal = true;
    this.loadingPerfil = false;
    this.errorPerfil = null;
    // Asegurar que otros modales estén cerrados
    this.showEditUserModal = false;
    this.showUserForm = false;
  }









 logout(): void {
    // Llamar al servicio de logout
    this.userService.logout().subscribe({
      next: () => {
        try {
          // Ya no necesitamos eliminar el token, el backend invalida la cookie
          sessionStorage.removeItem('user');
          sessionStorage.removeItem('currentUserClass');
          sessionStorage.removeItem('email');
        } catch {}
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Error al cerrar sesión:', err);
        alert('Error al cerrar sesión');
      }
    });
  }

  // MÃ©todos para la eliminaciÃ³n de usuarios
  openDeleteModal(usuario: Usuario) {
    this.usuarioAEliminar = usuario;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.usuarioAEliminar = null;
    this.isDeleting = false; // Asegurar que el flag de eliminaciÃ³n se resetea
    
    // Forzar la detecciÃ³n de cambios para asegurar que Angular actualiza la vista
    this.cdr.detectChanges();
    
    // Doble comprobaciÃ³n para asegurar que el modal se cierra
    setTimeout(() => {
      if (this.showDeleteModal) {
        console.log("Forzando cierre del modal");
        this.showDeleteModal = false;
        this.cdr.detectChanges();
      }
    }, 100);
  }


  // Métodos de modales removidos - ahora manejados por user-table component

  // ========= MÉTODOS DE FORMULARIO =========
  // exitForm eliminado - funcionalidad manejada por user-form component



  // ========= MÉTODOS DE CONFIRMACIÓN Y CREACIÓN ELIMINADOS =========
  // showCreationConfirmation, cancelCreateUser, confirmCreateUser eliminados - ahora manejados por user-form component



  // ========= MÉTODOS DE ESTADÍSTICAS =========
  getUsuariosActivos(): number {
    return this.usuarios.filter(u => !u.bloqueado).length;
  }

  getUsuariosBloqueados(): number {
    return this.usuarios.filter(u => u.bloqueado).length;
  }

  getAdministradores(): number {
    return this.usuarios.filter(u => u.rol === 'Administrador').length;
  }

  // ========= MÉTODOS DE PERFIL MODAL =========
  cerrarPerfilModal(): void {
    this.showPerfilModal = false;
    this.showProfileModal = false;
    this.perfilDetalle = null;
    this.errorPerfil = null;
  }











  // ========= MÉTODOS PARA MODAL GLOBAL =========
  onModalConfirmed(): void {
    if (this.currentModalResolve && this.currentModalId) {
      this.modalService.closeModal(this.currentModalId, true);
    }
  }

  onModalCancelled(): void {
    if (this.currentModalResolve && this.currentModalId) {
      this.modalService.closeModal(this.currentModalId, false);
    }
  }

  onModalClosed(): void {
    this.modalVisible = false;
    this.currentModalResolve = null;
    this.currentModalId = null;
  }



  // ========= MÉTODOS PARA COMPONENTES REFACTORIZADOS =========

  async onUserTableEdit(user: any): Promise<void> {
    // Convertir de mappedUser de vuelta a Usuario del AdminService para mapear correctamente
    const usuarioOriginal = this.usuarios.find(u => u.id === user.id);
    if (usuarioOriginal && usuarioOriginal.id) {
      try {
        // Cargar el perfil completo del usuario
        const adminId = this.obtenerAdminId();
        const perfilCompleto = await firstValueFrom(this.adminService.obtenerPerfil(usuarioOriginal.id, adminId || ''));
        
        // Mapear el perfil completo al formato del formulario
        this.editingUser = this.mapProfileToFormData(perfilCompleto);
        this.userFormData = this.mapProfileToFormData(perfilCompleto);
        this.userProfileData = perfilCompleto; // Guardar datos completos para el componente
        this.showUserForm = true;
      } catch (error) {
        console.error('Error loading user profile:', error);
        // Fallback al mapeo básico si falla la carga del perfil
        this.editingUser = this.mapToFormData(usuarioOriginal);
        this.userFormData = this.mapToFormData(usuarioOriginal);
        this.showUserForm = true;
      }
    }
  }

  onUserTableDelete(user: any): void {
    // Convertir de mappedUser de vuelta a Usuario del AdminService
    const usuarioOriginal = this.usuarios.find(u => u.id === user.id);
    if (usuarioOriginal) {
      this.onDeleteUser(usuarioOriginal);
    }
  }

  // ============================================
  // MÉTODO PARA VERIFICAR TOKEN DE AUTENTICACIÓN
  // ============================================
  private checkAuthToken() {
    // Ya no es necesario verificar el token manualmente.
    // La autenticación se gestiona mediante cookies HttpOnly.
    if (isPlatformBrowser(this.platformId)) {
      console.log('✅ Autenticación gestionada mediante cookies HttpOnly');
  onUserTableToggleStatus(user: any): void {
    // Convertir de mappedUser de vuelta a Usuario del AdminService
    const usuarioOriginal = this.usuarios.find(u => u.id === user.id);
    if (usuarioOriginal) {
      this.onToggleUserStatus(usuarioOriginal);
    }
  }

  onUserTableViewProfile(user: any): void {
    // Convertir de mappedUser de vuelta a Usuario del AdminService
    const usuarioOriginal = this.usuarios.find(u => u.id === user.id);
    if (usuarioOriginal) {
      this.verPerfil(usuarioOriginal);
    }
  }

  onUserTableSearch(searchTerm: string): void {
    this.searchTerm = searchTerm;
    this.applyUserFilters();
  }

  // Nuevos métodos para refrescar la lista después de acciones exitosas
  async onUserDeletedSuccessfully(user: any): Promise<void> {
    console.log('Usuario eliminado exitosamente, refrescando componente user-table...', user);
    try {
      // Agregar un pequeño delay para asegurar que el backend procese completamente la operación
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 segundo de delay
      // Solo recargar los datos una vez y refrescar el componente
      await this.loadUsuarios();
      this.applyUserFilters();
      // Forzar detección de cambios para que el user-table se actualice
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error al refrescar la lista después de eliminar usuario:', error);
    }
  }

  async onUserStatusToggledSuccessfully(user: any): Promise<void> {
    console.log('Estado de usuario cambiado exitosamente, refrescando componente user-table...', user);
    try {
      // Agregar un pequeño delay para asegurar que el backend procese completamente la operación
      await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 segundos de delay
      // Solo recargar los datos una vez y refrescar el componente
      await this.loadUsuarios();
      this.applyUserFilters();
      // Forzar detección de cambios para que el user-table se actualice
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error al refrescar la lista después de cambiar estado:', error);
    }
  }

  // Nuevos métodos para manejar los eventos específicos del user-form
  async onUserCreatedSuccessfully(): Promise<void> {
    console.log('Usuario creado exitosamente por user-form, refrescando lista...');
    try {
      this.showUserForm = false; // Cerrar el formulario
      this.editingUser = null;
      this.userProfileData = null;
      // Recargar la lista de usuarios
      await this.loadUsuarios();
      this.applyUserFilters();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error al refrescar la lista después de crear usuario:', error);
    }
  }

  async onUserUpdatedSuccessfully(user: any): Promise<void> {
    console.log('Usuario actualizado exitosamente por user-form, refrescando lista...', user);
    try {
      this.showUserForm = false; // Cerrar el formulario
      this.editingUser = null;
      this.userProfileData = null;
      // Recargar la lista de usuarios
      await this.loadUsuarios();
      this.applyUserFilters();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error al refrescar la lista después de actualizar usuario:', error);
    }
  }

  onUserFormValidationChange(isValid: boolean): void {
    this.isUserFormValid = isValid;
  }

  onUserFormSubmitEvent(userData: UserFormUser): void {
    this.onUserFormSubmit(userData);
  }

  onUserFormCancelEvent(): void {
    this.onUserFormCancel();
  }

  onUserDeleted(userId: string): void {
    console.log('Usuario eliminado:', userId);
    this.loadUsuarios();
  }

  onUserStatusToggled(event: { userId: string, blocked: boolean }): void {
    console.log('Estado del usuario cambiado:', event);
    this.loadUsuarios();
  }

  // Mapper mejorado
  private mapToFormData(usuario: Usuario): UserFormUser {
    return {
      id: usuario.id ? parseInt(usuario.id.toString()) : undefined,
      username: usuario.apodo || '',
      email: usuario.email || '',
      nombres: usuario.nombre || '',
      apellidos: usuario.apellidos || '',
      fechaNacimiento: '', // Campo no disponible en AdminService Usuario
      telefono: '', // Campo no disponible en AdminService Usuario
      genero: '', // Campo no disponible en AdminService Usuario
      estado: !usuario.bloqueado,
      rol: this.mapRoleFromString(usuario.rol) || 'VISUALIZADOR',
      fechaCreacion: '', // Campo no disponible en AdminService Usuario
      ultimoAcceso: '', // Campo no disponible en AdminService Usuario
      password: '',
      confirmPassword: ''
    };
  }

  // Mapear usuarios del AdminService al formato del UserTableComponent
  get mappedUsers(): any[] {
    return this.usuariosFiltrados.map(usuario => ({
      id: usuario.id,
      username: usuario.apodo || '',
      nombres: usuario.nombre || '',
      apellidos: usuario.apellidos || '',
      email: usuario.email || '',
      foto: usuario.foto || '',
      fechaNacimiento: '',
      telefono: '',
      genero: '',
      fechaCreacion: '',
      ultimoAcceso: '',
      estado: !usuario.bloqueado,
      rol: this.mapRoleFromString(usuario.rol)
    }));
  }

  createEmptyUserFormData(): UserFormUser {
    return {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      nombres: '',
      apellidos: '',
      fechaNacimiento: '',
      telefono: '',
      genero: '',
      estado: true,
      rol: 'VISUALIZADOR'
    };
  }

  // Mapear perfil completo del AdminService al formato del UserFormComponent
  private mapProfileToFormData(perfil: any): UserFormUser {
    const baseData = {
      id: perfil.id ? parseInt(perfil.id.toString()) : undefined,
      username: perfil.apodo || perfil.alias || '',
      email: perfil.email || '',
      nombres: perfil.nombre || '',
      apellidos: perfil.apellidos || '',
      fechaNacimiento: perfil.fechaNacimiento ? perfil.fechaNacimiento.toString().split('T')[0] : '',
      telefono: '', // No disponible en PerfilDetalle
      genero: '', // No disponible en PerfilDetalle
      estado: !perfil.bloqueado,
      rol: this.mapRoleFromString(perfil.rol) || 'VISUALIZADOR',
      fechaCreacion: perfil.fechaRegistro ? perfil.fechaRegistro.toString() : '',
      ultimoAcceso: '', // No disponible en PerfilDetalle
      password: '',
      confirmPassword: ''
    };

    return baseData;
  }

  // ========= MÉTODOS DE CONTENIDO =========
  verDetalleContenido(contenido: ContenidoResumen): void {
    this.detalleContenido = contenido as any;
    this.showContenidoModal = true;
  }

  cerrarContenidoModal(): void {
    this.showContenidoModal = false;
    this.detalleContenido = null;
    this.errorContenido = null;
  }

}