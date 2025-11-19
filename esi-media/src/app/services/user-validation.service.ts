import { Injectable } from '@angular/core';

export interface PasswordValidation {
  minLength: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  noStartsWithUpperCase: boolean;
  passwordsMatch: boolean;
  notContainsUsername: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  message?: string;
  fields?: string[];
}

@Injectable({ 
  providedIn: 'root' 
})
export class UserValidationService {
  
  validatePassword(password: string, confirmPassword: string, username: string): PasswordValidation {
    return {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      noStartsWithUpperCase: password.length > 0 && !/^[A-Z]/.test(password),
      passwordsMatch: password.length > 0 && password === confirmPassword,
      notContainsUsername: username.length === 0 || password.length === 0 || 
        !password.toLowerCase().includes(username.toLowerCase())
    };
  }

  isPasswordValid(validation: PasswordValidation): boolean {
    return Object.values(validation).every(v => v === true);
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return emailRegex.test(email);
  }

  validateUserForm(userData: any, role: string): ValidationResult {
    const requiredFields = role === 'Gestor' 
      ? ['nombre', 'apellidos', 'email', 'contrasenia', 'alias', 'especialidad', 'tipoContenido', 'foto']
      : ['nombre', 'apellidos', 'email', 'contrasenia', 'departamento'];
    
    const emptyFields = requiredFields.filter(field => !userData[field]);
    
    if (emptyFields.length > 0) {
      return {
        isValid: false,
        message: `Complete todos los campos obligatorios: ${emptyFields.join(', ')}`,
        fields: emptyFields
      };
    }

    if (!this.validateEmail(userData.email)) {
      return {
        isValid: false,
        message: 'Ingrese un correo electrónico válido',
        fields: ['email']
      };
    }

    return { isValid: true };
  }

  getPasswordRules(): Array<{key: keyof PasswordValidation, label: string}> {
    return [
      { key: 'minLength', label: 'Mínimo 8 caracteres' },
      { key: 'noStartsWithUpperCase', label: 'No debe comenzar con mayúscula' },
      { key: 'hasUpperCase', label: 'Al menos una letra mayúscula' },
      { key: 'hasLowerCase', label: 'Al menos una letra minúscula' },
      { key: 'hasNumber', label: 'Al menos un número' },
      { key: 'hasSpecialChar', label: 'Al menos un carácter especial' },
      { key: 'passwordsMatch', label: 'Las contraseñas deben coincidir' },
      { key: 'notContainsUsername', label: 'No debe contener el nombre' }
    ];
  }
}