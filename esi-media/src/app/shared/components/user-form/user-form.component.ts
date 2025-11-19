import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PasswordValidatorComponent } from '../password-validator/password-validator.component';
import { UserValidationService } from '../../../services/user-validation.service';

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
export class UserFormComponent implements OnInit {
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
  @Output() userChange = new EventEmitter<Usuario>();
  @Output() validationChange = new EventEmitter<boolean>();
  @Output() formSubmit = new EventEmitter<Usuario>();
  @Output() formCancel = new EventEmitter<void>();

  formErrors: { [key: string]: string } = {};

  constructor(private userValidationService: UserValidationService) {}

  ngOnInit() {
    // Asegurar que las propiedades de contraseña estén inicializadas
    if (!this.user.password) {
      this.user.password = '';
    }
    if (!this.user.confirmPassword) {
      this.user.confirmPassword = '';
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
    } else if (!/^[a-zA-Z0-9_]+$/.test(this.user.username)) {
      this.formErrors['username'] = 'El nombre de usuario solo puede contener letras, números y guiones bajos';
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
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(this.user.nombres)) {
      this.formErrors['nombres'] = 'Los nombres solo pueden contener letras y espacios';
      isValid = false;
    }

    // Validar apellidos
    if (!this.user.apellidos || this.user.apellidos.trim().length === 0) {
      this.formErrors['apellidos'] = 'Los apellidos son requeridos';
      isValid = false;
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(this.user.apellidos)) {
      this.formErrors['apellidos'] = 'Los apellidos solo pueden contener letras y espacios';
      isValid = false;
    }

    // Validar fecha de nacimiento
    if (!this.user.fechaNacimiento) {
      this.formErrors['fechaNacimiento'] = 'La fecha de nacimiento es requerida';
      isValid = false;
    } else {
      const birthDate = new Date(this.user.fechaNacimiento);
      const today = new Date();
      const minAge = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
      const maxAge = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
      
      if (birthDate > minAge) {
        this.formErrors['fechaNacimiento'] = 'Debe ser mayor de 13 años';
        isValid = false;
      } else if (birthDate < maxAge) {
        this.formErrors['fechaNacimiento'] = 'Fecha de nacimiento no válida';
        isValid = false;
      }
    }

    // Validar teléfono
    if (!this.user.telefono || this.user.telefono.trim().length === 0) {
      this.formErrors['telefono'] = 'El teléfono es requerido';
      isValid = false;
    } else if (!/^\+?[0-9\s\-()]{9,15}$/.test(this.user.telefono)) {
      this.formErrors['telefono'] = 'Formato de teléfono no válido';
      isValid = false;
    }

    // Validar género
    if (!this.user.genero) {
      this.formErrors['genero'] = 'El género es requerido';
      isValid = false;
    }

    this.validationChange.emit(isValid);
    return isValid;
  }

  onSubmit(): void {
    if (this.validateForm()) {
      this.formSubmit.emit(this.user);
    }
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
}