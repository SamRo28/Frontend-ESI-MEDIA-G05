import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { VisualizadorService } from '../services/visualizador.service';
import { PasswordValidatorComponent } from '../shared/components/password-validator/password-validator.component';

@Component({
  selector: 'app-registro-visualizador',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, PasswordValidatorComponent],
  templateUrl: './registro-visualizador.component.html',
  styleUrl: './registro-visualizador.component.css'
})
export class RegistroVisualizadorComponent implements OnInit, OnDestroy {
  private static readonly ACT_POLL_INTERVAL = 3000;
  private static readonly CONFIRM_2FA_MESSAGE = 'Cuenta activada. ¿Deseas activar 2FA ahora?';
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

  // Estado de validación del password-validator
  private passwordIsValid = false;

  form!: FormGroup;
  submitted = false;
  formSubmitted = false; // usado para mostrar inline hints como el de fecha solo tras submit
  serverErrors: Record<string, string[]> = {};
  emailErrorAdded = false; // Control para evitar duplicación de mensajes de error de email

  // Estado de activación
  waitingActivation = false;
  private pollId: any = null;
  private emailForPolling: string | null = null;
  private activationFinalized = false; // evita repetir confirm tras manejar activación
  private pendingShow2FA = false; // activación detectada con pestaña oculta
  // Ya no necesitamos lastActivationToken, el backend gestiona los tokens mediante cookies

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
      password: ['', [Validators.required]],
      passwordConfirm: ['', [Validators.required]],
      vip: [false],
      avatar: [null] // Para almacenar la ruta del avatar seleccionado
    }, { validators: this.passwordsMatchValidator });


    // Escuchar foco/visibilidad para comprobar activación al volver a la app
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityOrFocus);
      window.addEventListener('focus', this.onVisibilityOrFocus);
    }
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

  // Callbacks del componente compartido de contraseñas
  onPasswordValidationChange(validation: any): void {
    const passCtrl = this.form.get('password');
    const confirmCtrl = this.form.get('passwordConfirm');
    // Gestionar error de política en el control password
    const hasPolicyError = !validation.minLength || !validation.hasUpperCase || !validation.hasLowerCase ||
                 !validation.hasNumber || !validation.hasSpecialChar || !validation.noStartsWithUpperCase ||
                 !validation.notContainsPersonalData;
    if (passCtrl) {
      const current = { ...(passCtrl.errors || {}) } as Record<string, boolean>;
      if (hasPolicyError) {
        current['passwordPolicy'] = true;
        passCtrl.setErrors(current);
      } else {
        delete current['passwordPolicy'];
        passCtrl.setErrors(Object.keys(current).length ? current : null);
      }
    }
    // Forzar revalidación de coincidencia
    if (confirmCtrl) confirmCtrl.updateValueAndValidity({ onlySelf: false, emitEvent: false });
  }

  onPasswordIsValidChange(isValid: boolean): void {
    this.passwordIsValid = isValid;
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
    
    // Procesar errores de controles individuales
    for (const key of Object.keys(f.controls)) {
      const control = f.get(key);
      if (!control || !control.errors) continue;
      
      this.processControlErrors(control, key, errors);
    }
    
    // Procesar errores a nivel de formulario
    this.processFormGroupErrors(f, errors);
      
    return errors;
  }

  // Procesa los errores de un control específico
  private processControlErrors(control: any, key: string, errors: string[]): void {
    for (const err of Object.keys(control.errors)) {
      const errorMessage = this.getErrorMessage(err, control, key);
      if (errorMessage) {
        errors.push(errorMessage);
      }
    }
  }

  // Obtiene el mensaje de error apropiado para cada tipo de error
  private getErrorMessage(err: string, control: any, key: string): string | null {
    switch (err) {
      case 'required': 
        return `${this.humanize(key)} es obligatorio`;
      case 'maxlength': 
        return `${this.humanize(key)} supera longitud máxima`;
      case 'email': 
        return 'Email con formato inválido';
      case 'invalidDate': 
        return 'Fecha de nacimiento inválida';
      case 'futureDate': 
        return 'La fecha no puede ser futura';
      case 'tooYoung': 
        return `Debes tener al menos 4 años`;
      case 'passwordPolicy':
        const policy = control.errors['passwordPolicy'];
        if (!policy || typeof policy !== 'object') {
          return 'La contraseña no cumple la política mínima';
        }
        return this.buildPasswordPolicyMessage(policy);
      case 'pattern': 
        return 'La contraseña no cumple la política mínima';
      case 'duplicate': 
        // No agregamos el error de duplicado aquí porque ya se muestra en el campo
        return null; 
      default: 
        return `${this.humanize(key)}: ${err}`;
    }
  }

  // Construye el mensaje específico para errores de política de contraseñas
  private buildPasswordPolicyMessage(policy: any): string | null {
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
      return `La contraseña debe ${passwordErrors.join(', ')}`;
    }
    
    return null;
  }

  // Procesa errores a nivel de formulario completo
  private processFormGroupErrors(f: any, errors: string[]): void {
    const groupErr = f.errors;
    if (groupErr && groupErr['passwordsMismatch'] && this.formSubmitted) {
      errors.push('Las contraseñas no coinciden');
    }
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
    this.clearServerAndDuplicateControlErrors();
    
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

    // Mostrar el mensaje de espera inmediatamente y memorizar email para polling
    this.waitingActivation = true;
    this.emailForPolling = val.email;

    // Llamar al servicio con el objeto JSON
    this.svc.register(payload).subscribe({
      next: (response) => {
        this.ensureSessionUserFromForm();
        // Empezar a escuchar la activación
        this.startPollingActivation(val.email);
      },
      error: (err) => {
        console.error('Error en registro:', err);
        this.waitingActivation = false;
        this.processRegistrationError(err);
      }
    });
  }

  private startPollingActivation(email: string) {
    this.stopPollingActivation();
    this.pollId = setInterval(() => {
      this.svc.estadoActivacion(email).subscribe({
        next: (res) => this.handleActivationResponse(res, 'polling')
      });
    }, RegistroVisualizadorComponent.ACT_POLL_INTERVAL);
  }

  private stopPollingActivation() {
    if (this.pollId) {
      clearInterval(this.pollId);
      this.pollId = null;
    }
  }

  ngOnDestroy(): void {
    this.stopPollingActivation();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityOrFocus);
      window.removeEventListener('focus', this.onVisibilityOrFocus);
    }
  }

  // Al volver a la pestaña, forzar una comprobación inmediata para no esperar al próximo interval
  private onVisibilityOrFocus = () => {
    // Si vuelve el foco y ya tenemos token pendiente, redirigir
    if (this.pendingShow2FA && !this.activationFinalized) {
      this.activationFinalized = true;
      this.waitingActivation = false;
      this.pendingShow2FA = false;
      // Restaurar comportamiento original: mostrar confirm de 2FA al recuperar foco
      this.prompt2FAAndNavigate();
      return;
    }
    if (this.waitingActivation && this.emailForPolling) {
      this.svc.estadoActivacion(this.emailForPolling).subscribe({
        next: (res) => this.handleActivationResponse(res, 'focus')
      });
    }
  };

  // Eliminado flujo modal: se usa window.confirm directamente al detectar activación.

  
  
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

  private processRegistrationError(err: any): void {
    if (err?.errors) {
      this.processBackendErrors(err.errors);
    } else if (err?.error?.errores && Array.isArray(err.error.errores)) {
      this.processSpringBootErrors(err.error.errores);
    } else if (err?.error?.mensaje) {
      this.serverErrors['general'] = [err.error.mensaje];
    } else {
      this.serverErrors['general'] = ['Error de conexión con el servidor. Inténtalo más tarde.'];
    }
  }

  private processBackendErrors(errors: any[]): void {
    for (const e of errors) {
      const fieldName = this.mapFieldName(e.field || 'general');
      this.serverErrors[fieldName] = this.serverErrors[fieldName] || [];
      
      this.handleFieldError(e, fieldName);
      this.markFieldAsInvalid(fieldName);
      this.handleEmailDuplicateError(e, fieldName);
    }
  }

  private handleFieldError(e: any, fieldName: string): void {
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
  }

  private markFieldAsInvalid(fieldName: string): void {
    const ctrl = this.form.get(fieldName);
    if (ctrl) {
      ctrl.setErrors({ server: true });
    }
  }

  private handleEmailDuplicateError(e: any, fieldName: string): void {
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
      
      this.setEmailDuplicateError();
      this.ensureGeneralEmailError();
      this.emailErrorAdded = true;
    }
  }

  private setEmailDuplicateError(): void {
    const emailCtrl = this.form.get('email');
    if (emailCtrl) {
      emailCtrl.setErrors({ duplicate: true });
      this.form.markAllAsTouched();
      emailCtrl.markAsDirty();
    }
  }

  private processSpringBootErrors(errores: any[]): void {
    for (const errorMsg of errores) {
      this.serverErrors['general'] = this.serverErrors['general'] || [];
      this.serverErrors['general'].push(errorMsg);
      
      this.detectAndHandleEmailDuplicate(errorMsg);
    }
  }

  private detectAndHandleEmailDuplicate(errorMsg: any): void {
    if (!this.emailErrorAdded && 
        typeof errorMsg === 'string' && 
        this.isEmailRelatedError(errorMsg) && 
        this.isDuplicateError(errorMsg)) {
      
      this.setEmailDuplicateError();
      this.ensureGeneralEmailError();
      this.emailErrorAdded = true;
      this.cleanUpEmailErrors();
    }
  }

  private isEmailRelatedError(message: string): boolean {
    return message.toLowerCase().includes('email') || 
           message.toLowerCase().includes('correo') || 
           message.toLowerCase().includes('unicidad');
  }

  private isDuplicateError(message: string): boolean {
    return message.toLowerCase().includes('ya existe') || 
           message.toLowerCase().includes('duplicado') ||
           message.toLowerCase().includes('ya registrado') ||
           message.toLowerCase().includes('ya está registrado');
  }

  private ensureGeneralEmailError(): void {
    if (!this.serverErrors['general']) {
      this.serverErrors['general'] = [];
    }
    
    if (!this.serverErrors['general'].includes('Este correo ya está registrado en el sistema')) {
      this.serverErrors['general'].push('Este correo ya está registrado en el sistema');
    }
  }

  private cleanUpEmailErrors(): void {
    this.serverErrors['general'] = this.serverErrors['general']?.filter(
      msg => !(msg.toLowerCase().includes('email') || msg.toLowerCase().includes('correo')) || 
      msg === 'Este correo ya está registrado en el sistema'
    ) || [];
  }

  // Helpers para reducir duplicación y complejidad
  private clearServerAndDuplicateControlErrors(): void {
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      if (!control || !control.errors) return;
      if (control.hasError('server') || control.hasError('duplicate')) {
        const currentErrors = { ...control.errors } as Record<string, boolean>;
        delete currentErrors['server'];
        delete currentErrors['duplicate'];
        if (Object.keys(currentErrors).length > 0) {
          control.setErrors(currentErrors);
        } else {
          control.setErrors(null);
        }
      }
    });
  }

  private ensureSessionUserFromForm(): void {
    try {
      const v = this.form?.value || {};
      if (v?.email) sessionStorage.setItem('email', v.email);
      sessionStorage.setItem('currentUserClass', 'Visualizador');
      const minimalUser = {
        email: v?.email || '',
        nombre: v?.nombre || 'Usuario',
        username: v?.alias || v?.nombre || 'usuario',
        vip: !!v?.vip
      };
      sessionStorage.setItem('user', JSON.stringify(minimalUser));
    } catch {}
  }

  // Ya no necesitamos persistToken, el backend gestiona los tokens mediante cookies

  private prompt2FAAndNavigate(): void {
    const wants2fa = window.confirm(RegistroVisualizadorComponent.CONFIRM_2FA_MESSAGE);
    if (wants2fa) {
      this.router.navigate(['/2fa'], { state: { allowFa2: true } });
    } else {
      try { window.location.assign('/dashboard'); } catch { this.router.navigate(['/dashboard']); }
    }
  }

  private handleActivationResponse(res: any, source: 'polling' | 'focus'): void {
    if (!res?.activated || this.activationFinalized) return;
    this.stopPollingActivation();
    // Ya no necesitamos persistir el token, el backend lo gestiona mediante cookies
    this.ensureSessionUserFromForm();
    // Si la pestaña está oculta, posponer el diálogo hasta focus/visibility
    if (typeof document !== 'undefined' && document.hidden) {
      this.pendingShow2FA = true;
      this.waitingActivation = false;
      return;
    }
    this.activationFinalized = true;
    this.waitingActivation = false;
    this.prompt2FAAndNavigate();
  }
}
