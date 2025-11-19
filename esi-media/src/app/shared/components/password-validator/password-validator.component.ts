import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserValidationService, PasswordValidation } from '../../../services/user-validation.service';

@Component({
  selector: 'app-password-validator',
  templateUrl: './password-validator.component.html',
  styleUrls: ['./password-validator.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class PasswordValidatorComponent implements OnInit, OnChanges {
  @Input() password = '';
  @Input() confirmPassword = '';
  @Input() username = '';
  @Input() firstName = '';
  @Input() lastName = '';
  @Input() disabled = false;
  @Input() showLabels = true;
  @Input() inline = false;
  
  @Output() passwordChange = new EventEmitter<string>();
  @Output() confirmPasswordChange = new EventEmitter<string>();
  @Output() validationChange = new EventEmitter<PasswordValidation>();
  @Output() isValidChange = new EventEmitter<boolean>();

  showPassword = false;
  showConfirmPassword = false;
  validation: PasswordValidation = {
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false,
    noStartsWithUpperCase: false,
    passwordsMatch: false,
    notContainsPersonalData: true
  };

  passwordRules: Array<{key: keyof PasswordValidation, label: string, isValid: boolean}> = [];

  constructor(private userValidationService: UserValidationService) {}

  ngOnInit() {
    this.passwordRules = this.userValidationService.getPasswordRules().map(rule => ({
      ...rule,
      isValid: false
    }));
    this.validatePasswords();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['password'] || changes['confirmPassword'] || changes['username']) {
      this.validatePasswords();
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onPasswordChange() {
    this.passwordChange.emit(this.password);
    this.validatePasswords();
  }

  onConfirmPasswordChange() {
    this.confirmPasswordChange.emit(this.confirmPassword);
    this.validatePasswords();
  }

  private validatePasswords() {
    this.validation = this.userValidationService.validatePassword(
      this.password,
      this.confirmPassword,
      this.username,
      this.firstName,
      this.lastName
    );
    
    // Actualizar reglas con estados actuales
    this.passwordRules = this.passwordRules.map(rule => ({
      ...rule,
      isValid: this.validation[rule.key] as boolean
    }));
    
    const isValid = this.userValidationService.isPasswordValid(this.validation);
    
    this.validationChange.emit(this.validation);
    this.isValidChange.emit(isValid);
  }

  getPasswordFieldClass(): string {
    const baseClass = 'w-full px-4 py-2.5 pr-12 border-2 rounded-lg focus:ring-2 focus:border-transparent outline-none transition-all';
    
    if (this.password.length === 0) {
      return `${baseClass} border-gray-300 focus:ring-blue-500`;
    }
    
    const hasErrors = !this.validation.minLength || !this.validation.hasUpperCase ||
             !this.validation.hasLowerCase || !this.validation.hasNumber ||
             !this.validation.hasSpecialChar || !this.validation.noStartsWithUpperCase ||
             !this.validation.notContainsPersonalData;
    
    return hasErrors 
      ? `${baseClass} border-red-500 bg-red-50 focus:ring-red-500`
      : `${baseClass} border-green-500 bg-green-50 focus:ring-green-500`;
  }

  getConfirmPasswordFieldClass(): string {
    const baseClass = 'w-full px-4 py-2.5 pr-12 border-2 rounded-lg focus:ring-2 focus:border-transparent outline-none transition-all';
    
    if (this.confirmPassword.length === 0) {
      return `${baseClass} border-gray-300 focus:ring-blue-500`;
    }
    
    return this.validation.passwordsMatch
      ? `${baseClass} border-green-500 bg-green-50 focus:ring-green-500`
      : `${baseClass} border-red-500 bg-red-50 focus:ring-red-500`;
  }
}