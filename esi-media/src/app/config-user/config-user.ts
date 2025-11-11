import { Component, EventEmitter, Input, Output, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

// Interfaces para los DTOs de configuración de usuario
export interface ConfigUserBase {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  foto?: any;
}

export interface VisualizadorConfig extends ConfigUserBase {
  tipo: 'Visualizador';
  alias?: string;
  fechaNacimiento?: Date;
  // Campos no modificables: vip, bloqueado, 2fa, 3fa
}

export interface GestorConfig extends ConfigUserBase {
  tipo: 'Gestor';
  alias?: string;
  descripcion?: string;
  campoespecializacion?: string;
  // Campo no modificable: tipocontenidovideooaudio, bloqueado, 2fa, 3fa
}

export interface AdministradorConfig extends ConfigUserBase {
  tipo: 'Administrador';
  departamento?: string;
  // Campos no modificables: bloqueado, 2fa, 3fa
}

export type ConfigUserDTO = VisualizadorConfig | GestorConfig | AdministradorConfig;

@Component({
  selector: 'app-config-user',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './config-user.html',
  styleUrls: ['./config-user.css']
})
export class ConfigUserComponent implements OnInit {
  @Input() modal: boolean = false;
  @Output() cerrar = new EventEmitter<void>();
  @Output() actualizado = new EventEmitter<ConfigUserDTO>();

  userForm: FormGroup;
  guardando: boolean = false;
  cargando: boolean = true;
  
  // Datos del usuario actual
  currentUser: ConfigUserDTO | null = null;
  userType: 'Visualizador' | 'Gestor' | 'Administrador' | null = null;
  
  // Mensajes
  mensajeExito: string = '';
  mensajeError: string = '';

  // Especialidades disponibles para gestores (mismas que en crear-lista)
  especializacionesDisponibles = [
    'Música',
    'Películas y Cinema',
    'Documentales',
    'Podcasts',
    'Series de TV',
    'Entretenimiento General',
    'Contenido Educativo',
    'Deportes'
  ];

  // Departamentos disponibles para administradores
  departamentosDisponibles = [
    'Tecnología',
    'Contenido',
    'Administración',
    'Soporte',
    'Marketing',
    'Recursos Humanos',
    'Finanzas'
  ];

  private readonly apiUrl = 'http://localhost:8080';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.userForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      apellidos: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email: [{value: '', disabled: true}], // Email no modificable
      alias: [''],
      descripcion: [''],
      campoespecializacion: [''],
      departamento: [''],
      fechaNacimiento: ['']
    });
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('ConfigUserComponent - SSR detectado, saltando inicialización');
      return;
    }

    this.cargarDatosUsuario();
  }

  /**
   * Carga los datos del usuario actual desde sessionStorage y el backend
   */
  private cargarDatosUsuario(): void {
    const userStr = sessionStorage.getItem('user');
    const userClass = sessionStorage.getItem('currentUserClass');

    if (!userStr || !userClass) {
      this.mensajeError = 'No se encontraron datos del usuario';
      this.cargando = false;
      return;
    }

    try {
      const sessionUser = JSON.parse(userStr);
      
      // Determinar tipo de usuario
      switch (userClass) {
        case 'Visualizador':
          this.userType = 'Visualizador';
          break;
        case 'GestordeContenido':
          this.userType = 'Gestor';
          break;
        case 'Administrador':
          this.userType = 'Administrador';
          break;
        default:
          this.userType = 'Visualizador';
      }

      // Obtener datos completos del backend
      this.obtenerDatosCompletos(sessionUser.id);

    } catch (error) {
      console.error('Error cargando datos del usuario:', error);
      this.mensajeError = 'Error cargando datos del usuario';
      this.cargando = false;
    }
  }

  /**
   * Obtiene los datos completos del usuario desde el backend
   */
  private obtenerDatosCompletos(userId: string): void {
    const headers = this.getAuthHeaders();
    
    this.http.get<any>(`${this.apiUrl}/users/${userId}`, { headers }).subscribe({
      next: (response) => {
        console.log('Datos del usuario obtenidos:', response);
        this.procesarDatosUsuario(response);
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error obteniendo datos del usuario:', error);
        this.mensajeError = 'No se pudieron cargar los datos del usuario';
        this.cargando = false;
      }
    });
  }

  /**
   * Procesa los datos del usuario y configura el formulario
   */
  private procesarDatosUsuario(userData: any): void {
    // Crear objeto ConfigUserDTO según el tipo
    switch (this.userType) {
      case 'Visualizador':
        this.currentUser = {
          tipo: 'Visualizador',
          id: userData.id,
          nombre: userData.nombre || '',
          apellidos: userData.apellidos || '',
          email: userData.email || '',
          foto: userData.foto,
          alias: userData.alias,
          fechaNacimiento: userData.fechaNac ? new Date(userData.fechaNac) : undefined
        } as VisualizadorConfig;
        break;
        
      case 'Gestor':
        this.currentUser = {
          tipo: 'Gestor',
          id: userData.id,
          nombre: userData.nombre || '',
          apellidos: userData.apellidos || '',
          email: userData.email || '',
          foto: userData.foto,
          alias: userData.alias,
          descripcion: userData.descripcion,
          campoespecializacion: userData.campoespecializacion
        } as GestorConfig;
        break;
        
      case 'Administrador':
        this.currentUser = {
          tipo: 'Administrador',
          id: userData.id,
          nombre: userData.nombre || '',
          apellidos: userData.apellidos || '',
          email: userData.email || '',
          foto: userData.foto,
          departamento: userData.departamento
        } as AdministradorConfig;
        break;
    }

    this.configurarFormulario();
  }

  /**
   * Configura el formulario según el tipo de usuario
   */
  private configurarFormulario(): void {
    if (!this.currentUser) return;

    // Configurar valores básicos
    this.userForm.patchValue({
      nombre: this.currentUser.nombre,
      apellidos: this.currentUser.apellidos,
      email: this.currentUser.email
    });

    // Configurar campos específicos según el tipo
    switch (this.currentUser.tipo) {
      case 'Visualizador':
        const vizUser = this.currentUser as VisualizadorConfig;
        this.userForm.patchValue({
          alias: vizUser.alias || ''
        });
        
        if (vizUser.fechaNacimiento) {
          const fecha = new Date(vizUser.fechaNacimiento);
          const fechaStr = fecha.toISOString().split('T')[0];
          this.userForm.patchValue({ fechaNacimiento: fechaStr });
        }
        
        // Habilitar campos específicos de visualizador
        this.userForm.get('alias')?.enable();
        this.userForm.get('fechaNacimiento')?.enable();
        this.userForm.get('descripcion')?.disable();
        this.userForm.get('campoespecializacion')?.disable();
        this.userForm.get('departamento')?.disable();
        break;
        
      case 'Gestor':
        const gestUser = this.currentUser as GestorConfig;
        this.userForm.patchValue({
          alias: gestUser.alias || '',
          descripcion: gestUser.descripcion || '',
          campoespecializacion: gestUser.campoespecializacion || ''
        });
        
        // Habilitar campos específicos de gestor
        this.userForm.get('alias')?.enable();
        this.userForm.get('descripcion')?.enable();
        this.userForm.get('campoespecializacion')?.enable();
        this.userForm.get('fechaNacimiento')?.disable();
        this.userForm.get('departamento')?.disable();
        
        // Añadir validaciones para gestor
        this.userForm.get('alias')?.setValidators([Validators.required, Validators.minLength(3), Validators.maxLength(30)]);
        this.userForm.get('descripcion')?.setValidators([Validators.maxLength(500)]);
        break;
        
      case 'Administrador':
        const adminUser = this.currentUser as AdministradorConfig;
        this.userForm.patchValue({
          departamento: adminUser.departamento || ''
        });
        
        // Habilitar campos específicos de administrador
        this.userForm.get('departamento')?.enable();
        this.userForm.get('alias')?.disable();
        this.userForm.get('descripcion')?.disable();
        this.userForm.get('campoespecializacion')?.disable();
        this.userForm.get('fechaNacimiento')?.disable();
        
        // Añadir validaciones para administrador
        this.userForm.get('departamento')?.setValidators([Validators.required, Validators.minLength(2), Validators.maxLength(100)]);
        break;
    }
    
    this.userForm.updateValueAndValidity();
  }

  /**
   * Guarda los cambios del usuario
   */
  onSubmit(): void {
    if (this.userForm.invalid || !this.currentUser) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.guardando = true;
    this.mensajeError = '';
    this.mensajeExito = '';

    const formValue = this.userForm.getRawValue();
    const updatedData: any = {
      nombre: formValue.nombre.trim(),
      apellidos: formValue.apellidos.trim()
    };

    // Añadir campos específicos según el tipo
    switch (this.currentUser.tipo) {
      case 'Visualizador':
        if (formValue.alias) {
          updatedData.alias = formValue.alias.trim();
        }
        if (formValue.fechaNacimiento) {
          // Convertir fecha a formato Date para el backend
          updatedData.fechaNac = new Date(formValue.fechaNacimiento).toISOString();
        }
        break;
        
      case 'Gestor':
        if (formValue.alias) {
          updatedData.alias = formValue.alias.trim();
        }
        if (formValue.descripcion) {
          updatedData.descripcion = formValue.descripcion.trim();
        }
        if (formValue.campoespecializacion) {
          updatedData.campoespecializacion = formValue.campoespecializacion;
        }
        break;
        
      case 'Administrador':
        if (formValue.departamento) {
          updatedData.departamento = formValue.departamento.trim();
        }
        break;
    }

    this.actualizarUsuario(updatedData);
  }

  /**
   * Actualiza los datos del usuario en el backend
   */
  private actualizarUsuario(updatedData: any): void {
    if (!this.currentUser) return;

    const headers = this.getAuthHeaders();
    
    // Formato esperado por el endpoint /users/{id}/profile
    const requestBody = {
      tipo: this.currentUser.tipo,
      userData: updatedData
    };

    this.http.put(`${this.apiUrl}/users/${this.currentUser.id}/profile`, requestBody, { headers }).subscribe({
      next: (response: any) => {
        console.log('Usuario actualizado correctamente:', response);
        this.guardando = false;
        this.mensajeExito = '✅ Perfil actualizado correctamente';
        
        // Actualizar sessionStorage con los nuevos datos
        this.actualizarSessionStorage(updatedData);
        
        // Emitir evento de actualización
        if (this.currentUser) {
          // Crear objeto actualizado
          const updatedUser: ConfigUserDTO = {
            ...this.currentUser,
            ...updatedData
          };
          this.actualizado.emit(updatedUser);
        }

        // Cerrar modal después de 2 segundos si está en modo modal
        if (this.modal) {
          setTimeout(() => {
            this.cerrar.emit();
          }, 2000);
        }
      },
      error: (error) => {
        console.error('Error actualizando usuario:', error);
        this.guardando = false;
        
        if (error.error?.mensaje) {
          this.mensajeError = error.error.mensaje;
        } else if (error.status === 400) {
          this.mensajeError = 'Datos no válidos. Verifica la información introducida.';
        } else if (error.status === 401) {
          this.mensajeError = 'No tienes permisos para realizar esta acción.';
        } else {
          this.mensajeError = 'Error al actualizar el perfil. Inténtalo de nuevo.';
        }
      }
    });
  }



  /**
   * Actualiza los datos en sessionStorage
   */
  private actualizarSessionStorage(updatedData: any): void {
    const userStr = sessionStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        Object.assign(user, updatedData);
        sessionStorage.setItem('user', JSON.stringify(user));
      } catch (error) {
        console.error('Error actualizando sessionStorage:', error);
      }
    }
  }

  /**
   * Obtiene los headers de autenticación
   */
  private getAuthHeaders(): any {
    const token = sessionStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Cancela la edición y cierra el modal
   */
  onCancelar(): void {
    this.cerrar.emit();
  }

  /**
   * Verifica si el usuario puede guardar los cambios
   */
  puedeGuardar(): boolean {
    return this.userForm.valid && !this.guardando && !this.cargando;
  }

  /**
   * Obtiene el título del componente según el tipo de usuario
   */
  get tituloComponente(): string {
    return `Configuración de perfil - ${this.userType || 'Usuario'}`;
  }

  /**
   * Verifica si un campo debe mostrarse según el tipo de usuario
   */
  mostrarCampo(campo: string): boolean {
    if (!this.userType) return false;
    
    switch (campo) {
      case 'alias':
        return this.userType === 'Visualizador' || this.userType === 'Gestor';
      case 'fechaNacimiento':
        return this.userType === 'Visualizador';
      case 'descripcion':
      case 'campoespecializacion':
        return this.userType === 'Gestor';
      case 'departamento':
        return this.userType === 'Administrador';
      default:
        return true;
    }
  }

  /**
   * Obtiene la etiqueta de un campo
   */
  getFieldLabel(campo: string): string {
    switch (campo) {
      case 'nombre':
        return 'Nombre';
      case 'apellidos':
        return 'Apellidos';
      case 'email':
        return 'Correo electrónico';
      case 'alias':
        return this.userType === 'Visualizador' ? 'Alias' : 'Alias profesional';
      case 'fechaNacimiento':
        return 'Fecha de nacimiento';
      case 'descripcion':
        return 'Descripción profesional';
      case 'campoespecializacion':
        return 'Campo de especialización';
      case 'departamento':
        return 'Departamento';
      default:
        return campo;
    }
  }

  /**
   * Verifica si un campo es requerido
   */
  isCampoRequerido(campo: string): boolean {
    switch (campo) {
      case 'nombre':
      case 'apellidos':
        return true;
      case 'alias':
        return this.userType === 'Gestor';
      case 'departamento':
        return this.userType === 'Administrador';
      default:
        return false;
    }
  }
}