import { Component, OnInit, AfterViewInit, ChangeDetectorRef, Inject, PLATFORM_ID, NgZone } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AdminService, Usuario, PerfilDetalle, ContenidoResumen, ContenidoDetalle } from '../services/admin.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule]
})
export class AdminDashboardComponent implements OnInit {
  activeTab = 'inicio';
  showForm = false;
  usuarios: Usuario[] = [];
  usuariosFiltrados: Usuario[] = []; // Lista filtrada para mostrar
  // Contenidos (solo lectura)
  contenidos: ContenidoResumen[] = [];
  contenidosFiltrados: ContenidoResumen[] = [];
  filtroTipoContenido: 'Todos' | 'Audio' | 'Video' = 'Todos';
  busquedaContenido = '';
  showContenidoModal = false;
  detalleContenido: ContenidoDetalle | null = null;
  loadingContenido = false;
  errorContenido = '';
  // Control para cargar contenidos cuando aún no tenemos Admin-ID
  private pendingLoadContenidos = false;
  
  // InformaciÃ³n del usuario actual
  currentUser: any = null;
  
  // Estados para doble confirmación
  showEditConfirmation = false;
  showUploadConfirmation = false;
  showCreateConfirmation = false;
  // Estado de actualización en confirmación de edición
  isUpdating = false;


  // Modal de perfil
  showProfileModal = false;
  editingProfile = {
    nombre: '',
    apellidos: '',
    email: '',
    foto: ''
  };

  // Validación de contraseña en tiempo real
  passwordValidation = {
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false,
    noStartsWithUpperCase: false,
    passwordsMatch: false,
    notContainsUsername: true // Por defecto true hasta que se ingrese un nombre
  };

    // Modal de edición de usuario
  showEditUserModal = false;
  editingUser: Usuario | null = null;
  editUserForm: any = {};

  // Modal de confirmación para eliminar usuario
  showDeleteModal = false;
  usuarioAEliminar: Usuario | null = null;
  
  // Modal de visualizaciÃ³n de perfil
  showPerfilModal = false;
  perfilDetalle: PerfilDetalle | null = null;
  loadingPerfil = false;
  errorPerfil = '';
  
  // Modal de confirmaciÃ³n para bloquear/desbloquear usuario
  showBloqueoModal = false;
  usuarioABloquear: Usuario | null = null;
  accionBloqueo: 'bloquear' | 'desbloquear' = 'bloquear';
  loadingBloqueo = false;
  errorBloqueo = '';
  // Doble confirmaciÃ³n de bloqueo/desbloqueo
  confirmBloqueoStep: 1 | 2 = 1;
  
  // Estados para mostrar/ocultar contraseñas
  showPassword = false;
  showRepeatPassword = false;
  
  // Filtros
  filtroRol = 'Todos'; // 'Todos', 'Administrador', 'Gestor', 'Visualizador'
  busquedaNombre = ''; // Texto de bÃºsqueda

  newUser = {
    nombre: '',
    apellidos: '',
    email: '',
    contrasenia: '',
    repetirContrasenia: '',
    foto: '',
    departamento: '',
    rol: 'Administrador' as 'Administrador' | 'Gestor',
    // Campos especÃ­ficos para Gestor
    alias: '',
    descripcion: '',
    especialidad: '',
    tipoContenido: ''
  };
  errorMessage = '';
  successMessage = '';
  isCreating = false;
  isSuccess = false; // Nueva propiedad para mostrar estado de Ã©xito
  
  // Propiedades para manejar errores de validaciÃ³n
  fieldsWithError: string[] = [];

  // Fotos de perfil disponibles
  fotosDisponibles = [
    { id: 'perfil1.png', nombre: 'Perfil 1' },
    { id: 'perfil2.png', nombre: 'Perfil 2' },
    { id: 'perfil3.png', nombre: 'Perfil 3' },
    { id: 'perfil4.png', nombre: 'Perfil 4' }
  ];

  // Utilidades de fecha para inputs de tipo date
  todayStr: string = '';
  minAllowedBirthStr: string = '';
  maxBirthForFourYearsStr: string = '';

  constructor(
    private readonly adminService: AdminService,
    private readonly cdr: ChangeDetectorRef,
    private readonly router: Router,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) private readonly platformId: Object
  ) {}

  ngOnInit() {
    // Cargar informaciÃ³n del usuario actual desde localStorage (solo en el navegador)
    if (isPlatformBrowser(this.platformId)) {
      const userStr = localStorage.getItem('currentUser');
      if (userStr) {
        this.currentUser = JSON.parse(userStr);
      }
    }
    // Asegurar que activeTab esté inicializado correctamente
    if (!this.activeTab) {
      this.activeTab = 'inicio';
    }
    
    // Solo cargar datos cuando estemos en el navegador
    if (isPlatformBrowser(this.platformId)) {
      // Cargar información del usuario actual desde sessionStorage
      const userStr = sessionStorage.getItem('user');
      if (userStr) {
        try {
          this.currentUser = JSON.parse(userStr);
        } catch (e) {
          console.error('❌ Error al parsear usuario desde sessionStorage:', e);
        }
      }
      
      // Cargar usuarios para mostrar estadísticas en la vista de inicio
      this.loadUsuarios();
    }
    
    this.loadUsuarios();

    // Inicializar valores de fecha para inputs (usado en el modal de edición de visualizadores)
    const today = new Date();
    this.todayStr = AdminDashboardComponent.toDateInputValue(today);

    // fecha máxima para que la persona tenga al menos 4 años => hoy - 4 años
    const fourYearsAgo = new Date(today.getFullYear() - 4, today.getMonth(), today.getDate());
    this.maxBirthForFourYearsStr = AdminDashboardComponent.toDateInputValue(fourYearsAgo);

    // fecha mínima razonable (por ejemplo 100 años atrás)
    const minBirth = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
    this.minAllowedBirthStr = AdminDashboardComponent.toDateInputValue(minBirth);
  }

  static toDateInputValue(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  ngAfterViewInit() {
    // Segunda carga después de que la vista esté completamente inicializada
    // Esto asegura que las estadísticas se muestren correctamente desde el inicio
    if (isPlatformBrowser(this.platformId) && this.usuarios.length === 0) {
      console.log('🔄 AfterViewInit - Recargando usuarios para estadísticas...');
      setTimeout(() => {
        this.loadUsuarios();
      }, 100); // Pequeño delay para asegurar que la vista esté lista
    }
  }

  loadUsuarios() {
    // Limpiar cualquier mensaje de error anterior
    this.errorMessage = '';
    
    this.adminService.getUsuarios().subscribe({
      next: (usuarios) => {
        console.log('✅ Usuarios cargados exitosamente:', usuarios.length);
        this.usuarios = usuarios;
        // Resolver y persistir Admin-ID si falta
        try {
          if (this.currentUser && !((this.currentUser as any).id || (this.currentUser as any)._id)) {
            const match = this.currentUser?.email ? this.usuarios.find(u => u.email === this.currentUser?.email) : undefined;
            if (match?.id) {
              (this.currentUser as any).id = match.id;
              if (isPlatformBrowser(this.platformId)) {
                localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
              }
            }
          }
        } catch {}

        // Cargar contenidos si quedó pendiente y ahora hay Admin-ID
        if (this.activeTab === 'contenidos' && this.pendingLoadContenidos) {
          const adminId = this.obtenerAdminId();
          if (adminId) {
            this.pendingLoadContenidos = false;
            this.loadContenidos();
          }
        }
        this.aplicarFiltros(); // Aplicar filtros despuÃ©s de cargar usuarios
      },
      error: (error: any) => {
        console.error('❌ Error al cargar usuarios:', error);
        
        if (error.status === 401) {
          this.errorMessage = '❌ No tienes autorización para ver la lista de usuarios. Token inválido o expirado.';
        } else {
          this.errorMessage = 'Error al cargar la lista de usuarios';
          
          // Intentar recargar después de un tiempo si hay un error temporal
          setTimeout(() => {
            if (this.usuarios.length === 0) {
              this.loadUsuarios();
            }
          }, 3000);
        }
        
        // También forzar detección de cambios en caso de error
        this.cdr.detectChanges();
      }
    });
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'usuarios') {
      this.loadUsuarios();
    } else if (tab === 'contenidos') {
      const adminId = this.obtenerAdminId();
      if (!adminId) {
        this.pendingLoadContenidos = true;
        this.loadUsuarios();
      } else {
        this.loadContenidos();
      }
    }
    this.resetMessages();
  }

  resetMessages() {
    this.errorMessage = '';
    this.successMessage = '';
    this.isCreating = false; // Asegurar que se restablezca el estado de loading
    this.isSuccess = false; // Resetear estado de Ã©xito
    this.fieldsWithError = []; // Limpiar errores de campos
  }
  // ================= Contenidos (solo lectura) =================
  loadContenidos() {
    this.errorContenido = '';
    this.loadingContenido = true;
    const adminId = this.obtenerAdminId();
    if (!adminId) {
      this.errorContenido = 'No se pudo identificar al administrador';
      return;
    }
    // Debug ligero para confirmar el Admin-ID usado
    console.log('[Contenidos] Admin-ID usado:', adminId);

    this.adminService.getContenidos(adminId).subscribe({
      next: (lista) => {
        console.log('[Contenidos] Recibidos:', Array.isArray(lista) ? lista.length : 'n/a', 'items');
        if (Array.isArray(lista)) {
          console.log('[Contenidos] Ejemplo:', lista[0]);
        }
        this.contenidos = lista;
        this.aplicarFiltrosContenidos();
        this.loadingContenido = false;
        // Forzar render inmediato tras actualizar arrays
        try { this.cdr.detectChanges(); } catch {}
      },
      error: (err) => {
        console.error('Error al cargar contenidos:', err);
        try {
          const msg = (err?.error && (err.error.error || err.error.message)) || '';
          this.errorContenido = msg ? `Error al cargar contenidos: ${msg}` : 'Error al cargar contenidos';
        } catch {
          this.errorContenido = 'Error al cargar contenidos';
        }
        this.loadingContenido = false;
      }
    });
  }

  aplicarFiltrosContenidos() {
    let arr = [...this.contenidos];
    if (this.filtroTipoContenido !== 'Todos') {
      arr = arr.filter(c => c.tipo === this.filtroTipoContenido);
    }
    if (this.busquedaContenido.trim()) {
      const q = this.busquedaContenido.trim().toLowerCase();
      arr = arr.filter(c => (c.titulo || '').toLowerCase().includes(q) || (c.gestorNombre || '').toLowerCase().includes(q));
    }
    this.contenidosFiltrados = arr;
  }

  onFiltroTipoContenidoChange() { this.aplicarFiltrosContenidos(); }
  onBusquedaContenidoChange() { this.aplicarFiltrosContenidos(); }
  limpiarFiltrosContenidos() {
    this.filtroTipoContenido = 'Todos';
    this.busquedaContenido = '';
    this.aplicarFiltrosContenidos();
  }

  verDetalleContenido(c: any) {
    const adminId = this.obtenerAdminId();
    if (!adminId) {
      this.errorContenido = 'No se pudo identificar al administrador';
      return;
    }
    this.showContenidoModal = true;
    this.loadingContenido = true;
    this.errorContenido = '';
    this.detalleContenido = null;
    this.adminService.getContenidoDetalle(c.id, adminId).subscribe({
      next: (det) => {
        this.detalleContenido = det;
        this.loadingContenido = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error contenido detalle:', err);
        this.errorContenido = 'No se pudo cargar el detalle';
        this.loadingContenido = false;
        this.cdr.detectChanges();
      }
    });
  }

  cerrarContenidoModal() {
    this.showContenidoModal = false;
    this.detalleContenido = null;
    this.loadingContenido = false;
    this.errorContenido = '';
  }
  toggleForm() {
    this.showForm = !this.showForm;
    if (this.showForm) {
      // Limpiar mensajes cuando se abre el formulario
      this.resetMessages();
      // Recargar la lista de usuarios cuando se cierre el formulario
      this.loadUsuarios();
    } else {
      this.resetForm();
      this.resetMessages();
    }
  }

  onRoleChange(role: 'Administrador' | 'Gestor') {
    this.newUser.rol = role;
  }

  createUser() {
    
    this.resetMessages();
    
    // Limpiar errores anteriores
    this.fieldsWithError = [];
    
    // Validar campos obligatorios segÃºn el rol
    let requiredFields: string[];
    
    if (this.newUser.rol === 'Gestor') {
      requiredFields = ['nombre', 'apellidos', 'email', 'contrasenia', 'alias', 'especialidad', 'tipoContenido', 'foto'];
    } else {
      requiredFields = ['nombre', 'apellidos', 'email', 'contrasenia', 'departamento'];
    }
    
    const emptyFields = requiredFields.filter(field => !this.newUser[field as keyof typeof this.newUser]);
    
    if (emptyFields.length > 0) {
      this.fieldsWithError = [...emptyFields];
      this.errorMessage = `âŒ Complete todos los campos obligatorios: ${emptyFields.join(', ')}`;
      return;
    }

    // Validar contraseÃ±as coincidentes
    console.log('âœ… COMPONENTE: ValidaciÃ³n contraseÃ±as - contrasenia:', this.newUser.contrasenia);
    console.log('âœ… COMPONENTE: ValidaciÃ³n contraseÃ±as - repetirContrasenia:', this.newUser.repetirContrasenia);
    
    if (!this.isPasswordValid()) {
      this.fieldsWithError = ['contrasenia', 'repetirContrasenia'];
      this.errorMessage = 'âŒ Las contraseÃ±as no coinciden. Verifique que ambas contraseÃ±as sean idÃ©nticas.';
      return;
    }

    // Validar email
    if (!this.isValidEmail(this.newUser.email)) {
      this.fieldsWithError = ['email'];
      this.errorMessage = 'âŒ Por favor, ingrese un correo electrÃ³nico vÃ¡lido (ejemplo: usuario@dominio.com).';
      return;
    }

    // Solo activar loading después de validar
    this.isCreating = true;
    
    // Forzar detecciÃ³n de cambios despuÃ©s de actualizar isCreating
    this.cdr.detectChanges();

    // Construir userData segÃºn el tipo de usuario
    let userData: any = {
      nombre: this.newUser.nombre,
      apellidos: this.newUser.apellidos,
      email: this.newUser.email,
      contrasenia: this.newUser.contrasenia,
      foto: this.newUser.foto || undefined,
      rol: this.newUser.rol
    };

    // Agregar campos especÃ­ficos segÃºn el rol
    if (this.newUser.rol === 'Gestor') {
      userData = {
        ...userData,
        alias: this.newUser.alias,
        descripcion: this.newUser.descripcion || undefined,
        especialidad: this.newUser.especialidad,
        tipoContenido: this.newUser.tipoContenido
      };
    } else {
      userData.departamento = this.newUser.departamento;
    }



    // Variable para el timeout de respaldo
    let backupTimeout: any = null;
    
    // Implementar timeout de respaldo mÃ¡s largo ahora que sabemos que el server responde
    backupTimeout = setTimeout(() => {
      if (this.isCreating) {
        this.isCreating = false;
        this.cdr.detectChanges(); // Forzar actualizaciÃ³n en timeout
        this.errorMessage = 'La operaciÃ³n tardÃ³ mÃ¡s tiempo del esperado, pero es posible que el administrador se haya creado.';
        
        // Recargar usuarios para verificar
        setTimeout(() => {
          this.loadUsuarios();
        }, 1000);
        
        // Limpiar error despuÃ©s de 6 segundos
        setTimeout(() => {
          this.errorMessage = '';
        }, 6000);
      }
    }, 8000);

    this.adminService.crearUsuario(userData).subscribe({
      next: (response: any) => {
        clearTimeout(backupTimeout); // Cancelar timeout de respaldo
        
        // Extraer el nombre de la respuesta del servidor o usar el del formulario
        const nombreCreado = response?.nombre || this.newUser.nombre;
        
        // Ejecutar cambios de estado dentro de la zona de Angular
        this.ngZone.run(() => {
          this.isCreating = false;
          this.isSuccess = true;
          
          // Mensaje de éxito específico por rol
          const tipoUsuario = this.newUser.rol === 'Gestor' ? 'Gestor de Contenido' : 'Administrador';
          this.successMessage = `¡${tipoUsuario} "${nombreCreado}" creado exitosamente!`;
          
          // **RECARGAR AUTOMÁTICAMENTE la lista de usuarios para que se vea el nuevo usuario**
          console.log('🔄 Usuario creado exitosamente, recargando lista automáticamente...');
          this.loadUsuarios();
          
          // FORZAR DETECCIÓN DE CAMBIOS
          this.cdr.detectChanges();
        });
      },
      error: (error: any) => {
        console.error('❌ Error completo al crear usuario:', error);
        
        clearTimeout(backupTimeout); // Cancelar timeout de respaldo
        this.isCreating = false;
        this.cdr.detectChanges(); // Forzar actualizaciÃ³n en errores tambiÃ©n
        
        let mensajeError = 'Error desconocido';
        
        // Detectar especÃ­ficamente errores de CORS o conexiÃ³n
        if (error.status === 0 && error.error?.message?.includes('Failed to fetch')) {
          mensajeError = 'Error de conexiÃ³n CORS. El backend no estÃ¡ ejecutÃ¡ndose o hay un problema de configuraciÃ³n. Por favor, inicia el servidor backend.';
        } else if (error.status === 'timeout') {
          mensajeError = 'La conexiÃ³n tardÃ³ demasiado tiempo. Es posible que el administrador se haya creado correctamente.';
          // En caso de timeout, asumir que pudo haberse creado y recargar usuarios
          setTimeout(() => {
            this.loadUsuarios();
          }, 1000);
        } else if (error.status === 0) {
          mensajeError = 'No se pudo conectar con el servidor. Verifica que el backend estÃ© ejecutÃ¡ndose en el puerto 8080.';
        } else if (error.error?.mensaje) {
          // Mensaje del backend
          mensajeError = error.error.mensaje;
          
          // Mejorar mensajes especÃ­ficos de MongoDB
          if (mensajeError.includes('E11000 duplicate key error')) {
            if (mensajeError.includes('email')) {
              mensajeError = 'El email ya estÃ¡ registrado. Por favor, usa un email diferente.';
            } else {
              mensajeError = 'Ya existe un registro con estos datos. Verifica la informaciÃ³n.';
            }
          } else if (mensajeError.includes('Write operation error')) {
            mensajeError = 'Error de base de datos. Por favor, contacta al administrador del sistema.';
          }
        } else if (error.error?.message) {
          mensajeError = error.error.message;
        } else if (error.status === 500) {
          mensajeError = 'Error interno del servidor. Por favor, intÃ©ntalo de nuevo mÃ¡s tarde.';
        } else if (error.status === 400) {
          mensajeError = 'Datos invÃ¡lidos. Verifica la informaciÃ³n ingresada.';
        } else if (error.status) {
          mensajeError = `Error del servidor: ${error.status} - ${error.statusText || 'Error HTTP'}`;
        }
        
        this.errorMessage = mensajeError;
        
        // Limpiar el mensaje despuÃ©s de 10 segundos
        setTimeout(() => {
          this.errorMessage = '';
        }, 10000);
      }
    });
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return emailRegex.test(email);
  }

  resetForm() {
    this.newUser = {
      nombre: '',
      apellidos: '',
      email: '',
      contrasenia: '',
      repetirContrasenia: '',
      foto: '',
      departamento: '',
      rol: 'Administrador',
      // Campos especÃ­ficos para Gestor
      alias: '',
      descripcion: '',
      especialidad: '',
      tipoContenido: ''
    };
    this.resetMessages();
  }

  getUsuariosActivos(): number {
    return this.usuarios.filter(u => !u.bloqueado).length;
  }

  getAdministradores(): number {
    return this.usuarios.filter(u => u.rol === 'Administrador').length;
  }

  // MÃ©todo para verificar si un campo tiene error
  hasFieldError(fieldName: string): boolean {
    return this.fieldsWithError.includes(fieldName);
  }

  // MÃ©todo para seleccionar/deseleccionar foto de perfil
  selectFoto(fotoId: string) {
    // Si la foto ya estÃ¡ seleccionada y es para Administrador (opcional), deseleccionar
    if (this.newUser.foto === fotoId && this.newUser.rol === 'Administrador') {
      this.newUser.foto = '';
    } else {
      // Seleccionar la nueva foto
      this.newUser.foto = fotoId;
    }
    
    // Limpiar error de foto si existÃ­a
    if (this.fieldsWithError.includes('foto')) {
      this.fieldsWithError = this.fieldsWithError.filter(field => field !== 'foto');
    }
  }

  // MÃ©todo para salir del formulario despuÃ©s del Ã©xito
  exitForm() {
    console.log('🚪 SALIENDO del formulario - recargando usuarios...');
    
    // Cerrar formulario y resetear
    this.showForm = false;
    this.resetForm();
    
    // Recargar la lista de usuarios inmediatamente
    this.loadUsuarios();
    
    // Mostrar mensaje de Ã©xito en la vista principal
    const nombreCreado = this.newUser.nombre || 'nuevo administrador';
    this.successMessage = `âœ… El administrador "${nombreCreado}" ha sido registrado correctamente en el sistema.`;
    
    // Forzar detección de cambios después de cerrar el formulario
    this.cdr.detectChanges();
    
    // Limpiar el mensaje después de 5 segundos
    setTimeout(() => {
      this.successMessage = '';
      this.cdr.detectChanges(); // También forzar detección al limpiar mensaje
    }, 5000);
  }



  getUsuariosBloqueados(): number {
    return this.usuarios.filter(u => u.bloqueado).length;
  }

  // Formatear fecha para mostrar en el dashboard
  formatDate(dateString: string): string {
    if (!dateString) return 'No disponible';
    
    try {
      const date = new Date(dateString);
      const options: Intl.DateTimeFormatOptions = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      return date.toLocaleDateString('es-ES', options);
    } catch (error) {
      return 'Fecha no válida';
    }
  }

  // Validación de contraseña en tiempo real
  validatePassword() {
    const password = this.newUser.contrasenia;
    const confirmPassword = this.newUser.repetirContrasenia;
    const nombre = this.newUser.nombre.trim();
    
    // Validar longitud mínima (8 caracteres)
    this.passwordValidation.minLength = password.length >= 8;
    
    // Validar que tenga al menos una mayúscula
    this.passwordValidation.hasUpperCase = /[A-Z]/.test(password);
    
    // Validar que tenga al menos una minúscula
    this.passwordValidation.hasLowerCase = /[a-z]/.test(password);
    
    // Validar que tenga al menos un número
    this.passwordValidation.hasNumber = /[0-9]/.test(password);
    
    // Validar que tenga al menos un carácter especial
    this.passwordValidation.hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    // Validar que NO empiece con mayúscula
    this.passwordValidation.noStartsWithUpperCase = password.length > 0 && !/^[A-Z]/.test(password);
    
    // Validar que las contraseñas coincidan
    this.passwordValidation.passwordsMatch = password.length > 0 && password === confirmPassword;
    
    // Validar que la contraseña NO contenga el nombre de usuario (insensible a mayúsculas)
    if (nombre.length > 0 && password.length > 0) {
      this.passwordValidation.notContainsUsername = !password.toLowerCase().includes(nombre.toLowerCase());
    } else {
      // Si no hay nombre o contraseña, consideramos válido este criterio
      this.passwordValidation.notContainsUsername = true;
    }
  }

  // Verificar si la contraseña es válida
  isPasswordValid(): boolean {
    return this.passwordValidation.minLength &&
           this.passwordValidation.hasUpperCase &&
           this.passwordValidation.hasLowerCase &&
           this.passwordValidation.hasNumber &&
           this.passwordValidation.hasSpecialChar &&
           this.passwordValidation.noStartsWithUpperCase &&
           this.passwordValidation.passwordsMatch &&
           this.passwordValidation.notContainsUsername;
  }

  // Métodos de filtrado
  aplicarFiltros() {
    let usuariosFiltrados = [...this.usuarios];

    // Filtrar por rol si no es "Todos"
    if (this.filtroRol !== 'Todos') {
      usuariosFiltrados = usuariosFiltrados.filter(usuario => usuario.rol === this.filtroRol);
    }

    // Filtrar por nombre (bÃºsqueda en tiempo real)
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

  // ============================================
  // MÃ‰TODOS DE PERFIL Y LOGOUT
  // ============================================

  openProfileModal() {
    if (this.currentUser) {
      this.editingProfile = {
        nombre: this.currentUser.nombre,
        apellidos: this.currentUser.apellidos,
        email: this.currentUser.email,
        foto: this.currentUser.foto || ''
      };
      this.showProfileModal = true;
    }
  }

  closeProfileModal() {
    this.showProfileModal = false;
    this.resetMessages();
  }

  saveProfile() {
    // Validaciones
    if (!this.editingProfile.nombre.trim() || !this.editingProfile.apellidos.trim()) {
      this.errorMessage = 'Nombre y apellidos son obligatorios';
      return;
    }

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Preparar datos para enviar
    const updates = {
      nombre: this.editingProfile.nombre,
      apellidos: this.editingProfile.apellidos,
      foto: this.editingProfile.foto
    };

    const userId = this.currentUser._id || this.currentUser.id;

    // Llamar al backend para actualizar en MongoDB
    this.adminService.updateProfile(userId, updates).subscribe({
      next: (response: any) => {
        // Actualizar currentUser con la respuesta del servidor
        this.currentUser = { ...this.currentUser, ...response };
        
        // Actualizar tambiÃ©n en localStorage
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        
        this.successMessage = 'Perfil actualizado correctamente en la base de datos';
        setTimeout(() => {
          this.closeProfileModal();
        }, 1500);
      },
      error: (err: any) => {
        console.error('Error al actualizar perfil:', err);
        this.errorMessage = 'Error al actualizar el perfil. Por favor, intente nuevamente.';
      }
    });
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      // Limpiar localStorage
      localStorage.removeItem('currentUser');
      localStorage.removeItem('sessionToken');
      
      // Mostrar mensaje y redirigir
      this.successMessage = 'SesiÃ³n cerrada';
      setTimeout(() => {
        this.router.navigate(['/home']);
      }, 1000);
    }
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

  // Variable para evitar mÃºltiples clics
  isDeleting = false;

  deleteUser() {
    if (!this.usuarioAEliminar || this.isDeleting) return;

    const userId = this.usuarioAEliminar.id || (this.usuarioAEliminar as any)._id;
    const nombreUsuario = this.usuarioAEliminar.nombre;
    const apellidosUsuario = this.usuarioAEliminar.apellidos;

    // Normalizar identificadores y roles
    const currentUserId = this.currentUser?.id || this.currentUser?._id || null;
    const currentUserEmail = (this.currentUser?.email || '').toString();
    const currentUserRole = (this.currentUser?.rol || this.currentUser?.role || '').toString().toLowerCase();

    const targetId = userId || null;
    const targetEmail = (this.usuarioAEliminar?.email || '').toString();
    const targetRole = (this.usuarioAEliminar?.rol || '').toString().toLowerCase();

    const isSameById = currentUserId && targetId && currentUserId === targetId;
    const isSameByEmail = currentUserEmail && targetEmail && currentUserEmail === targetEmail;
    const isSelf = !!(isSameById || isSameByEmail);

    // Si el objetivo es Visualizador, SOLO él mismo puede eliminarse.
    // Ni administradores, ni gestores, ni otros visualizadores pueden borrarlo.
    if (targetRole === 'visualizador') {
      if (!isSelf) {
        this.errorMessage = 'Sólo un visualizador puede eliminar su propia cuenta.';
        this.closeDeleteModal();
        setTimeout(() => { this.errorMessage = ''; }, 5000);
        return;
      }

      // Además, asegurarnos de que el usuario actual tenga rol Visualizador
      if (currentUserRole !== 'visualizador') {
        this.errorMessage = 'Sólo un visualizador puede eliminar su propia cuenta.';
        this.closeDeleteModal();
        setTimeout(() => { this.errorMessage = ''; }, 5000);
        return;
      }
      // Si es self y rol también es visualizador, permitir continuar
    }

    // En el admin-dashboard (acceso solo para administradores) no se permite
    // que el usuario actual se elimine a sí mismo. No hace falta comprobar explícitamente
    // el rol porque este dashboard solo lo usan administradores.
    if (isSelf) {
      this.errorMessage = 'No puedes eliminar tu propia cuenta de administrador.';
      this.closeDeleteModal();
      setTimeout(() => { this.errorMessage = ''; }, 5000);
      return;
    }
    
    if (!userId) {
      this.errorMessage = 'Error: ID de usuario no disponible';
      this.closeDeleteModal();
      return;
    }
    
    // Activar flag para prevenir mÃºltiples clics
    this.isDeleting = true;
    
    // CAMBIO IMPORTANTE: Cerrar el modal ANTES de la llamada al API
    // Esto garantiza que el modal se cierre independientemente de la respuesta del servidor
    // Guardar referencia local del usuario y sus datos
    const tempId = userId;
    const tempNombre = nombreUsuario;
    const tempApellidos = apellidosUsuario;
    
    // Cerrar el modal inmediatamente
    this.showDeleteModal = false;
    
    // Realizar la llamada al backend para eliminar el usuario
    this.adminService.deleteUser(tempId).subscribe({
      next: (response: any) => {
        console.log('Usuario eliminado correctamente:', response);
        
        // Actualizar la lista despuÃ©s de la eliminaciÃ³n exitosa
        this.usuarios = this.usuarios.filter(u => u.id !== tempId);
        this.aplicarFiltros();
        
        // Limpiar la referencia al usuario eliminado
        this.usuarioAEliminar = null;
        
        // Mostrar mensaje de Ã©xito
        this.successMessage = `Usuario ${tempNombre} ${tempApellidos} eliminado correctamente`;
        
        // Limpiar mensaje despuÃ©s de unos segundos
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        console.error('Error al eliminar usuario:', error);
        
        // Asegurar que el modal estÃ© cerrado y la referencia limpia
        this.usuarioAEliminar = null;
        
        // Mostrar mensaje de error
        this.errorMessage = `Error al eliminar el usuario ${tempNombre}. IntÃ©ntelo de nuevo.`;
        
        // Recargar la lista de usuarios para asegurarnos de que estÃ¡ actualizada
        this.loadUsuarios();
        
        // Limpiar mensaje despuÃ©s de unos segundos
        setTimeout(() => {
          this.errorMessage = '';
        }, 5000);
      },
      complete: () => {
        // Restablecer flag de eliminaciÃ³n siempre
        this.isDeleting = false;
        
        // Forzar detecciÃ³n de cambios
        this.cdr.detectChanges();
      }
    });
  }

  // ============================================
  // MÃ‰TODOS PARA EL MODAL DE VISUALIZACIÃ“N DE PERFIL
  // ============================================

  /**
   * Abre el modal de perfil y carga los datos del usuario
   * @param usuario Usuario cuyo perfil se va a visualizar
   */
  verPerfil(usuario: Usuario) {
    if (!usuario?.id) {
      this.errorPerfil = 'ID de usuario no disponible';
      this.showPerfilModal = true;
      this.loadingPerfil = false;
      this.perfilDetalle = null;
      this.cdr.detectChanges();
      return;
    }

    // Resolver Admin-ID (cabecera requerida por el backend)
    let adminId = this.currentUser?.id;
    if (!adminId && this.currentUser?.email) {
      const adminEnLista = this.usuarios.find(u => u.email === this.currentUser?.email);
      if (adminEnLista?.id) adminId = adminEnLista.id;
    }
    if (!adminId) {
      const primerAdmin = this.usuarios.find(u => u.rol === 'Administrador');
      if (primerAdmin?.id) adminId = primerAdmin.id;
    }

    this.showPerfilModal = true;
    this.loadingPerfil = true;
    this.errorPerfil = '';
    this.perfilDetalle = null;
    this.cdr.detectChanges();

    // Temporizador de respaldo por si la peticiÃ³n queda colgada
    const backupTimeout = setTimeout(() => {
      if (this.loadingPerfil) {
        console.warn('[Perfil] Timeout de respaldo: backend no responde');
        this.loadingPerfil = false;
        this.errorPerfil = 'No se pudo obtener el perfil. Verifica que el backend estÃ© en ejecuciÃ³n (puerto 8080).';
        this.cdr.detectChanges();
      }
    }, 7000);

    // Llamada real al backend
    this.adminService.obtenerPerfil(usuario.id, adminId).subscribe({
      next: (perfil) => {
        clearTimeout(backupTimeout);
        this.perfilDetalle = perfil;
        this.loadingPerfil = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        clearTimeout(backupTimeout);
        this.loadingPerfil = false;
        // Mapear mensaje de error de forma robusta
        let mensaje = 'Error al cargar el perfil del usuario';
        if (error?.status === 0) {
          mensaje = 'No hay conexiÃ³n con el servidor. Â¿EstÃ¡ el backend levantado en http://localhost:8080?';
        } else if (error?.status === 'timeout' || error?.name === 'TimeoutError') {
          mensaje = 'Tiempo de espera agotado al consultar el perfil.';
        } else if (error?.error?.mensaje) {
          mensaje = error.error.mensaje;
        } else if (error?.error?.message) {
          mensaje = error.error.message;
        } else if (error?.message) {
          mensaje = error.message;
        }
        this.errorPerfil = mensaje;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Cierra el modal de perfil
   */
  cerrarPerfilModal() {
    this.showPerfilModal = false;
    this.perfilDetalle = null;
    this.errorPerfil = '';
    this.loadingPerfil = false;
  }

  /**
   * Formatea una fecha para mostrar
   * @param fecha Fecha a formatear
   */
  formatearFecha(fecha: Date | undefined): string {
    if (!fecha) return 'No disponible';
    
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  usuarioADetalle: Usuario | null = null;

  // Habilita el modal fallback usado solo para diagnóstico.
  // Cambia a `true` temporalmente si necesitas reactivar el fallback en desarrollo.
  private enableFallbackEditModal = false;


  // ============================================
  // Confirmación de edición de usuario (modal)
  // ============================================
  cancelUserChanges() {
    // Cierra el modal de confirmación sin aplicar cambios
    this.showEditConfirmation = false;
  }

  async saveUserChanges() {
    // Si no hay datos cargados para editar, simplemente cierra
    if (!this.editUserForm || !this.editUserForm.id) {
      this.showEditConfirmation = false;
      return;
    }

    this.isUpdating = true;
    try {
      // Usa el endpoint genérico de actualización por rol para minimizar riesgos
      const rol = this.editUserForm.rol || 'Visualizador';
      await firstValueFrom(this.adminService.updateUser(this.editUserForm.id, this.editUserForm, rol));

      // Refresca la lista local
      await new Promise(res => setTimeout(res, 200));
      this.loadUsuarios();
      this.showEditConfirmation = false;
    } catch (e) {
      console.error('Error al guardar cambios del usuario:', e);
      this.errorMessage = 'No se pudieron guardar los cambios. Inténtalo de nuevo.';
    } finally {
      this.isUpdating = false;
      this.cdr.detectChanges();
    }
  }

  closePerfilModal() {
    this.showPerfilModal = false;
    this.usuarioADetalle = null;
    this.cdr.detectChanges();
  }

  // ==================================================
  // Utilidad: normalizar URL de foto para cualquier rol
  // Admite string absoluto, relativo o estructuras simples
  // ==================================================
  getFotoUrl(foto: any): string {
    if (!foto) return '';
    if (typeof foto === 'string') {
      // Si ya es absoluta o empieza por '/', usar tal cual
      if (foto.startsWith('http://') || foto.startsWith('https://') || foto.startsWith('/')) {
        return foto;
      }
    }
      // Si es solo el nombre de archivo, servir desde raíz pública
      return `/${foto}`;
  }

/*  // NUEVO: Cargar detalles completos del usuario según su tipo
  private loadUserDetails(userId: string, rol: string) {
    
    switch (rol) {
      case 'Administrador':
        this.adminService.getAdministradorById(userId).subscribe({
          next: (response) => this.processUserDetails(response, 'Administrador'),
          error: (error) => this.handleUserDetailsError(error, '/users', 'Administrador')
        });
        break;
      case 'Gestor':
        this.adminService.getGestorById(userId).subscribe({
          next: (response) => this.processUserDetails(response, 'Gestor'),
          error: (error) => this.handleUserDetailsError(error, '/users', 'Gestor')
        });
        break;
      case 'Visualizador':
      default:
        this.adminService.getVisualizadorById(userId).subscribe({
          next: (response) => this.processUserDetails(response, 'Visualizador'),
          error: (error) => this.handleUserDetailsError(error, '/users', 'Visualizador')
        });
        break;
    }
  }*/
/*
  private processUserDetails(response: any, rol: string) {

    let userDetails: any;

    if (response && typeof response === 'object') {
      userDetails = response;
    } else {
      console.warn('⚠️ Respuesta inesperada:', response);
      this.errorMessage = 'Error: no se pudieron cargar los datos del usuario';
      return;
    }
    
    // Actualizar el formulario con TODOS los datos disponibles
    this.editUserForm = {
      ...this.editUserForm,
      ...userDetails
    };
    
    // Mapeos específicos para campos que pueden tener nombres diferentes
    if (userDetails.campoespecializacion) {
      this.editUserForm.especialidad = userDetails.campoespecializacion;
    }
    
    // ARREGLO DE FECHAS: Convertir fechas al formato YYYY-MM-DD para inputs HTML
    if (userDetails.fechaNac || userDetails.fechanac) {
      const fechaNac = userDetails.fechaNac || userDetails.fechanac;
      this.editUserForm.fechanac = this.formatDateForInput(fechaNac);
    }
    
    if (userDetails.fechaRegistro || userDetails.fecharegistro) {
      const fechaRegistro = userDetails.fechaRegistro || userDetails.fecharegistro;
      this.editUserForm.fecharegistro = this.formatDateForInput(fechaRegistro);
    }
    
    if (userDetails.alias) {
      this.editUserForm.alias = userDetails.alias;
    }
    
    this.cdr.detectChanges(); // Forzar actualización de la vista
  }
    */

  /*

  // Método para formatear fechas para inputs HTML utilizando YYYY-MM-DD
  private formatDateForInput(dateValue: any): string {
    if (!dateValue) return '';
    
    try {
      let date: Date;
      
      if (dateValue instanceof Date) {
        date = dateValue;
      } else if (typeof dateValue === 'string') {
        date = new Date(dateValue);
      } else if (typeof dateValue === 'number') {
        date = new Date(dateValue);
      } else {
        return '';
      }
      
      if (Number.isNaN(date.getTime())) {
        return '';
      }
      
      // Formatear como YYYY-MM-DD para input[type="date"]
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      return '';
    }
    // Si viene como objeto con campo url o path
    if (foto.url && typeof foto.url === 'string') return foto.url;
    if (foto.path && typeof foto.path === 'string') return foto.path.startsWith('/') ? foto.path : `/${foto.path}`;
    return '';
  }
*/
  // ==================================================
  // Bloquear/Desbloquear Usuario
  // ==================================================

  /**
   * Abre el modal de confirmaciÃ³n para bloquear/desbloquear usuario
   */
  abrirModalBloqueo(usuario: Usuario) {
    this.usuarioABloquear = usuario;
    this.accionBloqueo = usuario.bloqueado ? 'desbloquear' : 'bloquear';
    this.showBloqueoModal = true;
    this.errorBloqueo = '';
    this.confirmBloqueoStep = 1;
  }

   openEditUserModal(usuario: Usuario) {
    this.editingUser = usuario;
    
    // Mostrar modal inmediatamente con datos básicos
    this.showEditUserModal = true;
    this.showEditConfirmation = false;
    this.resetMessages();
    
    // Preparar formulario con datos básicos primero
    this.editUserForm = {
      id: usuario.id,
      nombre: usuario.nombre,
      apellidos: usuario.apellidos,
      email: usuario.email,
      foto: usuario.foto,
      departamento: usuario.departamento || '',
      rol: usuario.rol || 'Visualizador',
      bloqueado: usuario.bloqueado,
      alias: '',
      especialidad: '',
      descripcion: '',
      tipocontenidovideooaudio: '',
      fecharegistro: null,
      fechanac: '',
      vip: false
    };
    
    // Cargar datos específicos según el tipo de usuario
    this.loadUserDetails(usuario.id!, usuario.rol || 'Visualizador');
  }

  private updateFallbackEditModalContent(el: HTMLElement) {
    const pre = el.querySelector('pre');
    if (pre) pre.textContent = JSON.stringify(this.editUserForm, null, 2);
  }

  private removeFallbackEditModal() {
    try {
      const existing = document.getElementById('fallback-edit-modal');
      if (existing && existing.parentElement) existing.parentElement.removeChild(existing);
      try { delete (window as any).__openFallbackConfirm; } catch {}
    } catch (e) { console.warn('Error removing fallback modal', e); }
  }

  /**
   * Confirma y ejecuta la acción de bloquear/desbloquear
   */
  confirmarBloqueo() {
    if (!this.usuarioABloquear) return;

    // Primera pulsación: mostrar aviso y pedir confirmación con un segundo clic
    if (this.confirmBloqueoStep === 1) {
      this.confirmBloqueoStep = 2;
      return;
    }

    const adminId = this.obtenerAdminId();
    if (!adminId) {
      this.errorBloqueo = 'No se pudo identificar al administrador';
      return;
    }

    this.loadingBloqueo = true;
    this.errorBloqueo = '';
    // Mostrar confirmación
    // Si el usuario es Visualizador y se proporcionó una fecha de nacimiento, hay que validarla
    if (this.editUserForm.rol === 'Visualizador' && this.editUserForm.fechanac) {
      const err = this.validateBirthDateForAdmin(this.editUserForm.fechanac, 4);
      if (err) {
        this.errorMessage = err;
        // Mantener el modal abierto para que el administrador corrija la fecha
        return;
      }
    }

    this.showEditConfirmation = true;
    this.resetMessages();
  }

  // Validador para la fecha de nacimiento en el admin-dashboard
  validateBirthDateForAdmin(dateStr: string, minYears: number): string | null {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Fecha de nacimiento inválida';
    const today = new Date();
    if (d > today) return 'La fecha de nacimiento no puede ser futura';
    const cutoff = new Date(today.getFullYear() - minYears, today.getMonth(), today.getDate());
    if (d > cutoff) return `El usuario debe tener al menos ${minYears} años`;
    return null;
  }

  /*// Segundo paso: confirmar cambios
  async saveUserChanges() {
    if (!this.editingUser || this.isUpdating) return;

    const accion$ = this.accionBloqueo === 'bloquear'
      ? this.adminService.bloquearUsuario(this.usuarioABloquear!.id!, adminId)
      : this.adminService.desbloquearUsuario(this.usuarioABloquear!.id!, adminId);

    // Fallback por si algo deja el loading en true mÃ¡s de 7s
    const backup = setTimeout(() => {
      if (this.loadingBloqueo) {
        this.loadingBloqueo = false;
        this.errorBloqueo = 'La operaciÃ³n tardÃ³ mÃ¡s de lo esperado. Refresca la lista para ver el estado.';
        this.cdr.detectChanges();
      }
    }, 7000);

    accion$.subscribe({
      next: async (response) => {
        console.log('âœ… Usuario', this.accionBloqueo === 'bloquear' ? 'bloqueado' : 'desbloqueado');
        
        // Actualizar el estado local INMEDIATAMENTE (usuarios y filtrados)
        const nuevoEstado = this.accionBloqueo === 'bloquear';
        const idObjetivo = this.usuarioABloquear?.id;
        if (idObjetivo) {
          // Actualizar referencia directa (objeto seleccionado)
          this.usuarioABloquear!.bloqueado = nuevoEstado;

          // Actualizar lista principal
          this.usuarios = this.usuarios.map(u => u.id === idObjetivo ? { ...u, bloqueado: nuevoEstado } : u);

      // SIMPLIFICADO: Usar un solo método para todos los tipos de usuario
      let updatedUser: any;
      updatedUser = await firstValueFrom(this.adminService.updateUser(this.editUserForm.id, this.usuarios, this.editUserForm.rol));
      
      console.log('✅ Respuesta de actualización:', updatedUser);
      
      // ESTRATEGIA SIMPLIFICADA: Asumir que la respuesta ES directamente los datos actualizados
      let userData: any;
      if (updatedUser && typeof updatedUser === 'object') {
        userData = updatedUser;
        console.log('📦 Usando datos directos de la respuesta:', userData);
      } else {
        console.warn('⚠️ Respuesta inesperada, usando datos enviados como fallback');
        userData = this.usuarios; // Usar los datos que enviamos como fallback
      }
      
      if (userData) {
        // Actualizar el usuario en la lista local
        const index = this.usuarios.findIndex(u => u.id === this.editingUser?.id);
        if (index !== -1) {
          this.usuarios[index] = { ...this.usuarios[index], ...userData };
          this.aplicarFiltros();
        }

        // Sincronizar con servidor tras un pequeÃ±o delay para evitar sobrescribir con datos obsoletos
        setTimeout(() => this.loadUsuarios(), 600);
        
        // Cerrar modal
        this.cerrarModalBloqueo();
        this.loadingBloqueo = false;
        clearTimeout(backup);
        this.cdr.detectChanges();
      }}},
      error: (error) => {
        console.error('🛑 Error:', error);
        this.errorBloqueo = error.message || `Error al ${this.accionBloqueo} usuario`;
        this.loadingBloqueo = false;
        clearTimeout(backup);
        this.cdr.detectChanges();
      }
    });
  }*/

  /**
   * Cierra el modal de bloqueo
   */
  cerrarModalBloqueo() {
    this.showBloqueoModal = false;
    this.usuarioABloquear = null;
    this.loadingBloqueo = false;
    this.errorBloqueo = '';
  }

  /**
   * Obtiene el ID del administrador actual
   */
  private obtenerAdminId(): string | undefined {
    // Primero intenta desde currentUser (acepta id o _id)
    if (this.currentUser?._id || this.currentUser?.id) {
      return (this.currentUser as any)._id || this.currentUser.id;
    }

    // Buscar en la lista de usuarios por email
    if (this.currentUser?.email) {
      const adminEnLista = this.usuarios.find(u => u.email === this.currentUser?.email);
      if (adminEnLista?.id) {
        return adminEnLista.id;
      }
    }

    // Último recurso: devolver el primer administrador disponible
    const primerAdmin = this.usuarios.find(u => u.rol === 'Administrador');
    return primerAdmin?.id || undefined;
  }
    // Ãšltimo recurso: primer administrador de la lista
  // ============================================
  // MÉTODOS PARA MOSTRAR/OCULTAR CONTRASEÑAS
  // ============================================
  
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
  
  toggleRepeatPasswordVisibility() {
    this.showRepeatPassword = !this.showRepeatPassword;
  }

  // ============================================
  // MÉTODO PARA MOSTRAR CONFIRMACIÓN DE CREACIÓN
  // ============================================
  
  showCreationConfirmation() {
    // Resetear mensajes
    this.resetMessages();
    
    // Limpiar errores anteriores
    this.fieldsWithError = [];
    
    // Validar campos obligatorios según el rol
    let requiredFields: string[];
    
    if (this.newUser.rol === 'Gestor') {
      requiredFields = ['nombre', 'apellidos', 'email', 'contrasenia', 'alias', 'especialidad', 'tipoContenido', 'foto'];
    } else {
      requiredFields = ['nombre', 'apellidos', 'email', 'contrasenia', 'departamento'];
    }
    
    const emptyFields = requiredFields.filter(field => !this.newUser[field as keyof typeof this.newUser]);
    
    if (emptyFields.length > 0) {
      this.fieldsWithError = [...emptyFields];
      this.errorMessage = `❌ Complete todos los campos obligatorios: ${emptyFields.join(', ')}`;
      return;
    }

    // Validar política de contraseñas
    this.validatePassword();
    
    if (!this.isPasswordValid()) {
      this.fieldsWithError = ['contrasenia', 'repetirContrasenia'];
      
      const errores = [];
      if (!this.passwordValidation.minLength) errores.push('mínimo 8 caracteres');
      if (!this.passwordValidation.noStartsWithUpperCase) errores.push('no debe comenzar con mayúscula');
      if (!this.passwordValidation.hasUpperCase) errores.push('al menos una letra mayúscula');
      if (!this.passwordValidation.hasLowerCase) errores.push('al menos una letra minúscula');
      if (!this.passwordValidation.hasNumber) errores.push('al menos un número');
      if (!this.passwordValidation.hasSpecialChar) errores.push('al menos un carácter especial (!@#$%^&*...)');
      if (!this.passwordValidation.passwordsMatch) errores.push('las contraseñas deben coincidir');
      if (!this.passwordValidation.notContainsUsername) errores.push('no debe contener el nombre de usuario');
      
      this.errorMessage = `❌ La contraseña no cumple con la política de seguridad: ${errores.join(', ')}`;
      return;
    }

    // Validar email
    if (!this.isValidEmail(this.newUser.email)) {
      this.fieldsWithError = ['email'];
      this.errorMessage = '❌ Por favor, ingrese un correo electrónico válido (ejemplo: usuario@dominio.com).';
      return;
    }

    // Si todas las validaciones pasan, mostrar modal de confirmación
    this.showCreateConfirmation = true;
    
    console.log('� Estado DESPUÉS - showCreateConfirmation:', this.showCreateConfirmation);
    console.log('🔍 Estado DESPUÉS - showForm:', this.showForm);
    
    // Forzar múltiples detecciones de cambios
    this.cdr.detectChanges();
    
    setTimeout(() => {
      console.log('⏰ Verificación después de 100ms - showCreateConfirmation:', this.showCreateConfirmation);
      this.cdr.detectChanges();
    }, 100);
  }

  // ============================================
  // MÉTODO PARA CONFIRMAR Y CREAR USUARIO
  // ============================================
  
  confirmCreateUser() {
    this.showCreateConfirmation = false;
    this.createUser();
  }

  // ============================================
  // MÉTODO PARA CANCELAR CREACIÓN
  // ============================================
  
  cancelCreateUser() {
    // Solo cerrar el modal de confirmación, el formulario se mantiene abierto
    this.showCreateConfirmation = false;
  }

  // ============================================
  // MÉTODO PARA VERIFICAR TOKEN DE AUTENTICACIÓN
  // ============================================
  
  private checkAuthToken() {
    if (isPlatformBrowser(this.platformId)) {
      const token = sessionStorage.getItem('authToken') || 
                    localStorage.getItem('authToken') || 
                    sessionStorage.getItem('token');
      
      if (token) {
        console.log('✅ Token de autorización encontrado:', token.substring(0, 20) + '...');
      } else {
        console.warn('⚠️ No se encontró token de autorización');
        // Generar token de prueba temporal si es necesario
        const testToken = 'test-token-' + Date.now();
        sessionStorage.setItem('authToken', testToken);
        console.log('🧪 Token de prueba generado:', testToken);
      }
    }

    // Ãšltimo recurso: primer administrador de la lista
    const primerAdmin = this.usuarios.find(u => u.rol === 'Administrador');
    return primerAdmin?.id || null;
  }

  confirmUserChanges() {
    // Verificar si tenemos token de autorización
    this.checkAuthToken();
    
    // Validar campos obligatorios según el tipo de usuario
    let requiredFields: string[] = ['nombre', 'apellidos', 'email'];
    
    // Agregar campos específicos según el rol
    if (this.editUserForm.rol === 'Administrador') {
      requiredFields.push('departamento');
    } else if (this.editUserForm.rol === 'Gestor') {
      requiredFields.push('alias');
    }
    // Para Visualizadores, solo nombre, apellidos y email son obligatorios

    const emptyFields = requiredFields.filter(field => !this.editUserForm[field]?.trim());
    
    if (emptyFields.length > 0) {
      this.errorMessage = `Complete los siguientes campos obligatorios: ${emptyFields.join(', ')}`;
      return;
    }

    // Mostrar confirmación
    this.showEditConfirmation = true;
    this.resetMessages();
  }

  closeEditUserModal() {
    this.showEditUserModal = false;
    this.showEditConfirmation = false;
    this.editingUser = null;
    this.editUserForm = {};
    this.resetMessages();
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

  private loadUserDetails(userId: string, rol: string) {
    
    switch (rol) {
      case 'Administrador':
        this.adminService.getAdministradorById(userId).subscribe({
          next: (response) => this.processUserDetails(response, 'Administrador'),
          error: (error) => this.handleUserDetailsError(error, '/users', 'Administrador')
        });
        break;
      case 'Gestor':
        this.adminService.getGestorById(userId).subscribe({
          next: (response) => this.processUserDetails(response, 'Gestor'),
          error: (error) => this.handleUserDetailsError(error, '/users', 'Gestor')
        });
        break;
      case 'Visualizador':
      default:
        this.adminService.getVisualizadorById(userId).subscribe({
          next: (response) => this.processUserDetails(response, 'Visualizador'),
          error: (error) => this.handleUserDetailsError(error, '/users', 'Visualizador')
        });
        break;
    }
  }

  private handleUserDetailsError(error: any, endpointUrl: string, rol: string) {
    console.error(`❌ Error cargando detalles del ${rol}:`, error);
    console.error('🔍 URL que falló:', endpointUrl);
    console.error('🔍 Status del error:', error.status);
    console.error('🔍 Mensaje del error:', error.message);
    
    // Si falla, mantenemos los datos básicos que ya tenemos
    this.errorMessage = `No se pudieron cargar todos los detalles del usuario. Endpoint: ${endpointUrl}`;
    
    // Limpiar el mensaje después de unos segundos
    setTimeout(() => {
      this.errorMessage = '';
    }, 8000);
  }

  private processUserDetails(response: any, rol: string) {
    let userDetails: any;
    
    // ESTRATEGIA SIMPLIFICADA: Asumir que la respuesta ES directamente los datos del usuario
    if (response && typeof response === 'object') {
      userDetails = response;
    } else {
      this.errorMessage = 'Error: no se pudieron cargar los datos del usuario';
      return;
    }
    
    // Actualizar el formulario con TODOS los datos disponibles
    this.editUserForm = {
      ...this.editUserForm,
      ...userDetails
    };
    
    // Mapeos específicos para campos que pueden tener nombres diferentes
    if (userDetails.campoespecializacion) {
      this.editUserForm.especialidad = userDetails.campoespecializacion;
    }
    
    // 🔧 ARREGLO DE FECHAS: Convertir fechas al formato YYYY-MM-DD para inputs HTML
    if (userDetails.fechaNac || userDetails.fechanac) {
      const fechaNac = userDetails.fechaNac || userDetails.fechanac;
      this.editUserForm.fechanac = this.formatDateForInput(fechaNac);
    }
    
    if (userDetails.fechaRegistro || userDetails.fecharegistro) {
      const fechaRegistro = userDetails.fechaRegistro || userDetails.fecharegistro;
      this.editUserForm.fecharegistro = this.formatDateForInput(fechaRegistro);
    }
    
    if (userDetails.alias) {
      this.editUserForm.alias = userDetails.alias;
    }
    this.cdr.detectChanges(); // Forzar actualización de la vista
  }
   private formatDateForInput(dateValue: any): string {
    if (!dateValue) return '';
    
    try {
      let date: Date;
      
      if (dateValue instanceof Date) {
        date = dateValue;
      } else if (typeof dateValue === 'string') {
        date = new Date(dateValue);
      } else if (typeof dateValue === 'number') {
        date = new Date(dateValue);
      } else {
        return '';
      }
      
      if (Number.isNaN(date.getTime())) {
        return '';
      }
      
      // Formatear como YYYY-MM-DD para input[type="date"]
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      return '';
    }
  }

}


