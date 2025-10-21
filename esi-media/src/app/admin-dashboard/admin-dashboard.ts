import { Component, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AdminService, Usuario, PerfilDetalle, ContenidoResumen, ContenidoDetalle } from '../services/admin.service';

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
  
  // Modal de perfil
  showProfileModal = false;
  editingProfile = {
    nombre: '',
    apellidos: '',
    email: '',
    foto: ''
  };
  
  // Modal de confirmaciÃ³n para eliminar usuario
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

  constructor(
    private readonly adminService: AdminService,
    private readonly cdr: ChangeDetectorRef,
    private readonly router: Router,
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
    
    this.loadUsuarios();
  }

  loadUsuarios() {
    // Limpiar cualquier mensaje de error anterior
    this.errorMessage = '';
    
    this.adminService.getUsuarios().subscribe({
      next: (usuarios) => {
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
        console.error('Error al cargar usuarios:', error);
        this.errorMessage = 'Error al cargar la lista de usuarios';
        
        // Intentar recargar despuÃ©s de un tiempo si hay un error temporal
        setTimeout(() => {
          if (this.usuarios.length === 0) {
            this.loadUsuarios();
          }
        }, 3000);
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
    } else {
      this.resetForm();
      this.resetMessages();
    }
  }

  onRoleChange(role: 'Administrador' | 'Gestor') {
    this.newUser.rol = role;
  }

  createUser() {
    console.log('ðŸŽ¯ COMPONENTE: *** createUser() EJECUTADO ***');
    console.log('ðŸ“‹ COMPONENTE: Datos del formulario:', this.newUser);
    console.log('ðŸ“‹ COMPONENTE: isCreating antes:', this.isCreating);
    
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
    
    console.log('âœ… COMPONENTE: ValidaciÃ³n campos vacÃ­os - Tipo de usuario:', this.newUser.rol);
    console.log('âœ… COMPONENTE: ValidaciÃ³n campos vacÃ­os - Campos requeridos:', requiredFields);
    console.log('âœ… COMPONENTE: ValidaciÃ³n campos vacÃ­os - Campos vacÃ­os encontrados:', emptyFields);
    
    if (emptyFields.length > 0) {
      console.log('âŒ COMPONENTE: ValidaciÃ³n fallÃ³ - campos vacÃ­os:', emptyFields);
      this.fieldsWithError = [...emptyFields];
      this.errorMessage = `âŒ Complete todos los campos obligatorios: ${emptyFields.join(', ')}`;
      return;
    }

    // Validar contraseÃ±as coincidentes
    console.log('âœ… COMPONENTE: ValidaciÃ³n contraseÃ±as - contrasenia:', this.newUser.contrasenia);
    console.log('âœ… COMPONENTE: ValidaciÃ³n contraseÃ±as - repetirContrasenia:', this.newUser.repetirContrasenia);
    
    if (this.newUser.contrasenia !== this.newUser.repetirContrasenia) {
      console.log('âŒ COMPONENTE: ValidaciÃ³n fallÃ³ - contraseÃ±as no coinciden');
      this.fieldsWithError = ['contrasenia', 'repetirContrasenia'];
      this.errorMessage = 'âŒ Las contraseÃ±as no coinciden. Verifique que ambas contraseÃ±as sean idÃ©nticas.';
      return;
    }

    // Validar email
    console.log('âœ… COMPONENTE: ValidaciÃ³n email:', this.newUser.email);
    
    if (!this.isValidEmail(this.newUser.email)) {
      console.log('âŒ COMPONENTE: ValidaciÃ³n fallÃ³ - email invÃ¡lido');
      this.fieldsWithError = ['email'];
      this.errorMessage = 'âŒ Por favor, ingrese un correo electrÃ³nico vÃ¡lido (ejemplo: usuario@dominio.com).';
      return;
    }

    console.log('ðŸŽ‰ COMPONENTE: Todas las validaciones pasaron!');
    
    // Solo activar loading despuÃ©s de validar
    this.isCreating = true;
    console.log('ðŸ”„ COMPONENTE: isCreating = true');
    
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

    console.log('ðŸš€ COMPONENTE: Preparando datos para envÃ­o...');
    console.log('ðŸ“¤ COMPONENTE: userData creado:', userData);
    console.log('ðŸ“ž COMPONENTE: *** AHORA LLAMANDO A adminService.crearUsuario() ***');

    // Variable para el timeout de respaldo
    let backupTimeout: any = null;
    
    // Implementar timeout de respaldo mÃ¡s largo ahora que sabemos que el server responde
    backupTimeout = setTimeout(() => {
      if (this.isCreating) {
        console.log('âš ï¸ TIMEOUT DE RESPALDO: El servidor tardÃ³ mÃ¡s de 8 segundos');
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
        console.log('âœ… Ã‰XITO: Respuesta completa del servidor:', response);
        clearTimeout(backupTimeout); // Cancelar timeout de respaldo
        
        // Extraer el nombre de la respuesta del servidor o usar el del formulario
        const nombreCreado = response?.nombre || this.newUser.nombre;
        
        // CAMBIOS CRÃTICOS DE ESTADO
        console.log('ðŸ”„ CAMBIANDO ESTADOS:');
        console.log('  isCreating:', this.isCreating, '-> false');
        console.log('  isSuccess:', this.isSuccess, '-> true');
        
        this.isCreating = false;
        this.isSuccess = true;
        
        // Mensaje de Ã©xito especÃ­fico por rol
        const tipoUsuario = this.newUser.rol === 'Gestor' ? 'Gestor de Contenido' : 'Administrador';
        this.successMessage = `Â¡${tipoUsuario} "${nombreCreado}" creado exitosamente!`;
        
        console.log('âœ… ESTADOS ACTUALIZADOS:');
        console.log('  isCreating:', this.isCreating);
        console.log('  isSuccess:', this.isSuccess);
        console.log('  successMessage:', this.successMessage);
        
        // FORZAR DETECCIÃ“N DE CAMBIOS
        this.cdr.detectChanges();
        console.log('ðŸŽ‰ DetecciÃ³n de cambios ejecutada - deberÃ­a mostrar pantalla de Ã©xito');
      },
      error: (error: any) => {
        console.error('âŒ Error completo al crear usuario:', error);
        console.log('ðŸ“Š Status del error:', error.status);
        console.log('ðŸ“ Mensaje del error:', error.error);
        console.log('ðŸŒ URL completa:', error.url);
        
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
    this.showForm = false;
    this.resetForm();
    this.loadUsuarios(); // Recargar la lista de usuarios
    
    // Mostrar mensaje de Ã©xito en la vista principal
    const nombreCreado = this.newUser.nombre || 'nuevo administrador';
    this.successMessage = `âœ… El administrador "${nombreCreado}" ha sido registrado correctamente en el sistema.`;
    
    // Limpiar el mensaje despuÃ©s de 5 segundos
    setTimeout(() => {
      this.successMessage = '';
    }, 5000);
  }



  getUsuariosBloqueados(): number {
    return this.usuarios.filter(u => u.bloqueado).length;
  }

  // MÃ©todos de filtrado
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
    
    const userId = this.usuarioAEliminar.id; 
    const nombreUsuario = this.usuarioAEliminar.nombre;
    const apellidosUsuario = this.usuarioAEliminar.apellidos;
    
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

  openPerfilModal(usuario: Usuario) {
    this.usuarioADetalle = usuario;
    this.showPerfilModal = true;
    this.cdr.detectChanges();
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
      // Si es solo el nombre de archivo, servir desde raÃ­z pÃºblica
      return `/${foto}`;
    }
    // Si viene como objeto con campo url o path
    if (foto.url && typeof foto.url === 'string') return foto.url;
    if (foto.path && typeof foto.path === 'string') return foto.path.startsWith('/') ? foto.path : `/${foto.path}`;
    return '';
  }

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

  /**
   * Confirma y ejecuta la acciÃ³n de bloquear/desbloquear
   */
  confirmarBloqueo() {
    if (!this.usuarioABloquear) return;

    // Primera pulsaciÃ³n: mostrar aviso y pedir confirmaciÃ³n con un segundo clic
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

    const accion$ = this.accionBloqueo === 'bloquear'
      ? this.adminService.bloquearUsuario(this.usuarioABloquear.id!, adminId)
      : this.adminService.desbloquearUsuario(this.usuarioABloquear.id!, adminId);

    // Fallback por si algo deja el loading en true mÃ¡s de 7s
    const backup = setTimeout(() => {
      if (this.loadingBloqueo) {
        this.loadingBloqueo = false;
        this.errorBloqueo = 'La operaciÃ³n tardÃ³ mÃ¡s de lo esperado. Refresca la lista para ver el estado.';
        this.cdr.detectChanges();
      }
    }, 7000);

    accion$.subscribe({
      next: (response) => {
        console.log('âœ… Usuario', this.accionBloqueo === 'bloquear' ? 'bloqueado' : 'desbloqueado');
        
        // Actualizar el estado local INMEDIATAMENTE (usuarios y filtrados)
        const nuevoEstado = this.accionBloqueo === 'bloquear';
        const idObjetivo = this.usuarioABloquear?.id;
        if (idObjetivo) {
          // Actualizar referencia directa (objeto seleccionado)
          this.usuarioABloquear!.bloqueado = nuevoEstado;

          // Actualizar lista principal
          this.usuarios = this.usuarios.map(u => u.id === idObjetivo ? { ...u, bloqueado: nuevoEstado } : u);

          // Reaplicar filtros para refrescar la tabla visible
          this.aplicarFiltros();
        }

        // Sincronizar con servidor tras un pequeÃ±o delay para evitar sobrescribir con datos obsoletos
        setTimeout(() => this.loadUsuarios(), 600);
        
        // Cerrar modal
        this.cerrarModalBloqueo();
        this.loadingBloqueo = false;
        clearTimeout(backup);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('âŒ Error:', error);
        this.errorBloqueo = error.message || `Error al ${this.accionBloqueo} usuario`;
        this.loadingBloqueo = false;
        clearTimeout(backup);
        this.cdr.detectChanges();
      }
    });
  }

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
  private obtenerAdminId(): string | null {
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

    // Ãšltimo recurso: primer administrador de la lista
    const primerAdmin = this.usuarios.find(u => u.rol === 'Administrador');
    return primerAdmin?.id || null;
  }
}


