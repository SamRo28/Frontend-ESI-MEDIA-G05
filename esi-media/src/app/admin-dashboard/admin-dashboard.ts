import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, Usuario } from '../services/admin.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class AdminDashboardComponent implements OnInit {
  activeTab = 'inicio';
  showForm = false;
  usuarios: Usuario[] = [];
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

  constructor(
    private adminService: AdminService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadUsuarios();
  }

  loadUsuarios() {
    this.adminService.getUsuarios().subscribe({
      next: (usuarios) => {
        this.usuarios = usuarios;
      },
      error: (error: any) => {
        console.error('Error al cargar usuarios:', error);
        this.errorMessage = 'Error al cargar la lista de usuarios';
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
    if (!this.showForm) {
      this.resetForm();
      this.resetMessages();
    } else {
      // Limpiar mensajes cuando se abre el formulario
      this.resetMessages();
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.newUser.foto = file.name;
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
      requiredFields = ['nombre', 'apellidos', 'email', 'contrasenia', 'alias', 'especialidad', 'tipoContenido'];
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


}