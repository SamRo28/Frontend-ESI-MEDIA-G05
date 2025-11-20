import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AdminService } from '../services/admin.service';
import { environment } from '../../environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { timeout, finalize } from 'rxjs';
import { UserService } from '../services/userService';
import { PasswordValidatorComponent } from '../shared/components/password-validator/password-validator.component';
import { PasswordValidation } from '../services/user-validation.service';


@Component({
  selector: 'app-perfil-visualizador',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PasswordValidatorComponent],
  templateUrl: './perfil-visualizador.html',
  styleUrls: ['./perfil-visualizador.css'] // Asegúrate que esta línea esté presente
})
export class PerfilVisualizadorComponent implements OnInit {
  loading = false;
  errorMessage = '';
  successMessage = '';
  showConfirm = false;
  showDeleteConfirm = false; // Para el nuevo modal de borrado
  isDeleting = false; // Para el estado del botón de borrado
  activeSection: 'info' | 'suscripcion' | 'seguridad' | 'dispositivos' = 'info';

  // Datos
  userId: string | null = null;
  email: string = '';
  // Ya no necesitamos el authToken, las cookies lo gestionan automáticamente
  form = {
    nombre: '', apellidos: '', alias: '', fechaNacimiento: '', foto: '', vip: false,
    currentPassword: '', newPassword: '', repeatPassword: ''
  };
  originalForm: any = null;

  // Política unificada + reglas adicionales locales
  pwPolicy?: PasswordValidation;
  pwPolicyValid = false;
  passwordRules = { minLength: false, upper: false, lower: false, number: false, special: false, match: true, noPersonal: true, notCurrent: true };

  // Avatares
  availableAvatars: string[] = ['perfil1.png', 'perfil2.png', 'perfil3.png', 'perfil4.png'];

  // Cambio de contraseña
  passwordVerified = false;
  verifyingPassword = false;
  passwordCheckError = '';
  passwordChangeError = '';
  passwordVisibility: { [key: string]: boolean } = {
    current: false,
    new: false,
    repeat: false
  };


  passwordCheckOk = '';

  // Rol
  rol: string = 'Visualizador';

  // Suscripción
  subLoading = false;
  subError = '';
  subSuccess = '';
  showSubConfirm = false;
  pendingVip: boolean | null = null;
  lastSubscriptionChange?: string;
  subscriberSince?: string | null;
  accountAgeLabel?: string | null;
  selectedPlan: 'STD' | 'VIP' | null = null;
  get isVip(): boolean { return !!this.form.vip; }
  vipBenefits: string[] = ['Contenido VIP', 'Novedades destacadas', 'Mejor experiencia'];
  stdFeatures: string[] = ['Acceso al catalogo estandar', 'Hasta 2 dispositivos a la vez', '2 descargas', 'TV, ordenador, movil, tableta'];
  vipFeatures: string[] = ['Acceso a contenido VIP', 'Hasta 4 dispositivos a la vez', '6 descargas', 'Novedades destacadas'];
  stdDesc: string = 'Acceso al catalogo estandar, reproduccion fluida y sin complicaciones.';
  vipDesc: string = 'Mas dispositivos simultaneos y acceso a contenido VIP y novedades.';
  stdNotes: string[] = ['Cambios reversibles', 'Podras volver a VIP', 'Sin permanencia'];

  constructor(
    private readonly adminService: AdminService,
    private readonly http: HttpClient,
    @Inject(PLATFORM_ID) private readonly platformId: Object,
    private readonly cdr: ChangeDetectorRef,
    private readonly userService: UserService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) { }

  private getAuthContext(): void {
    // Solo necesitamos información del usuario, las cookies gestionan la autenticación
    try {
      const lsUserRaw = localStorage.getItem('currentUser');
      const ssUserRaw = sessionStorage.getItem('user');
      
      if (lsUserRaw) {
        const u = JSON.parse(lsUserRaw);
        this.userId = u?.id || u?._id || null;
        this.email = u?.email || this.email;
        return;
      }
      if (ssUserRaw) {
        const u = JSON.parse(ssUserRaw);
        this.userId = u?.id || u?._id || null;
        this.email = u?.email || this.email;
        return;
      }
      // Fallbacks si nada consistente encontrado
      const raw = sessionStorage.getItem('user') || localStorage.getItem('currentUser');
      if (raw) {
        const u = JSON.parse(raw);
        this.userId = u?.id || u?._id || null;
        this.email = u?.email || '';
      }
    } catch {
      }
    
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.getAuthContext();
      
      // Manejar navegación por fragment (ej. #suscripcion)
      this.route.fragment.subscribe((fragment: string | null) => {
        if (fragment === 'suscripcion') {
          this.activeSection = 'suscripcion';
        }
      });
    }
    if (this.userId) {
      this.loading = true;
      this.adminService.getUserById(this.userId).subscribe({
        next: (u: any) => {
          this.email = u?.email || this.email;
          this.form.nombre = u?.nombre || '';
          this.form.apellidos = u?.apellidos || '';
          this.form.alias = u?.alias || '';
          const fn = u?.fechanac || u?.fechaNacimiento || null;
          if (fn) {
            const d = new Date(fn);
            if (!isNaN(d.getTime())) this.form.fechaNacimiento = this.toDateInputValue(d);
          }
          this.form.foto = typeof u?.foto === 'string' ? u.foto : '';
          this.form.vip = !!u?.vip;
          // Para "Suscriptor desde", usamos la fecha de registro original.
          const registrationDate = (u?.fechaRegistro || u?.fechaAlta || u?.createdAt || null);
          if (registrationDate) {
            const dReg = new Date(registrationDate);
            if (!isNaN(dReg.getTime())) {
              this.subscriberSince = dReg.toLocaleDateString('es-ES');
              this.accountAgeLabel = this.computeAccountAgeLabel(dReg);
            }
          }
          this.captureOriginal();
          this.loading = false;
          this.loadSubscription();
          this.cdr.detectChanges(); // <-- Forzar detección de cambios
        },
        error: () => {
          this.loading = false;
          this.errorMessage = 'No se pudo cargar el perfil';
        }
      });
    }
  }

  select(section: 'info' | 'suscripcion' | 'seguridad' | 'dispositivos') {
    this.activeSection = section;
    this.errorMessage = '';
    this.successMessage = '';
  }
  selectAvatar(file: string) { this.form.foto = file; }
  isInternalAvatar(file?: string): boolean { return !!file && /^perfil\\d+\\.png$/i.test(file); }
  getAvatarSrc(file?: string): string { return !file ? '/perfil1.png' : (this.isInternalAvatar(file) ? `/${file}` : file); }
  onFotoInput(value: string) { this.form.foto = value || ''; }

  verifyCurrentPassword(): void {
    if (!this.email || !this.form.currentPassword) {
      this.passwordCheckError = 'Introduce tu contraseña actual';
      this.passwordCheckOk = '';
      return;
    }
    this.passwordCheckError = '';
    this.passwordCheckOk = '';
    this.passwordVerified = false;
    this.verifyingPassword = true;

    this.http
      .post(`${environment.apiUrl}/users/login`, {
        email: this.email,
        password: this.form.currentPassword
      })
      .pipe(
        timeout(7000),
        finalize(() => {
          this.verifyingPassword = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.passwordVerified = true;
          this.passwordCheckOk = 'Contraseña verificada';
          this.cdr.detectChanges();
        },
        error: () => {
          this.passwordVerified = false;
          this.passwordCheckError = 'La contraseña actual no es correcta. Vuelve a intentarlo.';
          this.cdr.detectChanges();
        }
      });
  }

  togglePasswordVisibility(field: 'current' | 'new' | 'repeat'): void {
    this.passwordVisibility[field] = !this.passwordVisibility[field];
  }

  private toDateInputValue(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private computeAccountAgeLabel(registrationDate: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - registrationDate.getTime();
    if (diffMs <= 0) {
      return 'Recién creada';
    }
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 30) {
      return diffDays === 1 ? '1 día' : `${diffDays} días`;
    }
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) {
      return diffMonths === 1 ? '1 mes' : `${diffMonths} meses`;
    }
    const diffYears = Math.floor(diffMonths / 12);
    return diffYears === 1 ? '1 año' : `${diffYears} años`;
  }
  private captureOriginal(): void { this.originalForm = { ...this.form }; }
  private restoreOriginal(): void {
    if (this.originalForm) this.form = { ...this.form, ...this.originalForm };
    this.passwordVerified = false;
    this.verifyingPassword = false;
    this.form.currentPassword = '';
    this.form.newPassword = '';
    this.form.repeatPassword = '';
    this.passwordCheckError = '';
    this.passwordCheckOk = '';
    this.errorMessage = '';
    this.successMessage = '';
    this.showConfirm = false;
  }

  attemptPasswordChange(): void {
    // Este método ahora se encarga de todo el flujo de cambio de contraseña
    this.passwordChangeError = '';
    this.successMessage = '';
    this.errorMessage = '';

    // Usar la política unificada para validar todo excepto 'notCurrent'
    const passwordRulesValid = this.pwPolicyValid && this.passwordRules.notCurrent;

    // Validar que la contraseña actual fue verificada
    if (!this.passwordVerified) {
      this.passwordChangeError = 'Debes verificar tu contraseña actual primero.';
      return;
    }

    // Validar que la nueva contraseña cumple las reglas
    if (!passwordRulesValid) {
      this.passwordChangeError = 'La nueva contraseña no cumple con todos los requisitos de seguridad. Por favor, revísala.';
      return;
    }

    // Si todo es válido, procedemos a llamar a la API
    this.loading = true;
    this.cdr.detectChanges();

    const payload = { contrasenia: this.form.newPassword };

    this.adminService.updateUser(this.userId!, payload, 'Visualizador').subscribe({
      next: () => {
        this.handlePasswordChangeSuccess();
      },
      error: (err) => {
        this.handlePasswordChangeError(err);
      }
    });
  }

  private handlePasswordChangeSuccess(): void {
    this.loading = false;
    this.successMessage = 'Contraseña actualizada correctamente.';
    this.passwordChangeError = '';

    // Limpiar campos y resetear estado
    setTimeout(() => {
      this.successMessage = '';
      this.form.currentPassword = '';
      this.form.newPassword = '';
      this.form.repeatPassword = '';
      this.passwordVerified = false;
      this.passwordCheckOk = '';
      this.cdr.detectChanges();
    }, 2500);
  }

  private handlePasswordChangeError(err: any): void {
    this.loading = false;
    const backendMsg = (err?.error?.mensaje || err?.error?.message) || 'Error desconocido.';
    this.passwordChangeError = backendMsg !== 'Error interno del servidor'
      ? backendMsg
      : 'La nueva contraseña no cumple con las políticas de seguridad.';
    this.cdr.detectChanges();
  }

  onPasswordInput(): void {
    const p = this.form.newPassword || '';
    // Estas flags se mantienen solo para la UI existente: se sincronizarán desde la política cuando llegue el callback
    this.passwordRules.match = !!p && this.form.newPassword === this.form.repeatPassword;
    this.passwordRules.notCurrent = !!p && this.form.newPassword !== this.form.currentPassword; // La lógica se mantiene, pero el mensaje en el HTML será genérico
  }

  // Callbacks de política unificada
  onPwPolicyChange(v: PasswordValidation): void {
    this.pwPolicy = v;
    // Mantener las flags para la UI legada
    this.passwordRules.minLength = v.minLength;
    this.passwordRules.upper = v.hasUpperCase;
    this.passwordRules.lower = v.hasLowerCase;
    this.passwordRules.number = v.hasNumber;
    this.passwordRules.special = v.hasSpecialChar;
    this.passwordRules.noPersonal = v.notContainsPersonalData;
    this.passwordRules.match = v.passwordsMatch;
  }
  onPwPolicyValidChange(ok: boolean): void {
    this.pwPolicyValid = ok;
  }

  canSubmit(): boolean { if (this.loading) return false; return true; }
  openConfirm(): void {
    this.errorMessage = '';
    this.successMessage = '';
    // Si se está intentando cambiar la contraseña, no abrir este modal.
    // El flujo de contraseña es independiente.
    if (this.form.newPassword) {
      this.errorMessage = 'Usa la sección de "Contraseña" para cambiar tu contraseña.';
      return;
    }
    if (!this.userId) { this.errorMessage = 'No se pudo identificar al usuario'; return; }
    this.showConfirm = true;
  }
  cancelConfirm(): void { this.showConfirm = false; }

  save(): void {
    if (!this.userId || this.loading) return;
    this.showConfirm = false;
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Construir el payload con los datos del formulario
    const userData: any = {
      nombre: this.form.nombre?.trim() || '',
      apellidos: this.form.apellidos?.trim() || '',
      alias: this.form.alias?.trim() || '',
      fechanac: this.form.fechaNacimiento || null,
      foto: this.form.foto || null,
      vip: !!this.form.vip
    };

    // Realizar la llamada a la API
    this.adminService.updateUser(this.userId!, userData, 'Visualizador').subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'Perfil actualizado correctamente.';

        this.captureOriginal();
        this.cdr.detectChanges();

        // Limpiamos el mensaje de éxito después de un tiempo
        setTimeout(() => { this.successMessage = ''; this.cdr.detectChanges(); }, 3000);
      },
      error: (err: any) => {
        this.loading = false;
        const backendMsg: string = (err?.error && (err.error.mensaje || err.error.message)) || err?.message || '';

        // Mensajes de fallback por si el backend devuelve un error genérico
        const fallbackProfileMsg = 'No se pudo actualizar el perfil. Inténtalo de nuevo más tarde.';
        this.errorMessage =
            backendMsg && backendMsg !== 'Error interno del servidor'
              ? backendMsg
              : fallbackProfileMsg;
        this.cdr.detectChanges();
      }
    });
  }

  // =================== SUSCRIPCION ===================
  loadSubscription(): void {
    if (!this.userId) return;
    const url = `${environment.apiUrl}/users/${this.userId}/subscription`;
    // El interceptor gestiona automáticamente withCredentials
    this.http.get<{ vip: boolean; fechaCambio?: string }>(url).subscribe({
      next: (res) => {
        if (typeof res?.vip === 'boolean') this.form.vip = !!res.vip;
        this.lastSubscriptionChange = res?.fechaCambio || undefined;
      },
      error: () => { }
    });
  }
  abrirCambioSuscripcion(nuevoVip: boolean): void {
    this.subError = '';
    this.subSuccess = '';
    this.pendingVip = nuevoVip;
    this.showSubConfirm = true;
  }
  cancelarCambioSuscripcion(): void {
    this.showSubConfirm = false;
    this.pendingVip = null;
  }
  selectPlan(plan: 'STD' | 'VIP'): void {
    this.subError = '';
    this.subSuccess = '';
    this.selectedPlan = plan;
  }
  confirmarSeleccion(): void {
    if (this.selectedPlan === null) return;
    const targetVip = this.selectedPlan === 'VIP';
    if (targetVip === !!this.form.vip) {
      this.subError = 'Ya tienes ese plan seleccionado';
      return;
    }
    this.abrirCambioSuscripcion(targetVip);
  }
  confirmarCambioSuscripcion(): void {
  console.debug('[Suscripcion] confirm: id=', this.userId);
  if (!this.userId || this.pendingVip === null || this.subLoading) return;

  this.subError = '';
  this.subSuccess = '';
  this.subLoading = true;

  const url = `${environment.apiUrl}/users/${this.userId}/subscription`;
  // El interceptor gestiona automáticamente withCredentials

  this.http.put<{ vip: boolean; fechaCambio?: string }>(url, { vip: this.pendingVip }).pipe(
    timeout(10000),
    finalize(() => {
      // Esto se ejecutará siempre, al completar o al dar error.
      this.subLoading = false;
      this.cdr.detectChanges(); // Asegura que la UI se actualice
    })
  ).subscribe({
      next: (res) => {
        // La operación tuvo éxito, ahora cerramos el modal y actualizamos datos.
        this.showSubConfirm = false;
        this.form.vip = !!res?.vip;
        this.lastSubscriptionChange = res?.fechaCambio || new Date().toISOString();
        if (this.originalForm) this.originalForm.vip = this.form.vip;
        this.subSuccess = 'Suscripcion actualizada correctamente';

        // Ocultar el mensaje de éxito después de unos segundos
        setTimeout(() => {
          this.subSuccess = '';
          this.cdr.detectChanges();
        }, 3000);

        // Forzamos la recarga de los datos de suscripción y la detección de cambios
        this.loadSubscription();
        this.cdr.detectChanges();
      },
      error: () => {
        this.subError = 'No se pudo actualizar la suscripcion';
      }
    });
  }

  /**
   * Inicia el proceso de eliminación de la cuenta del usuario.
   * Muestra una confirmación antes de proceder.
   */
   handleDeleteAccount(): void {
    this.showDeleteConfirm = true;
  }

  /**
   * Cancela la eliminación de la cuenta y cierra el modal.
   */
  cancelDeleteAccount(): void {
    this.showDeleteConfirm = false;
    this.isDeleting = false;
  }

  /**
   * Confirma y ejecuta la eliminación de la cuenta.
   */
  confirmDeleteAccount(): void {
    this.isDeleting = true;
    this.userService.deleteMyAccount().subscribe({
      next: () => {
        alert('Tu cuenta ha sido eliminada correctamente.');
        // Limpiar información del usuario en el cliente
        try {
          sessionStorage.removeItem('user');
          sessionStorage.removeItem('currentUserClass');
          sessionStorage.removeItem('email');
          localStorage.removeItem('currentUser');
        } catch {}
        // Redirigir a la página de inicio
        this.router.navigate(['/home']);
      },
      error: (err: any) => {
  console.error('Error al eliminar la cuenta:', err);

  const backendMsg: string = err?.error?.mensaje || err?.error?.message || '';

  // Caso especial: backend indica que no está autorizado -> falta activar 2FA
  if (err?.status === 403 && backendMsg === 'No autorizado para eliminar la cuenta') {
    alert('Para eliminar tu cuenta necesitas tener activado el segundo factor de autenticación (2FA). Te llevamos a la página de activación.');
    this.cancelDeleteAccount();
    // Ir a la página de activación 2FA respetando el guard
    this.router.navigate(['/2fa'], { state: { allowFa2: true, returnUrl: '/perfil' } });
    return;
  }

  // Resto de errores: genérico
  const message = backendMsg || 'No se pudo eliminar la cuenta. Inténtalo de nuevo más tarde.';
  alert(`Error: ${message}`);
  this.cancelDeleteAccount();
}

    });
  }

  cancelar() { this.restoreOriginal(); }
}
