import { Component, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AdminService, Usuario, PerfilDetalle } from '../services/admin.service';

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
  
  // Información del usuario actual
  currentUser: any = null;
  
  // Modal de perfil
  showProfileModal = false;
  editingProfile = {
    nombre: '',
    apellidos: '',
    email: '',
    foto: ''
  };
  
  // Modal de confirmación para eliminar usuario
  showDeleteModal = false;
  usuarioAEliminar: Usuario | null = null;
  
  // Modal de visualización de perfil
  showPerfilModal = false;
  perfilDetalle: PerfilDetalle | null = null;
  loadingPerfil = false;
  errorPerfil = '';
  
  // Filtros
  filtroRol = 'Todos'; // 'Todos', 'Administrador', 'Gestor', 'Visualizador'
  busquedaNombre = ''; // Texto de búsqueda

  newUser = {
    nombre: '',
    apellidos: '',
    email: '',
    contrasenia: '',
    repetirContrasenia: '',
    foto: '',
    departamento: '',
    rol: 'Administrador' as 'Administrador' | 'Gestor',
    // Campos específicos para Gestor
    alias: '',
    descripcion: '',
    especialidad: '',
    tipoContenido: ''
  };
  errorMessage = '';
  successMessage = '';
  isCreating = false;
  isSuccess = false; // Nueva propiedad para mostrar estado de éxito
  
  // Propiedades para manejar errores de validación
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
    // Cargar información del usuario actual desde localStorage (solo en el navegador)
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
        this.aplicarFiltros(); // Aplicar filtros después de cargar usuarios
      },
      error: (error: any) => {
        console.error('Error al cargar usuarios:', error);
        this.errorMessage = 'Error al cargar la lista de usuarios';
        
        // Intentar recargar después de un tiempo si hay un error temporal
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
    }
    this.resetMessages();
  }

  resetMessages() {
    this.errorMessage = '';
    this.successMessage = '';
    this.isCreating = false; // Asegurar que se restablezca el estado de loading
    this.isSuccess = false; // Resetear estado de éxito
    this.fieldsWithError = []; // Limpiar errores de campos
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
    console.log('🎯 COMPONENTE: *** createUser() EJECUTADO ***');
    console.log('📋 COMPONENTE: Datos del formulario:', this.newUser);
    console.log('📋 COMPONENTE: isCreating antes:', this.isCreating);
    
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
    
    console.log('✅ COMPONENTE: Validación campos vacíos - Tipo de usuario:', this.newUser.rol);
    console.log('✅ COMPONENTE: Validación campos vacíos - Campos requeridos:', requiredFields);
    console.log('✅ COMPONENTE: Validación campos vacíos - Campos vacíos encontrados:', emptyFields);
    
    if (emptyFields.length > 0) {
      console.log('❌ COMPONENTE: Validación falló - campos vacíos:', emptyFields);
      this.fieldsWithError = [...emptyFields];
      this.errorMessage = `❌ Complete todos los campos obligatorios: ${emptyFields.join(', ')}`;
      return;
    }

    // Validar contraseñas coincidentes
    console.log('✅ COMPONENTE: Validación contraseñas - contrasenia:', this.newUser.contrasenia);
    console.log('✅ COMPONENTE: Validación contraseñas - repetirContrasenia:', this.newUser.repetirContrasenia);
    
    if (this.newUser.contrasenia !== this.newUser.repetirContrasenia) {
      console.log('❌ COMPONENTE: Validación falló - contraseñas no coinciden');
      this.fieldsWithError = ['contrasenia', 'repetirContrasenia'];
      this.errorMessage = '❌ Las contraseñas no coinciden. Verifique que ambas contraseñas sean idénticas.';
      return;
    }

    // Validar email
    console.log('✅ COMPONENTE: Validación email:', this.newUser.email);
    
    if (!this.isValidEmail(this.newUser.email)) {
      console.log('❌ COMPONENTE: Validación falló - email inválido');
      this.fieldsWithError = ['email'];
      this.errorMessage = '❌ Por favor, ingrese un correo electrónico válido (ejemplo: usuario@dominio.com).';
      return;
    }

    console.log('🎉 COMPONENTE: Todas las validaciones pasaron!');
    
    // Solo activar loading después de validar
    this.isCreating = true;
    console.log('🔄 COMPONENTE: isCreating = true');
    
    // Forzar detección de cambios después de actualizar isCreating
    this.cdr.detectChanges();

    // Construir userData según el tipo de usuario
    let userData: any = {
      nombre: this.newUser.nombre,
      apellidos: this.newUser.apellidos,
      email: this.newUser.email,
      contrasenia: this.newUser.contrasenia,
      foto: this.newUser.foto || undefined,
      rol: this.newUser.rol
    };

    // Agregar campos específicos según el rol
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

    console.log('🚀 COMPONENTE: Preparando datos para envío...');
    console.log('📤 COMPONENTE: userData creado:', userData);
    console.log('📞 COMPONENTE: *** AHORA LLAMANDO A adminService.crearUsuario() ***');

    // Variable para el timeout de respaldo
    let backupTimeout: any = null;
    
    // Implementar timeout de respaldo más largo ahora que sabemos que el server responde
    backupTimeout = setTimeout(() => {
      if (this.isCreating) {
        console.log('⚠️ TIMEOUT DE RESPALDO: El servidor tardó más de 8 segundos');
        this.isCreating = false;
        this.cdr.detectChanges(); // Forzar actualización en timeout
        this.errorMessage = 'La operación tardó más tiempo del esperado, pero es posible que el administrador se haya creado.';
        
        // Recargar usuarios para verificar
        setTimeout(() => {
          this.loadUsuarios();
        }, 1000);
        
        // Limpiar error después de 6 segundos
        setTimeout(() => {
          this.errorMessage = '';
        }, 6000);
      }
    }, 8000);

    this.adminService.crearUsuario(userData).subscribe({
      next: (response: any) => {
        console.log('✅ ÉXITO: Respuesta completa del servidor:', response);
        clearTimeout(backupTimeout); // Cancelar timeout de respaldo
        
        // Extraer el nombre de la respuesta del servidor o usar el del formulario
        const nombreCreado = response?.nombre || this.newUser.nombre;
        
        // CAMBIOS CRÍTICOS DE ESTADO
        console.log('🔄 CAMBIANDO ESTADOS:');
        console.log('  isCreating:', this.isCreating, '-> false');
        console.log('  isSuccess:', this.isSuccess, '-> true');
        
        this.isCreating = false;
        this.isSuccess = true;
        
        // Mensaje de éxito específico por rol
        const tipoUsuario = this.newUser.rol === 'Gestor' ? 'Gestor de Contenido' : 'Administrador';
        this.successMessage = `¡${tipoUsuario} "${nombreCreado}" creado exitosamente!`;
        
        console.log('✅ ESTADOS ACTUALIZADOS:');
        console.log('  isCreating:', this.isCreating);
        console.log('  isSuccess:', this.isSuccess);
        console.log('  successMessage:', this.successMessage);
        
        // FORZAR DETECCIÓN DE CAMBIOS
        this.cdr.detectChanges();
        console.log('🎉 Detección de cambios ejecutada - debería mostrar pantalla de éxito');
      },
      error: (error: any) => {
        console.error('❌ Error completo al crear usuario:', error);
        console.log('📊 Status del error:', error.status);
        console.log('📝 Mensaje del error:', error.error);
        console.log('🌐 URL completa:', error.url);
        
        clearTimeout(backupTimeout); // Cancelar timeout de respaldo
        this.isCreating = false;
        this.cdr.detectChanges(); // Forzar actualización en errores también
        
        let mensajeError = 'Error desconocido';
        
        // Detectar específicamente errores de CORS o conexión
        if (error.status === 0 && error.error?.message?.includes('Failed to fetch')) {
          mensajeError = 'Error de conexión CORS. El backend no está ejecutándose o hay un problema de configuración. Por favor, inicia el servidor backend.';
        } else if (error.status === 'timeout') {
          mensajeError = 'La conexión tardó demasiado tiempo. Es posible que el administrador se haya creado correctamente.';
          // En caso de timeout, asumir que pudo haberse creado y recargar usuarios
          setTimeout(() => {
            this.loadUsuarios();
          }, 1000);
        } else if (error.status === 0) {
          mensajeError = 'No se pudo conectar con el servidor. Verifica que el backend esté ejecutándose en el puerto 8080.';
        } else if (error.error?.mensaje) {
          // Mensaje del backend
          mensajeError = error.error.mensaje;
          
          // Mejorar mensajes específicos de MongoDB
          if (mensajeError.includes('E11000 duplicate key error')) {
            if (mensajeError.includes('email')) {
              mensajeError = 'El email ya está registrado. Por favor, usa un email diferente.';
            } else {
              mensajeError = 'Ya existe un registro con estos datos. Verifica la información.';
            }
          } else if (mensajeError.includes('Write operation error')) {
            mensajeError = 'Error de base de datos. Por favor, contacta al administrador del sistema.';
          }
        } else if (error.error?.message) {
          mensajeError = error.error.message;
        } else if (error.status === 500) {
          mensajeError = 'Error interno del servidor. Por favor, inténtalo de nuevo más tarde.';
        } else if (error.status === 400) {
          mensajeError = 'Datos inválidos. Verifica la información ingresada.';
        } else if (error.status) {
          mensajeError = `Error del servidor: ${error.status} - ${error.statusText || 'Error HTTP'}`;
        }
        
        this.errorMessage = mensajeError;
        
        // Limpiar el mensaje después de 10 segundos
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
      // Campos específicos para Gestor
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

  // Método para verificar si un campo tiene error
  hasFieldError(fieldName: string): boolean {
    return this.fieldsWithError.includes(fieldName);
  }

  // Método para seleccionar/deseleccionar foto de perfil
  selectFoto(fotoId: string) {
    // Si la foto ya está seleccionada y es para Administrador (opcional), deseleccionar
    if (this.newUser.foto === fotoId && this.newUser.rol === 'Administrador') {
      this.newUser.foto = '';
    } else {
      // Seleccionar la nueva foto
      this.newUser.foto = fotoId;
    }
    
    // Limpiar error de foto si existía
    if (this.fieldsWithError.includes('foto')) {
      this.fieldsWithError = this.fieldsWithError.filter(field => field !== 'foto');
    }
  }

  // Método para salir del formulario después del éxito
  exitForm() {
    this.showForm = false;
    this.resetForm();
    this.loadUsuarios(); // Recargar la lista de usuarios
    
    // Mostrar mensaje de éxito en la vista principal
    const nombreCreado = this.newUser.nombre || 'nuevo administrador';
    this.successMessage = `✅ El administrador "${nombreCreado}" ha sido registrado correctamente en el sistema.`;
    
    // Limpiar el mensaje después de 5 segundos
    setTimeout(() => {
      this.successMessage = '';
    }, 5000);
  }



  getUsuariosBloqueados(): number {
    return this.usuarios.filter(u => u.bloqueado).length;
  }

  // Métodos de filtrado
  aplicarFiltros() {
    let usuariosFiltrados = [...this.usuarios];

    // Filtrar por rol si no es "Todos"
    if (this.filtroRol !== 'Todos') {
      usuariosFiltrados = usuariosFiltrados.filter(usuario => usuario.rol === this.filtroRol);
    }

    // Filtrar por nombre (búsqueda en tiempo real)
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
  // MÉTODOS DE PERFIL Y LOGOUT
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
        
        // Actualizar también en localStorage
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
      this.successMessage = 'Sesión cerrada';
      setTimeout(() => {
        this.router.navigate(['/home']);
      }, 1000);
    }
  }

  // Métodos para la eliminación de usuarios
  openDeleteModal(usuario: Usuario) {
    this.usuarioAEliminar = usuario;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.usuarioAEliminar = null;
    this.isDeleting = false; // Asegurar que el flag de eliminación se resetea
    
    // Forzar la detección de cambios para asegurar que Angular actualiza la vista
    this.cdr.detectChanges();
    
    // Doble comprobación para asegurar que el modal se cierra
    setTimeout(() => {
      if (this.showDeleteModal) {
        console.log("Forzando cierre del modal");
        this.showDeleteModal = false;
        this.cdr.detectChanges();
      }
    }, 100);
  }

  // Variable para evitar múltiples clics
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
    
    // Activar flag para prevenir múltiples clics
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
        
        // Actualizar la lista después de la eliminación exitosa
        this.usuarios = this.usuarios.filter(u => u.id !== tempId);
        this.aplicarFiltros();
        
        // Limpiar la referencia al usuario eliminado
        this.usuarioAEliminar = null;
        
        // Mostrar mensaje de éxito
        this.successMessage = `Usuario ${tempNombre} ${tempApellidos} eliminado correctamente`;
        
        // Limpiar mensaje después de unos segundos
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        console.error('Error al eliminar usuario:', error);
        
        // Asegurar que el modal esté cerrado y la referencia limpia
        this.usuarioAEliminar = null;
        
        // Mostrar mensaje de error
        this.errorMessage = `Error al eliminar el usuario ${tempNombre}. Inténtelo de nuevo.`;
        
        // Recargar la lista de usuarios para asegurarnos de que está actualizada
        this.loadUsuarios();
        
        // Limpiar mensaje después de unos segundos
        setTimeout(() => {
          this.errorMessage = '';
        }, 5000);
      },
      complete: () => {
        // Restablecer flag de eliminación siempre
        this.isDeleting = false;
        
        // Forzar detección de cambios
        this.cdr.detectChanges();
      }
    });
  }

  // ============================================
  // MÉTODOS PARA EL MODAL DE VISUALIZACIÓN DE PERFIL
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

    // Temporizador de respaldo por si la petición queda colgada
    const backupTimeout = setTimeout(() => {
      if (this.loadingPerfil) {
        console.warn('[Perfil] Timeout de respaldo: backend no responde');
        this.loadingPerfil = false;
        this.errorPerfil = 'No se pudo obtener el perfil. Verifica que el backend esté en ejecución (puerto 8080).';
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
          mensaje = 'No hay conexión con el servidor. ¿Está el backend levantado en http://localhost:8080?';
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
      // Si es solo el nombre de archivo, servir desde raíz pública
      return `/${foto}`;
    }
    // Si viene como objeto con campo url o path
    if (foto.url && typeof foto.url === 'string') return foto.url;
    if (foto.path && typeof foto.path === 'string') return foto.path.startsWith('/') ? foto.path : `/${foto.path}`;
    return '';
  }
}
