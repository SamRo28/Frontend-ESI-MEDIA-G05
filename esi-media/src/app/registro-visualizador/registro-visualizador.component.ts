import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { VisualizadorService } from '../services/visualizador.service';

@Component({
  selector: 'app-registro-visualizador',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './registro-visualizador.component.html',
  styleUrl: './registro-visualizador.component.css'
})
export class RegistroVisualizadorComponent implements OnInit {
  // Rutas de avatares predefinidos
  preloadedImages: string[] = [
    'perfil1.png',
    'perfil2.png',
    'perfil3.png',
    'perfil4.png'
  ];
  
  // Para la selección de avatar
  selectedAvatar: number = -1; // -1 significa ninguno seleccionado

  // Fecha máxima permitida en el input date (hoy) y fecha máxima para cumplir edad >=4 años
  todayStr: string;
  minAllowedBirthStr: string; // fecha mínima permitida (limite inferior) - no usada estrictamente aquí
  maxBirthForFourYearsStr: string; // fecha máxima para que el usuario tenga al menos 4 años

  // Validación de contraseña en tiempo real
  passwordValidation = {
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false,
    hasPersonalData: false // Controla si la contraseña contiene datos personales
  };

  // Control para mostrar/ocultar las contraseñas
  showPassword = false;
  showConfirmPassword = false;

  form!: FormGroup;
  submitted = false;
  formSubmitted = false; // usado para mostrar inline hints como el de fecha solo tras submit
  serverErrors: Record<string, string[]> = {};
  emailErrorAdded = false; // Control para evitar duplicación de mensajes de error de email

  constructor(private fb: FormBuilder, private router: Router, private svc: VisualizadorService) {
    
    const today = new Date();
    this.todayStr = RegistroVisualizadorComponent.toDateInputValue(today);

    // fecha máxima para que la persona tenga al menos 4 años => hoy - 4 años
    const fourYearsAgo = new Date(today.getFullYear() - 4, today.getMonth(), today.getDate());
    this.maxBirthForFourYearsStr = RegistroVisualizadorComponent.toDateInputValue(fourYearsAgo);

    // fecha mínima razonable (por ejemplo 120 años atrás)
    const minBirth = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
    this.minAllowedBirthStr = RegistroVisualizadorComponent.toDateInputValue(minBirth);
  }

  static toDateInputValue(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  
  // Seleccionar un avatar predefinido
  selectPreloaded(idx: number) {
    this.selectedAvatar = idx;
    // Añadir la ruta del avatar al formulario
    this.form.patchValue({ 
      avatar: this.preloadedImages[idx]
    });
  }
  
  // Quitar la selección de avatar
  removePreview() {
    this.selectedAvatar = -1;
    this.form.patchValue({ avatar: null });
  }

  ngOnInit(): void {
    // Inicializar formulario con validadores
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(40)]],
      apellidos: ['', [Validators.required, Validators.maxLength(60)]],
      email: ['', [Validators.required, Validators.email]],
      alias: ['', [Validators.maxLength(12)]],
      fecha_nac: ['', [Validators.required, this.birthDateValidator(4)]],
      password: ['', [Validators.required, this.passwordValidator()]],
      passwordConfirm: ['', [Validators.required]],
      vip: [false],
      avatar: [null] // Para almacenar la ruta del avatar seleccionado
    }, { validators: this.passwordsMatchValidator });
    
    // Suscribirse a cambios en el campo de contraseña para validar en tiempo real
    this.form.get('password')?.valueChanges.subscribe(value => {
      this.validatePassword(value);
    });
  }

  // Validador personalizado: comprobar que la fecha sea anterior a hoy y que la edad >= minYears
  birthDateValidator(minYears: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const v = control.value;
      if (!v) return null; // required lo maneja aparte
      const d = new Date(v);
      if (isNaN(d.getTime())) return { invalidDate: 'Fecha inválida' };
      const today = new Date();
      if (d > today) return { futureDate: 'La fecha no puede ser futura' };
      const cutoff = new Date(today.getFullYear() - minYears, today.getMonth(), today.getDate());
      if (d > cutoff) return { tooYoung: `Debes tener al menos ${minYears} años` };
      return null;
    };
  }

  // Validador de contraseña que verifica criterios individuales
  passwordValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null; // required lo maneja aparte
      
      // Verificar todos los criterios básicos
      const hasMinLength = value.length >= 8;
      const hasUpperCase = /[A-Z]/.test(value);
      const hasLowerCase = /[a-z]/.test(value);
      const hasNumber = /[0-9]/.test(value);
      const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);
      
      // Verificar que no contenga datos personales (se comprobará más a fondo en validatePassword)
      // Aquí solo verificamos si el formulario existe y tiene los campos necesarios
      let hasPersonalData = false;
      const form = control.parent;
      if (form) {
        const nombre = form.get('nombre')?.value?.toLowerCase() || '';
        const apellidos = form.get('apellidos')?.value?.toLowerCase() || '';
        
        if (nombre && apellidos && value) {
          const lowerValue = value.toLowerCase();
          // Comprobar si la contraseña contiene el nombre o apellidos
          hasPersonalData = (nombre.length > 2 && lowerValue.includes(nombre.toLowerCase())) || 
                           (apellidos.length > 2 && lowerValue.includes(apellidos.toLowerCase()));
        }
      }
      
      // Si todos los criterios pasan, devolver null (válido)
      if (hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar && !hasPersonalData) {
        return null;
      }
      
      // Sino, devolver un objeto con los criterios que fallaron
      return {
        passwordPolicy: {
          hasMinLength,
          hasUpperCase,
          hasLowerCase,
          hasNumber,
          hasSpecialChar,
          hasPersonalData
        }
      };
    };
  }
  
  // Método para validar la contraseña y actualizar el estado de validación
  validatePassword(value: string): void {
    if (!value) {
      this.resetPasswordValidation();
      return;
    }
    
    // Comprobar si contiene datos personales
    const nombre = this.form?.get('nombre')?.value?.toLowerCase() || '';
    const apellidos = this.form?.get('apellidos')?.value?.toLowerCase() || '';
    const lowerValue = value.toLowerCase();
    
    const hasPersonalData = (nombre && nombre.length > 2 && lowerValue.includes(nombre)) || 
                          (apellidos && apellidos.length > 2 && lowerValue.includes(apellidos));
    
    // Actualizar estado de validación
    this.passwordValidation = {
      minLength: value.length >= 8,
      hasUpperCase: /[A-Z]/.test(value),
      hasLowerCase: /[a-z]/.test(value),
      hasNumber: /[0-9]/.test(value),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value),
      hasPersonalData: hasPersonalData
    };
  }
  
  // Resetear el estado de validación de contraseña
  resetPasswordValidation(): void {
    this.passwordValidation = {
      minLength: false,
      hasUpperCase: false,
      hasLowerCase: false,
      hasNumber: false,
      hasSpecialChar: false,
      hasPersonalData: false
    };
  }

  //Lo tengo ya en el servicio del back, pero en el front hago comprobaciones inmediatas
  // como que las contraseñas coincidan, lo de minimo 4 años,...
  passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
    const p = group.get('password');
    const pc = group.get('passwordConfirm');
    if (!p || !pc) return null;
    if (p.value !== pc.value) return { passwordsMismatch: 'Las contraseñas no coinciden' };
    return null;
  }

  collectClientErrors(): string[] {
    const errors: string[] = [];
    const f = this.form;
    
    // Solo mostrar errores si el formulario ha sido enviado
    if (!f || !this.formSubmitted) return errors;
    
    for (const key of Object.keys(f.controls)) {
      const control = f.get(key);
      if (!control || !control.errors) continue;
      
      for (const err of Object.keys(control.errors)) {
        switch (err) {
          case 'required': 
            errors.push(`${this.humanize(key)} es obligatorio`);
            break;
          case 'maxlength': 
            errors.push(`${this.humanize(key)} supera longitud máxima`);
            break;
          case 'email': 
            errors.push('Email con formato inválido');
            break;
          case 'invalidDate': 
            errors.push('Fecha de nacimiento inválida');
            break;
          case 'futureDate': 
            errors.push('La fecha no puede ser futura');
            break;
          case 'tooYoung': 
            errors.push(`Debes tener al menos 4 años`);
            break;
          case 'passwordPolicy':
            // Mostrar mensajes específicos para cada criterio fallido de la política de contraseñas
            const policy = control.errors['passwordPolicy'];
            const passwordErrors: string[] = [];
            
            if (!policy.hasMinLength) {
              passwordErrors.push('tener al menos 8 caracteres');
            }
            if (!policy.hasUpperCase) {
              passwordErrors.push('incluir al menos una letra mayúscula');
            }
            if (!policy.hasLowerCase) {
              passwordErrors.push('incluir al menos una letra minúscula');
            }
            if (!policy.hasNumber) {
              passwordErrors.push('incluir al menos un número');
            }
            if (!policy.hasSpecialChar) {
              passwordErrors.push('incluir al menos un carácter especial (!, @, #, $, etc.)');
            }
            if (policy.hasPersonalData) {
              passwordErrors.push('no contener datos personales (nombre o apellidos)');
            }
            
            if (passwordErrors.length > 0) {
              errors.push(`La contraseña debe ${passwordErrors.join(', ')}`);
            }
            break;
          case 'pattern': 
            errors.push('La contraseña no cumple la política mínima');
            break;
          case 'duplicate': 
            // No agregamos el error de duplicado aquí porque ya se muestra en el campo
            break; 
          default: 
            errors.push(`${this.humanize(key)}: ${err}`);
        }
      }
    }
    
    const groupErr = f.errors;
    if (groupErr && groupErr['passwordsMismatch'] && this.formSubmitted) 
      errors.push('Las contraseñas no coinciden');
      
    return errors;
  }

  /**
   * Convierte las claves del formulario en nombres legibles y amigables para el usuario.
   * 
   * Este método mapea los identificadores técnicos de los campos del formulario 
   * (como 'nombre', 'apellidos', 'email', etc.) a versiones más amigables y 
   * correctamente capitalizadas en español para mostrar en mensajes de error.
   * Si la clave no está mapeada, devuelve la clave original sin modificar.
   * 
   * @param key - Identificador técnico del campo del formulario
   * @returns Versión humanizada del nombre del campo
   */
  humanize(key: string) {
    const map: Record<string,string> = {
      nombre: 'Nombre', apellidos: 'Apellidos', email: 'Email', alias: 'Alias', fecha_nac: 'Fecha de nacimiento', password: 'Contraseña', passwordConfirm: 'Confirmación'
    };
    return map[key] || key;
  }

  onSubmit() {
    // Marcar el formulario como enviado para mostrar los errores
    this.submitted = true;
    this.formSubmitted = true;
    
    // Limpiar errores previos del servidor
    this.serverErrors = {};
    
    // Variable para controlar si ya hemos añadido un error de email
    this.emailErrorAdded = false;
    
    // Restablecer los errores previos de los controles
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      if (control && control.hasError('server') || control?.hasError('duplicate')) {
        // Mantener otros errores pero eliminar los del servidor
        const currentErrors = {...control.errors};
        delete currentErrors['server'];
        delete currentErrors['duplicate'];
        
        if (Object.keys(currentErrors).length > 0) {
          control.setErrors(currentErrors);
        } else {
          control.setErrors(null);
        }
      }
    });
    
    if (this.form.invalid) {
      // No necesitamos marcar todos los controles como tocados, ya que ahora
      // los errores se muestran basándose en formSubmitted
      return; // errores se mostrarán en los campos correspondientes
    }

    // Obtener valores del formulario
    const val = this.form.value;
    
    // Preparar payload para la API en formato JSON (no FormData)
    const payload = {
      nombre: val.nombre,
      apellidos: val.apellidos,
      email: val.email,
      alias: val.alias || '',
      fecha_nac: val.fecha_nac, // Formato ISO YYYY-MM-DD
      contrasenia: val.password,
      confirmacion_contrasenia: val.passwordConfirm,
      vip: val.vip || false,
      foto: this.selectedAvatar >= 0 ? this.preloadedImages[this.selectedAvatar] : null // Incluir avatar seleccionado
    };

    // Llamar al servicio con el objeto JSON
    this.svc.register(payload).subscribe({
      next: (response) => {
        console.log('Registro exitoso:', response);
        this.router.navigate(['/2fa']);
      },
      error: (err) => {
        console.error('Error en registro:', err);
        
        // Mostrar todos los detalles del error para depuración
        console.log('Detalles completos del error:', JSON.stringify(err, null, 2));
        
        // Manejo mejorado de errores del backend
        if (err?.errors) {
          // Procesar errores del formato de nuestro backend
          for (const e of err.errors) {
            const fieldName = this.mapFieldName(e.field || 'general');
            this.serverErrors[fieldName] = this.serverErrors[fieldName] || [];
            
            // Para el campo email, siempre usar un mensaje amigable si es error de duplicado
            if (fieldName === 'email' && 
               (e.message.toLowerCase().includes('ya registrado') ||
                e.message.toLowerCase().includes('duplicado') ||
                e.message.toLowerCase().includes('ya existe') ||
                e.message.toLowerCase().includes('unicidad'))) {
              // No añadir mensaje al error general, se mostrará en el campo
            } else {
              this.serverErrors[fieldName].push(e.message);
            }
            
            // Marcar el campo como inválido
            const ctrl = this.form.get(fieldName);
            if (ctrl) {
              ctrl.setErrors({ server: true });
            }
            
            // Manejar específicamente el error de email duplicado
            if (!this.emailErrorAdded && 
                (fieldName === 'email' || 
                (e.message && (
                 e.message.toLowerCase().includes('email') || 
                 e.message.toLowerCase().includes('correo')) && 
                 (e.message.toLowerCase().includes('ya existe') || 
                 e.message.toLowerCase().includes('duplicado') || 
                 e.message.toLowerCase().includes('ya está registrado') || 
                 e.message.toLowerCase().includes('ya registrado') || 
                 e.message.toLowerCase().includes('unicidad'))))) {
              
              console.log('Detectado error de email duplicado:', e.message);
              
              const emailCtrl = this.form.get('email');
              if (emailCtrl) {
                emailCtrl.setErrors({ duplicate: true });
                
                // Forzar la visualización del error marcando el campo
                this.form.markAllAsTouched();
                emailCtrl.markAsDirty();
              }
              
              // Asegurarse de que el error se muestre en el bloque general, no en el campo
              if (!this.serverErrors['general']) {
                this.serverErrors['general'] = [];
              }
              
              // Añadir mensaje amigable al bloque general
              if (!this.serverErrors['general'].includes('Este correo ya está registrado en el sistema')) {
                this.serverErrors['general'].push('Este correo ya está registrado en el sistema');
              }
              
              // Marcar que ya hemos añadido un error de email
              this.emailErrorAdded = true;
            }
          }
        } else if (err?.error?.errores && Array.isArray(err.error.errores)) {
          // Procesar errores en formato de Spring Boot
          for (const errorMsg of err.error.errores) {
            this.serverErrors['general'] = this.serverErrors['general'] || [];
            this.serverErrors['general'].push(errorMsg);
            
            // Detectar mensajes específicos de error
            if (!this.emailErrorAdded && 
                typeof errorMsg === 'string' && 
                (errorMsg.toLowerCase().includes('email') || 
                 errorMsg.toLowerCase().includes('correo') || 
                 errorMsg.toLowerCase().includes('unicidad')) && 
                (errorMsg.toLowerCase().includes('ya existe') || 
                 errorMsg.toLowerCase().includes('duplicado') ||
                 errorMsg.toLowerCase().includes('ya registrado') ||
                 errorMsg.toLowerCase().includes('ya está registrado'))) {
              
              console.log('Detectado error de email duplicado en errores generales:', errorMsg);
              
              const emailCtrl = this.form.get('email');
              if (emailCtrl) {
                emailCtrl.setErrors({ duplicate: true });
                emailCtrl.markAsDirty();
              }
              
              // Asegurarse de que el error se muestre en el bloque general
              if (!this.serverErrors['general']) {
                this.serverErrors['general'] = [];
              }
              
              // Añadir mensaje amigable al bloque general
              if (!this.serverErrors['general'].includes('Este correo ya está registrado en el sistema')) {
                this.serverErrors['general'].push('Este correo ya está registrado en el sistema');
              }
              
              // Marcar que ya hemos añadido un error de email
              this.emailErrorAdded = true;
              
              // Eliminar otros mensajes relacionados con email
              this.serverErrors['general'] = this.serverErrors['general']?.filter(
                msg => !(msg.toLowerCase().includes('email') || msg.toLowerCase().includes('correo')) || 
                msg === 'Este correo ya está registrado en el sistema'
              ) || [];
            }
          }
        } else if (err?.error?.mensaje) {
          // Error general con mensaje
          this.serverErrors['general'] = [err.error.mensaje];
        } else {
          // Fallback para otros tipos de errores
          this.serverErrors['general'] = ['Error de conexión con el servidor. Inténtalo más tarde.'];
        }
      }
    });
  }
  
  // Mapeo de nombres de campo del backend a nombres de campo del formulario
  private mapFieldName(backendField: string): string {
    const mapping: { [key: string]: string } = {
      'contrasenia': 'password',
      'confirmacion_contrasenia': 'passwordConfirm',
      'fecha_nac': 'fecha_nac',
      // Añadir más mapeos según sea necesario
    };
    
    return mapping[backendField] || backendField;
  }

  get aggregatedErrors(): string[] {
    const client = this.collectClientErrors();
    const server: string[] = [];
    
    // Conjunto para controlar duplicados
    const uniqueMessages = new Set<string>();
    
    // Añadir errores del cliente
    client.forEach(msg => uniqueMessages.add(msg));
    
    // Añadir error de email duplicado si existe
    if (this.form.get('email')?.hasError('duplicate')) {
      uniqueMessages.add('Este correo ya está registrado en el sistema');
    }
    
    // Añadir errores del servidor sin duplicar
    for (const k of Object.keys(this.serverErrors)) {
      for (const m of this.serverErrors[k]) {
        // Evitar duplicados relacionados con el email si ya tenemos error de duplicado
        if ((m.toLowerCase().includes('correo') || m.toLowerCase().includes('email')) && 
            this.form.get('email')?.hasError('duplicate')) {
          continue;
        }
        uniqueMessages.add(m);
      }
    }
    
    return Array.from(uniqueMessages);
  }
}
