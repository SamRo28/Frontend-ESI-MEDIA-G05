import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { PasswordValidatorComponent } from '../password-validator/password-validator.component';
import { UserValidationService } from '../../../services/user-validation.service';
import { AdminService } from '../../../services/admin.service';
import { ModalService, ModalConfig } from '../../../services/modal.service';

export interface Usuario {
  id?: number;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento: string;
  telefono: string;
  genero: string;
  fechaCreacion?: string;
  ultimoAcceso?: string;
  estado: boolean;
  rol: 'ADMINISTRADOR' | 'VISUALIZADOR' | 'GESTOR_CONTENIDOS';
}

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, FormsModule, PasswordValidatorComponent],
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.css']
})
export class UserFormComponent implements OnInit, OnChanges {
  private _user: Usuario = this.createEmptyUser();
  
  @Input() 
  set user(value: Usuario) {
    this._user = {
      ...value,
      password: value.password || '',
      confirmPassword: value.confirmPassword || ''
    };
  }
  
  get user(): Usuario {
    return this._user;
  }
  
  @Input() isEditMode: boolean = false;
  @Input() showPassword: boolean = true;
  @Input() disabled: boolean = false;
  @Input() profileData: any = null; // Datos adicionales del perfil completo
  @Output() userChange = new EventEmitter<Usuario>();
  @Output() validationChange = new EventEmitter<boolean>();
  @Output() formSubmit = new EventEmitter<Usuario>();
  @Output() formCancel = new EventEmitter<void>();
  @Output() confirmationRequest = new EventEmitter<Usuario>();
  @Output() userDeleted = new EventEmitter<string>();
  @Output() userStatusToggled = new EventEmitter<{ userId: string, blocked: boolean }>();

  formErrors: { [key: string]: string } = {};
  
  // Estado del modal de confirmación
  showConfirmation = false;
  
  // Estados para actualización
  isUpdating = false;
  updateSuccess = false;
  updateError: string | null = null;

  // Propiedades adicionales para el formulario completo
  newUser: any = {
    rol: '',
    nombre: '',
    apellidos: '',
    email: '',
    apodo: '',
    departamento: '',
    alias: '',
    descripcion: '',
    especialidad: '',
    tipoContenido: '',
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

  // Estados de visibilidad
  showPasswordField = false;
  showRepeatPassword = false;
  formTouched = false;
  fieldsWithError: string[] = [];

  // Fotos disponibles
  fotosDisponibles = [
    { id: 'perfil1.png', nombre: 'Perfil 1' },
    { id: 'perfil2.png', nombre: 'Perfil 2' },
    { id: 'perfil3.png', nombre: 'Perfil 3' },
    { id: 'perfil4.png', nombre: 'Perfil 4' }
  ];

  constructor(
    private userValidationService: UserValidationService,
    private adminService: AdminService,
    private modalService: ModalService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Asegurar que las propiedades de contraseña estén inicializadas
    if (!this.user.password) {
      this.user.password = '';
    }
    if (!this.user.confirmPassword) {
      this.user.confirmPassword = '';
    }

    // Si estamos en modo edición, inicializar newUser con los datos del usuario
    if (this.isEditMode && this.user) {
      this.initializeFormFromUser();
    } else {
      // Si estamos creando, inicializar newUser con valores por defecto
      this.initializeNewUser();
    }

  }

  ngOnChanges(changes: SimpleChanges) {
    // Si profileData cambia, reinicializar el formulario
    if (changes['profileData'] && this.profileData) {
      this.initializeFormFromUser();
    }
    
    // Si cambia el modo de edición o el usuario, reinicializar
    if (changes['isEditMode'] || changes['user']) {
      if (this.isEditMode && this.user) {
        this.initializeFormFromUser();
      } else if (!this.isEditMode) {
        this.initializeNewUser();
      }
    }
  }

  createEmptyUser(): Usuario {
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

  onInputChange(): void {
    this.validateForm();
    this.userChange.emit(this.user);
  }

  onPasswordChange(password: string): void {
    this.user.password = password;
    this.onInputChange();
  }

  onConfirmPasswordChange(confirmPassword: string): void {
    this.user.confirmPassword = confirmPassword;
    this.onInputChange();
  }

  validateForm(): boolean {
    this.formErrors = {};
    let isValid = true;

    // Validar username
    if (!this.user.username || this.user.username.trim().length === 0) {
      this.formErrors['username'] = 'El nombre de usuario es requerido';
      isValid = false;
    } else if (this.user.username.length < 3) {
      this.formErrors['username'] = 'El nombre de usuario debe tener al menos 3 caracteres';
      isValid = false;
    } 

    // Validar email
    if (!this.userValidationService.validateEmail(this.user.email)) {
      this.formErrors['email'] = 'Formato de email inválido';
      isValid = false;
    }

    // Validar contraseñas (solo si se muestra el campo de contraseña)
    if (this.showPassword) {
      const passwordValidation = this.userValidationService.validatePassword(
        this.user.password || '', 
        this.user.confirmPassword || '', 
        this.user.username
      );
      
      if (!this.userValidationService.isPasswordValid(passwordValidation)) {
        this.formErrors['password'] = 'La contraseña no cumple con los requisitos de seguridad';
        isValid = false;
      }

      if (!passwordValidation.passwordsMatch) {
        this.formErrors['confirmPassword'] = 'Las contraseñas no coinciden';
        isValid = false;
      }
    }

    // Validar nombres
    if (!this.user.nombres || this.user.nombres.trim().length === 0) {
      this.formErrors['nombres'] = 'Los nombres son requeridos';
      isValid = false;
    } 

    // Validar apellidos
    if (!this.user.apellidos || this.user.apellidos.trim().length === 0) {
      this.formErrors['apellidos'] = 'Los apellidos son requeridos';
      isValid = false;
    } 

    // Validar fecha de nacimiento
    if (!this.user.fechaNacimiento) {
      this.formErrors['fechaNacimiento'] = 'La fecha de nacimiento es requerida';
      isValid = false;
    } 
    this.validationChange.emit(isValid);
    return isValid;
  }

  onSubmit(): void {
    // Marcar que el formulario ha sido tocado
    this.formTouched = true;
    
    // Validar campos específicos según el rol
    const isValid = this.validateFormFields();
    
    if (isValid) {
      // Sincronizar los datos del formulario HTML (newUser) con el modelo (user)
      this.syncUserData();
      
      if (this.isEditMode && this.user.id) {
        // Si estamos editando, ejecutar actualización directamente
        this.executeUpdate();
      } else {
        // Si estamos creando, emitir evento para que lo maneje el componente padre
        this.formSubmit.emit(this.getFormData());
      }
    }
  }

  // Método específico para manejar confirmación de modificación
  onConfirmUpdate(): void {
    this.onSubmit();
  }

  showConfirmationModal(): void {
    // Validar antes de mostrar confirmación
    this.formTouched = true;
    const isValid = this.validateFormFields();
    
    if (isValid) {
      // Sincronizar datos antes de mostrar confirmación
      this.syncUserData();
      this.showConfirmation = true;
    }
  }

  confirmUpdate(): void {
    this.showConfirmation = false;
    if (this.isEditMode && this.user.id) {
      this.executeUpdate();
    } else {
      this.onSubmit();
    }
  }

  cancelUpdate(): void {
    this.showConfirmation = false;
  }

  private async executeUpdate(): Promise<void> {
    if (!this.user.id) {
      this.updateError = 'ID de usuario no disponible';
      return;
    }

    try {
      this.isUpdating = true;
      this.updateError = null;
      
      // Mapear los datos del formulario al formato correcto
      const updateData = this.mapFormToUpdateData();
      const tipo = this.determineUserTypeFromRole(this.user.rol);
      

      
      await firstValueFrom(this.adminService.updateUser(this.user.id.toString(), updateData, tipo));
      
      this.updateSuccess = true;
      this.updateError = null;
      
      // Emitir evento de éxito
      this.formSubmit.emit(this.getFormData());
      
    } catch (error) {
      console.error('Error updating user:', error);
      this.updateError = 'Error al actualizar el usuario. Por favor, inténtelo de nuevo.';
      this.updateSuccess = false;
    } finally {
      this.isUpdating = false;
    }
  }

  private mapFormToUpdateData(): any {
    // Simplificar los datos enviados para evitar problemas de naming conventions
    const updateData: any = {};

    // Solo campos básicos y seguros que existen en todos los tipos de usuario
    if (this.newUser.nombre) {
      updateData.nombre = this.newUser.nombre;
    }
    if (this.newUser.apellidos) {
      updateData.apellidos = this.newUser.apellidos;  
    }
    if (this.newUser.email) {
      updateData.email = this.newUser.email;
    }
    if (this.newUser.foto) {
      updateData.foto = this.newUser.foto;
    }

    // Solo agregar contraseña si se está cambiando
    if (this.newUser.contrasenia && this.newUser.contrasenia.trim() !== '') {
      updateData.contrasenia = this.newUser.contrasenia;
    }

    return updateData;
  }

  private determineUserTypeFromRole(role: string): string {
    switch (role) {
      case 'ADMINISTRADOR':
        return 'Administrador';
      case 'GESTOR_CONTENIDOS':
        return 'Gestor'; // Simplificar - cualquier valor que no sea "Administrador" o "Visualizador" irá al else
      case 'VISUALIZADOR':
      default:
        return 'Visualizador';
    }
  }

  private validateFormFields(): boolean {
    this.fieldsWithError = [];
    let isValid = true;

    // Validaciones básicas para todos los roles
    if (!this.newUser.nombre || !this.newUser.nombre.trim()) {
      this.fieldsWithError.push('nombre');
      isValid = false;
    }

    if (!this.newUser.apellidos || !this.newUser.apellidos.trim()) {
      this.fieldsWithError.push('apellidos');
      isValid = false;
    }

    if (!this.newUser.email || !this.newUser.email.trim() || !this.isValidEmail(this.newUser.email)) {
      this.fieldsWithError.push('email');
      isValid = false;
    }

    // Validaciones específicas por rol
    switch (this.newUser.rol) {
      case 'Administrador':
        if (!this.newUser.departamento || !this.newUser.departamento.trim()) {
          this.fieldsWithError.push('departamento');
          isValid = false;
        }
        break;

      case 'Gestor':
        if (!this.newUser.alias || !this.newUser.alias.trim()) {
          this.fieldsWithError.push('alias');
          isValid = false;
        }
        if (!this.newUser.especialidad) {
          this.fieldsWithError.push('especialidad');
          isValid = false;
        }
        if (!this.newUser.tipoContenido) {
          this.fieldsWithError.push('tipoContenido');
          isValid = false;
        }
        if (!this.newUser.foto) {
          this.fieldsWithError.push('foto');
          isValid = false;
        }
        break;
    }

    // Validar contraseñas solo si se están mostrando
    if (this.showPassword) {
      if (!this.newUser.contrasenia || !this.newUser.contrasenia.trim()) {
        this.fieldsWithError.push('contrasenia');
        isValid = false;
      }
      if (!this.newUser.repetirContrasenia || !this.newUser.repetirContrasenia.trim()) {
        this.fieldsWithError.push('repetirContrasenia');
        isValid = false;
      }
      if (this.newUser.contrasenia !== this.newUser.repetirContrasenia) {
        this.fieldsWithError.push('repetirContrasenia');
        isValid = false;
      }
    }

    return isValid;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  onCancel(): void {
    this.formCancel.emit();
  }

  getFieldClass(fieldName: string): string {
    if (this.formErrors[fieldName]) {
      return 'form-field form-field-invalid';
    }
    return 'form-field';
  }

  hasError(fieldName: string): boolean {
    return !!this.formErrors[fieldName];
  }

  getErrorMessage(fieldName: string): string {
    return this.formErrors[fieldName] || '';
  }

  // Métodos adicionales para compatibilidad con template del admin-dashboard
  onRoleChange(role: string): void {
    // Actualizar el rol en newUser
    this.newUser.rol = role;
    
    // Limpiar campos específicos del rol anterior
    this.resetRoleSpecificFields();
    
    // También actualizar el modelo del usuario
    if (role === 'Administrador') {
      this.user.rol = 'ADMINISTRADOR';
    } else if (role === 'Gestor') {
      this.user.rol = 'GESTOR_CONTENIDOS';
    } else if (role === 'Visualizador') {
      this.user.rol = 'VISUALIZADOR';
    }
    
    // Limpiar errores de campos
    this.fieldsWithError = [];
    
    // Emitir cambio y forzar detección
    this.onInputChange();
    this.cdr.detectChanges();
  }

  private resetRoleSpecificFields(): void {
    // Resetear campos específicos según el cambio de rol
    this.newUser.departamento = '';
    this.newUser.alias = '';
    this.newUser.especialidad = '';
    this.newUser.descripcion = '';
    this.newUser.tipoContenido = '';
    this.newUser.foto = null;
  }

  onPasswordValidationChange(validation: any): void {
    this.passwordValidation = validation;
  }

  // Método para marcar el formulario como tocado cuando el usuario interactúa
  onFieldInteraction(): void {
    this.formTouched = true;
  }

  hasFieldError(field: string): boolean {
    // Si el formulario no ha sido tocado, no mostrar errores
    if (!this.formTouched) {
      return false;
    }
    
    // Verificar si el campo está en la lista de campos con error
    return this.fieldsWithError.includes(field);
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
    this.showPasswordField = !this.showPasswordField;
  }

  toggleRepeatPasswordVisibility(): void {
    this.showRepeatPassword = !this.showRepeatPassword;
  }

  // Sincronizar datos entre newUser y user
  private syncUserData(): void {
    this.user.nombres = this.newUser.nombre;
    this.user.apellidos = this.newUser.apellidos;
    this.user.email = this.newUser.email;
    this.user.username = this.newUser.apodo || this.newUser.alias;
    this.user.password = this.newUser.contrasenia;
    this.user.confirmPassword = this.newUser.repetirContrasenia;
    this.user.fechaNacimiento = this.newUser.fechaNacimiento;
    this.user.telefono = this.newUser.telefono || '';
    this.user.genero = this.newUser.genero || '';
    
    // Mapear el rol al formato esperado por UserFormUser
    switch (this.newUser.rol) {
      case 'Administrador':
        this.user.rol = 'ADMINISTRADOR';
        break;
      case 'Gestor':
        this.user.rol = 'GESTOR_CONTENIDOS';
        break;
      case 'Visualizador':
        this.user.rol = 'VISUALIZADOR';
        break;
      default:
        this.user.rol = 'VISUALIZADOR';
    }
  }

  getUserTypeDisplayName(rol: string): string {
    switch (rol) {
      case 'Administrador':
        return 'Administrador';
      case 'Gestor':
        return 'Gestor de Contenido';
      case 'Visualizador':
        return 'Visualizador';
      default:
        return 'Usuario';
    }
  }

  // Método para obtener todos los datos del formulario incluyendo campos específicos
  getFormData(): any {
    return {
      ...this.user,
      newUser: this.newUser
    };
  }

  private initializeNewUser(): void {
    // Reinicializar newUser con valores por defecto para crear usuario
    this.newUser = {
      rol: 'Administrador', // Por defecto crear Administrador
      nombre: '',
      apellidos: '',
      email: '',
      apodo: '',
      alias: '',
      departamento: '',
      contrasenia: '',
      repetirContrasenia: '',
      telefono: '',
      genero: '',
      fechaNacimiento: '',
      especialidad: '',
      descripcion: '',
      tipoContenido: '',
      foto: null
    };

    // Mostrar contraseñas al crear nuevo usuario
    this.showPassword = true;
  }

  private initializeFormFromUser(): void {
    if (!this.user) return;
    
    // Usar profileData si está disponible, si no, usar user básico
    const data = this.profileData || this.user;
    
    // Mapear el rol al formato esperado por newUser
    let mappedRole = 'Visualizador';
    switch (this.user.rol) {
      case 'ADMINISTRADOR':
        mappedRole = 'Administrador';
        break;
      case 'GESTOR_CONTENIDOS':
        mappedRole = 'Gestor';
        break;
      case 'VISUALIZADOR':
        mappedRole = 'Visualizador';
        break;
    }

    this.newUser = {
      rol: mappedRole,
      nombre: this.user.nombres || '',
      apellidos: this.user.apellidos || '',
      email: this.user.email || '',
      apodo: this.user.username || '',
      alias: data.alias || this.user.username || '',
      departamento: data.departamento || '', // Para administradores
      contrasenia: '',
      repetirContrasenia: '',
      telefono: this.user.telefono || '',
      genero: this.user.genero || '',
      fechaNacimiento: data.fechaNacimiento ? data.fechaNacimiento.toString().split('T')[0] : this.user.fechaNacimiento || '',
      especialidad: data.especialidad || '', // Para gestores
      descripcion: data.descripcion || '', // Para gestores
      tipoContenido: data.tipoContenido || '', // Para gestores
      foto: data.foto || null
    };

    // No mostrar contraseñas por defecto en modo edición
    this.showPassword = false;
  }

  closeSuccessModal(): void {
    this.updateSuccess = false;
    // Emitir evento para notificar al componente padre que el usuario fue actualizado
    this.formSubmit.emit(this.user);
  }

  closeErrorModal(): void {
    this.updateError = null;
  }

  // ==================== FUNCIONES DE BLOQUEO Y ELIMINACIÓN ====================
  
  /**
   * Bloquea o desbloquea un usuario con confirmación modal
   */
  async onToggleUserStatus(user: any, adminId?: string): Promise<void> {
    const action = user.bloqueado ? 'desbloquear' : 'bloquear';
    const actionText = user.bloqueado ? 'Desbloquear' : 'Bloquear';
    
    const confirmed = await this.modalService.openConfirmationModal({
      title: `${actionText} Usuario`,
      message: `¿Está seguro de que desea ${action} al usuario "${user.nombre || user.nombres} ${user.apellidos}"?`,
      confirmText: actionText,
      cancelText: 'Cancelar',
      type: user.bloqueado ? 'success' : 'warning'
    });

    if (confirmed && user.id) {
      await this.executeUserStatusToggle(user.id, user.bloqueado, adminId);
    }
  }

  /**
   * Ejecuta el bloqueo/desbloqueo del usuario
   */
  private async executeUserStatusToggle(userId: string, currentlyBlocked: boolean, adminId?: string): Promise<void> {
    try {
      const currentUser = this.getCurrentUser();
      const effectiveAdminId = adminId || currentUser?.id?.toString();
      
      if (!effectiveAdminId) {
        console.error('No se pudo obtener el ID del administrador');
        return;
      }

      // Si está bloqueado actualmente, desbloquear; si no está bloqueado, bloquear
      if (currentlyBlocked) {
        await firstValueFrom(this.adminService.desbloquearUsuario(userId, effectiveAdminId));
        console.log('Usuario desbloqueado exitosamente');
      } else {
        await firstValueFrom(this.adminService.bloquearUsuario(userId, effectiveAdminId));
        console.log('Usuario bloqueado exitosamente');
      }
      
      // Emitir evento específico para el cambio de estado
      this.userStatusToggled.emit({ userId, blocked: !currentlyBlocked });
      
    } catch (error) {
      console.error('Error toggling user status:', error);
      this.updateError = 'Error al cambiar el estado del usuario. Por favor, inténtelo de nuevo.';
    }
  }

  /**
   * Elimina un usuario con confirmación modal
   */
  async onDeleteUser(user: any): Promise<void> {
    const confirmed = await this.modalService.openConfirmationModal({
      title: 'Eliminar Usuario',
      message: `¿Está seguro de que desea eliminar al usuario "${user.nombre || user.nombres} ${user.apellidos}"?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'error'
    });

    if (confirmed && user.id) {
      await this.executeUserDeletion(user.id);
    }
  }

  /**
   * Ejecuta la eliminación del usuario
   */
  private async executeUserDeletion(userId: string): Promise<void> {
    try {
      await firstValueFrom(this.adminService.deleteUser(userId));
      console.log('Usuario eliminado exitosamente');
      
      // Emitir evento específico para eliminación
      this.userDeleted.emit(userId);
      
    } catch (error) {
      console.error('Error deleting user:', error);
      this.updateError = 'Error al eliminar el usuario. Por favor, inténtelo de nuevo.';
    }
  }

  /**
   * Obtiene el usuario actual desde localStorage/sessionStorage
   */
  private getCurrentUser(): any {
    try {
      const userStr = localStorage.getItem('currentUserClass') || sessionStorage.getItem('user');
      if (userStr) {
        return JSON.parse(userStr);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
    return null;
  }
}