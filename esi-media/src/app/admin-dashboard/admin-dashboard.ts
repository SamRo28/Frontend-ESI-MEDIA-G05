import { Component, OnInit, OnDestroy, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';

// Servicios refactorizados
import { UserValidationService } from '../services/user-validation.service';
import { ModalService, ModalConfig } from '../services/modal.service';
import { AdminService, Usuario, PerfilDetalle, ContenidoResumen, ContenidoDetalle } from '../services/admin.service';

// Componentes refactorizados (comentados porque no se usan directamente en el template)
// import { UserFormComponent, Usuario as UserFormUser } from '../shared/components/user-form/user-form.component';
// import { UserTableComponent } from '../shared/components/user-table/user-table.component';
// import { PasswordValidatorComponent } from '../shared/components/password-validator/password-validator.component';
import { ConfirmationModalComponent } from '../shared/components/confirmation-modal/confirmation-modal.component';

// Interface local para datos de usuario del formulario
interface UserFormUser {
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
    ConfirmationModalComponent
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
  isSuccess = false;

  // Estados de modales
  showUserForm = false;
  showProfileModal = false;
  showContenidoModal = false;
  showConfirmationModal = false;
  
  // Datos para modales
  editingUser: UserFormUser | null = null;
  detalleContenido: ContenidoDetalle | null = null;
  
  // Usuario nuevo para formularios
  newUser: any = {
    rol: 'Administrador',
    nombre: '',
    apellidos: '',
    email: '',
    apodo: '',
    departamento: '',
    contrasenia: '',
    repetirContrasenia: '',
    foto: null
  };
  
  // Estados de validación y formularios
  passwordValidation: any = {
    minLength: false,
    noStartsWithUpperCase: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false,
    passwordsMatch: false,
    notContainsUsername: false
  };
  
  // Variable para controlar si el formulario ha sido tocado
  formTouched = false;
  
  // Estados de visibilidad de contraseñas
  showPassword = false;
  showRepeatPassword = false;
  
  // Estados de validación y creación
  fieldsWithError: string[] = [];
  showCreateConfirmation = false;
  isCreating = false;
  
  // Estados de perfil modal
  showPerfilModal = false;
  loadingPerfil = false;
  errorPerfil: string | null = null;
  perfilDetalle: Usuario | null = null;
  
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
  
  // Propiedades adicionales
  todayStr = new Date().toISOString().split('T')[0];
  minAllowedBirthStr = new Date(new Date().getFullYear() - 100, 0, 1).toISOString().split('T')[0];
  confirmationConfig: ModalConfig = {
    title: 'Confirmar',
    message: '¿Está seguro?',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar'
  };

  // Estados de perfil
  editingProfile = {
    nombre: '',
    apellidos: '',
    email: '',
    foto: ''
  };

  // Estados de operaciones
  isCreatingUser = false;
  isUpdatingUser = false;
  loadingContenido = false;

  // Fotos disponibles
  fotosDisponibles = [
    { id: 'perfil1.png', nombre: 'Perfil 1' },
    { id: 'perfil2.png', nombre: 'Perfil 2' },
    { id: 'perfil3.png', nombre: 'Perfil 3' },
    { id: 'perfil4.png', nombre: 'Perfil 4' }
  ];

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
    this.showUserForm = true;
  }

  onEditUser(user: Usuario): void {
    this.editingUser = this.mapToFormData(user);
    this.showUserForm = true;
  }

  onDeleteUser(user: Usuario): void {
    this.modalService.openConfirmationModal({
      title: 'Eliminar Usuario',
      message: `¿Está seguro de que desea eliminar al usuario "${user.nombre} ${user.apellidos}"?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'error'
    }).then((confirmed) => {
      if (confirmed && user.id) {
        this.executeUserDeletion(user.id);
      }
    });
  }

  onToggleUserStatus(user: Usuario): void {
    const action = user.bloqueado ? 'desbloquear' : 'bloquear';
    const actionText = user.bloqueado ? 'Desbloquear' : 'Bloquear';
    
    this.modalService.openConfirmationModal({
      title: `${actionText} Usuario`,
      message: `¿Está seguro de que desea ${action} al usuario "${user.nombre} ${user.apellidos}"?`,
      confirmText: actionText,
      cancelText: 'Cancelar',
      type: user.bloqueado ? 'success' : 'warning'
    }).then((confirmed) => {
      if (confirmed && user.id) {
        this.executeUserStatusToggle(user.id, user.bloqueado);
      }
    });
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
  }

  private async createUser(userData: UserFormUser): Promise<void> {
    try {
      this.isCreatingUser = true;
      this.errorMessage = null;
      
      const adminData = this.mapUserFormToAdminData(userData);
      await firstValueFrom(this.adminService.crearUsuario(adminData));
      
      this.successMessage = `${userData.rol === 'ADMINISTRADOR' ? 'Administrador' : 'Gestor de contenido'} creado exitosamente.`;
      this.isSuccess = true;
      this.loadUsuarios();
    } catch (error) {
      console.error('Error creating user:', error);
      this.errorMessage = 'Error al crear el usuario. Por favor, inténtelo de nuevo.';
      this.isSuccess = false;
    } finally {
      this.isCreatingUser = false;
    }
  }

  private async updateUser(userId: number, userData: UserFormUser): Promise<void> {
    try {
      this.isUpdatingUser = true;
      this.errorMessage = null;
      
      const updateData = this.mapUserFormToUpdateData(userData);
      const tipo = this.determineUserTypeFromRole(userData.rol);
      await firstValueFrom(this.adminService.updateUser(userId.toString(), updateData, tipo));
      
      this.successMessage = 'Usuario actualizado exitosamente.';
      this.isSuccess = true;
      this.loadUsuarios();
    } catch (error) {
      console.error('Error updating user:', error);
      this.errorMessage = 'Error al actualizar el usuario. Por favor, inténtelo de nuevo.';
      this.isSuccess = false;
    } finally {
      this.isUpdatingUser = false;
    }
  }

  private async executeUserDeletion(userId: string): Promise<void> {
    try {
      await firstValueFrom(this.adminService.deleteUser(userId));
      console.log('Usuario eliminado exitosamente');
      this.loadUsuarios();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  }

  private async executeUserStatusToggle(userId: string, currentlyBlocked: boolean): Promise<void> {
    try {
      const adminId = this.obtenerAdminId();
      if (!adminId) {
        console.error('No se pudo obtener el ID del administrador');
        return;
      }

      // Si está bloqueado actualmente, desbloquear; si no está bloqueado, bloquear
      if (currentlyBlocked) {
        await firstValueFrom(this.adminService.desbloquearUsuario(userId, adminId));
        console.log('Usuario desbloqueado exitosamente');
      } else {
        await firstValueFrom(this.adminService.bloquearUsuario(userId, adminId));
        console.log('Usuario bloqueado exitosamente');
      }
      
      // Recargar la lista de usuarios después de la operación
      await this.loadUsuarios();
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  }

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
      this.applyContentFilters();
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      this.loading = false;
    }
  }

  onContentSearch(): void {
    this.applyContentFilters();
  }

  onContentTypeFilterChange(): void {
    this.applyContentFilters();
  }

  public applyContentFilters(): void {
    let filtered = [...this.contenidos];
    
    // Filtro por tipo
    if (this.filtroTipoContenido !== 'Todos') {
      filtered = filtered.filter(content => content.tipo === this.filtroTipoContenido);
    }
    
    // Filtro por búsqueda
    if (this.busquedaContenido) {
      const search = this.busquedaContenido.toLowerCase();
      filtered = filtered.filter(content =>
        content.titulo?.toLowerCase().includes(search) ||
        content.titulo?.toLowerCase().includes(search)
      );
    }
    
    this.contenidosFiltrados = filtered;
  }

  async mostrarDetalleContenido(contenido: ContenidoResumen): Promise<void> {
    if (!contenido.id) return;

    try {
      this.loadingContenido = true;
      this.showContenidoModal = true;
      // Método no disponible en AdminService, simplemente asignamos el contenido actual
      this.detalleContenido = contenido;
    } catch (error) {
      console.error('Error loading content detail:', error);
    } finally {
      this.loadingContenido = false;
    }
  }

  cerrarModalContenido(): void {
    this.showContenidoModal = false;
    this.detalleContenido = null;
  }

  // ==================== GESTIÓN DE PERFIL ====================

  abrirModalPerfil(): void {
    if (this.currentUser) {
      this.editingProfile = {
        nombre: this.currentUser.nombres || '',
        apellidos: this.currentUser.apellidos || '',
        email: this.currentUser.email || '',
        foto: this.currentUser.foto || ''
      };
      this.showProfileModal = true;
    }
  }

  async guardarPerfil(): Promise<void> {
    if (!this.currentUser?.id) return;

    try {
      const profileData = {
        nombres: this.editingProfile.nombre,
        apellidos: this.editingProfile.apellidos,
        email: this.editingProfile.email,
        foto: this.editingProfile.foto
      };

      const userType = this.determineUserType(this.currentUser);
      await firstValueFrom(this.adminService.updateUser(this.currentUser.id!, profileData, userType));
      
      // Actualizar información local
      this.currentUser = { ...this.currentUser, ...profileData };
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
      }
      
      console.log('Perfil actualizado exitosamente');
      this.showProfileModal = false;
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  }

  cancelarEditarPerfil(): void {
    this.showProfileModal = false;
  }

  // ==================== UTILIDADES Y MAPPERS ====================

  private obtenerAdminId(): string | null {
    return this.currentUser?.id?.toString() || null;
  }

  private mapToFormData(usuario: Usuario): any {
    return {
      id: usuario.id ? parseInt(usuario.id.toString()) : undefined,
      username: usuario.apodo || '',
      email: usuario.email || '',
      nombres: usuario.nombre || '',
      apellidos: usuario.apellidos || '',
      fechaNacimiento: '',
      telefono: '',
      genero: '',
      estado: !usuario.bloqueado,
      rol: this.mapRoleFromString(usuario.rol) || 'VISUALIZADOR',
      fechaCreacion: undefined,
      ultimoAcceso: undefined
    };
  }

  private mapUserFormToAdminData(userData: UserFormUser): any {
    return {
      nombre: userData.nombres,
      apellidos: userData.apellidos,
      email: userData.email,
      contrasenia: userData.password,
      alias: userData.username,
      departamento: userData.rol === 'GESTOR_CONTENIDOS' ? 'Gestión de Contenidos' : 'Administración',
      rol: userData.rol === 'GESTOR_CONTENIDOS' ? 'Gestor' : 'Administrador',
      foto: 'perfil1.png',
      especialidad: userData.rol === 'GESTOR_CONTENIDOS' ? 'Contenido Digital' : '',
      tipoContenido: userData.rol === 'GESTOR_CONTENIDOS' ? 'Audio y Video' : ''
    };
  }

  private mapUserFormToUpdateData(userData: UserFormUser): any {
    const updateData: any = {
      nombres: userData.nombres,
      apellidos: userData.apellidos,
      email: userData.email,
      telefono: userData.telefono,
      genero: userData.genero,
      fechaNacimiento: userData.fechaNacimiento
    };

    if (userData.password && userData.password.trim() !== '') {
      updateData.contrasenia = userData.password;
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

  // ==================== MÉTODOS DE COMPATIBILIDAD ====================
  // Estos métodos mantienen compatibilidad con el template existente

  filtrarUsuarios(): void {
    this.applyUserFilters();
  }

  filtrarContenidos(): void {
    this.applyContentFilters();
  }

  toggleTab(tab: string): void {
    this.selectTab(tab);
  }

  crearNuevoUsuario(): void {
    this.onCreateUser();
  }

  editarUsuario(user: Usuario): void {
    this.onEditUser(user);
  }

  eliminarUsuario(user: Usuario): void {
    this.onDeleteUser(user);
  }

  toggleUserEstado(user: Usuario): void {
    this.onToggleUserStatus(user);
  }

  // Mantener compatibilidad con propiedades del template original
  get showForm(): boolean {
    return this.showUserForm;
  }

  set showForm(value: boolean) {
    this.showUserForm = value;
  }

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
      // Resetear estado del formulario
      this.formTouched = false;
      this.fieldsWithError = [];
      this.successMessage = null;
      this.errorMessage = null;
      this.isSuccess = false;
    }
  }

  // ========= MÉTODOS DE PERFIL =========
  openProfileModal(): void {
    this.showProfileModal = true;
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

  // ========= MÉTODOS DE FILTRADO Y BÚSQUEDA =========
  onBusquedaChange(): void {
    this.applyUserFilters();
  }

  onFiltroRolChange(): void {
    this.applyUserFilters();
  }

  onBusquedaContenidoChange(): void {
    this.applyContentFilters();
  }

  onFiltroTipoContenidoChange(): void {
    this.applyContentFilters();
  }

  limpiarFiltros(): void {
    this.busquedaNombre = '';
    this.filtroRol = 'Todos';
    this.applyUserFilters();
  }

  limpiarFiltrosContenidos(): void {
    this.busquedaContenido = '';
    this.filtroTipoContenido = 'Todos';
    this.applyContentFilters();
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

  // ========= MÉTODOS DE FORMULARIO =========
  onRoleChange(role: string): void {
    this.newUser.rol = role;
    this.formTouched = true;
  }

  // Método para marcar el formulario como tocado cuando el usuario interactúa
  onFieldInteraction(): void {
    this.formTouched = true;
  }

  // Método público para crear usuario desde formulario
  public submitCreateUser(): void {
    // Usar el método privado existente
    const userData: UserFormUser = {
      username: this.newUser.apodo,
      email: this.newUser.email,
      nombres: this.newUser.nombre,
      apellidos: this.newUser.apellidos,
      estado: true,
      rol: this.mapRoleFromString(this.newUser.rol),
      password: this.newUser.contrasenia
    };
    
    this.onUserFormSubmit(userData);
  }

  openEditUserModal(usuario: Usuario): void {
    this.editingUser = this.mapToFormData(usuario);
    this.editUserForm = { ...usuario };
    this.showEditUserModal = true;
    // NO abrir showUserForm - solo el modal de edición específico
  }

  openDeleteModal(usuario: Usuario): void {
    this.usuarioAEliminar = usuario;
    this.showDeleteModal = true;
  }

  abrirModalBloqueo(usuario: Usuario): void {
    this.usuarioABloquear = usuario;
    this.accionBloqueo = usuario.bloqueado ? 'desbloquear' : 'bloquear';
    this.showBloqueoModal = true;
  }

  // ========= MÉTODOS DE FORMULARIO =========
  exitForm(): void {
    this.showUserForm = false;
    this.editingUser = null;
    this.resetMessages();
  }

  // ========= MÉTODOS DE VALIDACIÓN Y FORMULARIO =========
  hasFieldError(field: string): boolean {
    
    const value = this.newUser[field];
    if (!value || value.trim() === '') {
      return true;
    }
    
    if (field === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return !emailRegex.test(value);
    }
    
    return false;
  }

  selectFoto(fotoId: string): void {
    this.newUser.foto = fotoId;
    this.formTouched = true;
  }

  validatePassword(): void {
    const password = this.newUser.contrasenia || '';
    const repeatPassword = this.newUser.repetirContrasenia || '';
    const username = this.newUser.apodo || '';

    this.passwordValidation = {
      minLength: password.length >= 8,
      noStartsWithUpperCase: password.length > 0 && !password[0].match(/[A-Z]/),
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      passwordsMatch: password === repeatPassword && password.length > 0,
      notContainsUsername: username.length === 0 || !password.toLowerCase().includes(username.toLowerCase())
    };
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleRepeatPasswordVisibility(): void {
    this.showRepeatPassword = !this.showRepeatPassword;
  }

  // ========= MÉTODOS DE CONFIRMACIÓN Y CREACIÓN =========
  showCreationConfirmation(): void {
    this.validateAllFields();
    if (this.fieldsWithError.length === 0) {
      this.showCreateConfirmation = true;
    }
  }

  cancelCreateUser(): void {
    this.showCreateConfirmation = false;
  }

  confirmCreateUser(): void {
    this.isCreating = true;
    // Usar el método privado existente directamente
    const userData: UserFormUser = {
      username: this.newUser.apodo,
      email: this.newUser.email,
      nombres: this.newUser.nombre,
      apellidos: this.newUser.apellidos,
      estado: true,
      rol: this.mapRoleFromString(this.newUser.rol),
      password: this.newUser.contrasenia
    };
    
    this.onUserFormSubmit(userData);
    this.showCreateConfirmation = false;
    this.isCreating = false;
  }

  private validateAllFields(): void {
    this.fieldsWithError = [];
    const requiredFields = ['nombre', 'apellidos', 'email', 'apodo'];
    
    requiredFields.forEach(field => {
      if (this.hasFieldError(field)) {
        this.fieldsWithError.push(field);
      }
    });
  }

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

  // ========= MÉTODOS DE UTILIDADES =========
  formatearFecha(fecha: string | Date | null | undefined): string {
    if (!fecha) return '-';
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return '-';
    }
  }

  // ========= MÉTODOS DE MODAL DE ELIMINACIÓN =========
  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.usuarioAEliminar = null;
  }

  deleteUser(): void {
    if (this.usuarioAEliminar) {
      this.isDeleting = true;
      this.onDeleteUser(this.usuarioAEliminar);
      this.closeDeleteModal();
      this.isDeleting = false;
    }
  }

  // ========= MÉTODOS DE MODAL DE BLOQUEO =========
  cerrarModalBloqueo(): void {
    this.showBloqueoModal = false;
    this.usuarioABloquear = null;
    this.loadingBloqueo = false;
    this.confirmBloqueoStep = 1;
    this.errorBloqueo = null;
  }

  confirmarBloqueo(): void {
    if (this.usuarioABloquear) {
      this.loadingBloqueo = true;
      this.onToggleUserStatus(this.usuarioABloquear);
      this.cerrarModalBloqueo();
    }
  }

  // ========= MÉTODOS DE EDICIÓN DE USUARIO =========
  // Método ya actualizado arriba

  closeEditUserModal(): void {
    this.showEditUserModal = false;
    this.showEditConfirmation = false;
    this.showUserForm = false;  // Asegurar que el modal de crear también se cierre
    this.editUserForm = {};
    this.editingUser = null;
  }

  getUserTypeDisplayName(rol: string): string {
    switch (rol) {
      case 'Administrador':
        return 'Administrador';
      case 'Gestor':
        return 'Gestor de Contenido';
      case 'Visualizador':
      default:
        return 'Visualizador';
    }
  }

  cancelUserChanges(): void {
    this.showEditConfirmation = false;
  }

  saveUserChanges(): void {
    this.isUpdating = true;
    // Aquí iría la lógica de guardado
    this.closeEditUserModal();
    this.isUpdating = false;
  }

  // ========= MÉTODOS DE PERFIL =========
  closeProfileModal(): void {
    this.showProfileModal = false;
    this.showPerfilModal = false;
  }

  saveProfile(): void {
    // Lógica para guardar perfil
    this.closeProfileModal();
  }

  // ========= MÉTODOS FINALES =========
  confirmUserChanges(): void {
    this.showEditConfirmation = true;
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

  // ========= MÉTODOS DE MENSAJES =========
  resetMessages(): void {
    this.successMessage = null;
    this.errorMessage = null;
    this.isSuccess = false;
    this.formTouched = false;
    // Limpiar también el formulario para crear un nuevo usuario
    this.newUser = {
      rol: 'Administrador',
      nombre: '',
      apellidos: '',
      email: '',
      apodo: '',
      departamento: '',
      contrasenia: '',
      repetirContrasenia: '',
      foto: null
    };
    this.fieldsWithError = [];
  }
}