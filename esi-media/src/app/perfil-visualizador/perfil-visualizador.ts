import { Component, OnInit, Inject, PLATFORM_ID, Output, EventEmitter } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService } from '../services/admin.service';
import { HttpClient } from '@angular/common/http';
import { timeout } from 'rxjs';

@Component({
  selector: 'app-perfil-visualizador',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './perfil-visualizador.html',
  styleUrls: ['./perfil-visualizador.css']
})
export class PerfilVisualizadorComponent implements OnInit {
  loading = false;
  errorMessage = '';
  successMessage = '';
  showConfirm = false;
  activeSection: 'info' | 'suscripcion' | 'seguridad' | 'dispositivos' = 'info';

  // Datos originales y de edición
  userId: string | null = null;
  email: string = '';
  form = { nombre: '', apellidos: '', alias: '', fechaNacimiento: '', foto: '', vip: false, currentPassword: '', newPassword: '', repeatPassword: '' };

  originalForm: any = null;

  // Validación en tiempo real
  passwordRules = {
    minLength: false,
    upper: false,
    lower: false,
    number: false,
    special: false,
    match: true,
    noPersonal: true
  };

  // Avatares disponibles (mismo set usado en otras vistas)
  availableAvatars: string[] = [
    'perfil1.png',
    'perfil2.png',
    'perfil3.png',
    'perfil4.png'
  ];

  // Estado de verificación de contraseña actual (para habilitar cambio)
  passwordVerified = false;
  verifyingPassword = false;
  passwordCheckError = '';
  passwordCheckOk = '';

  rol: string = 'Visualizador';

  constructor(
    private readonly adminService: AdminService,
    private readonly http: HttpClient,
    @Inject(PLATFORM_ID) private readonly platformId: Object
  ) {}

  // Permite al padre (visu-dashboard) cerrar la ventana completa tras guardar
  @Output() close = new EventEmitter<void>();

  ngOnInit(): void {
    // Cargar usuario actual desde session/local y luego pedir al backend para datos completos
    if (isPlatformBrowser(this.platformId)) {
      try {
        const raw = sessionStorage.getItem('user') || localStorage.getItem('currentUser');
        if (raw) {
          const u = JSON.parse(raw);
          this.userId = u?.id || u?._id || null;
          this.email = u?.email || '';
        }
      } catch {}
    }

    if (this.userId) {
      this.loading = true;
      this.adminService.getUserById(this.userId).subscribe({
        next: (u: any) => {
          this.email = u?.email || this.email;
          this.form.nombre = u?.nombre || '';
          this.form.apellidos = u?.apellidos || '';
          this.form.alias = u?.alias || '';
          // soportar distintos nombres de campo para fecha
          const fn = u?.fechaNacimiento || u?.fechanac;
          if (fn) {
            const d = new Date(fn);
            if (!isNaN(d.getTime())) {
              this.form.fechaNacimiento = this.toDateInputValue(d);
            }
          }
          this.form.foto = typeof u?.foto === 'string' ? u.foto : '';
          this.form.vip = !!u?.vip;
          
          this.captureOriginal();
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

  selectAvatar(file: string) {
    this.form.foto = file;
  }

  isInternalAvatar(file?: string): boolean {
    if (!file) return false;
    return /^perfil\d+\.png$/i.test(file);
  }

  getAvatarSrc(file?: string): string {
    if (!file) return '/perfil1.png';
    return this.isInternalAvatar(file) ? `/${file}` : file;
  }

  onFotoInput(value: string) {
    this.form.foto = value || '';
  }

  verifyCurrentPassword(): void {
    if (!this.email || !this.form.currentPassword) {
      this.passwordCheckError = 'Introduce tu contraseña actual';
      this.passwordCheckOk = '';
      return;
    }
    this.passwordCheckError = '';
    this.passwordCheckOk = '';
    this.verifyingPassword = true;
    this.http
      .post('http://localhost:8080/users/login', { email: this.email, password: this.form.currentPassword })
      .pipe(timeout(7000))
      .subscribe({
      next: () => {
        this.passwordVerified = true;
        this.verifyingPassword = false;
        this.passwordCheckOk = 'Contraseña verificada';
      },
      error: () => {
        this.verifyingPassword = false;
        this.passwordVerified = false;
        this.passwordCheckError = 'La contraseña actual no es correcta. Vuelve a intentarlo.';
      }
    });
  }

  private toDateInputValue(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private captureOriginal(): void {
    this.originalForm = {
      nombre: this.form.nombre,
      apellidos: this.form.apellidos,
      alias: this.form.alias,
      fechaNacimiento: this.form.fechaNacimiento,
      foto: this.form.foto,
      vip: this.form.vip
    };
  }

  private restoreOriginal(): void {
    if (this.originalForm) {
      this.form.nombre = this.originalForm.nombre || '';
      this.form.apellidos = this.originalForm.apellidos || '';
      this.form.alias = this.originalForm.alias || '';
      this.form.fechaNacimiento = this.originalForm.fechaNacimiento || '';
      this.form.foto = this.originalForm.foto || '';
      this.form.vip = !!this.originalForm.vip;
    }
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
  private hasAnyChange(): boolean {
    const trim = (s?: string) => (s || '').trim();
    const o = this.originalForm || {};
    if (trim(this.form.nombre) !== trim(o.nombre)) return true;
    if (trim(this.form.apellidos) !== trim(o.apellidos)) return true;
    if (trim(this.form.alias) !== trim(o.alias)) return true;
    if ((this.form.fechaNacimiento || '') !== (o.fechaNacimiento || '')) return true;
    if ((this.form.foto || '') !== (o.foto || '')) return true;
    if (!!this.form.vip !== !!o.vip) return true;
    const np = trim(this.form.newPassword);
    const rp = trim(this.form.repeatPassword);
    return !!np || !!rp;
  }

  onPasswordInput(): void {
    const p = this.form.newPassword || '';
    this.passwordRules.minLength = p.length >= 8 && p.length <= 64;
    this.passwordRules.upper = /[A-Z]/.test(p);
    this.passwordRules.lower = /[a-z]/.test(p);
    this.passwordRules.number = /\d/.test(p);
    this.passwordRules.special = /[^A-Za-z0-9]/.test(p);
    this.passwordRules.match = this.form.newPassword === this.form.repeatPassword;

    // Regla: no contener datos personales (nombre, apellidos, alias, email local)
    const normalize = (s?: string) => (s || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
    const pwd = normalize(this.form.newPassword);
    const tokens: string[] = [];
    const nombre = normalize(this.form.nombre);
    const apellidos = normalize(this.form.apellidos);
    const alias = normalize(this.form.alias);
    const emailLocal = normalize((this.email || '').split('@')[0]);
    if (nombre) tokens.push(nombre);
    if (apellidos) tokens.push(apellidos);
    if (alias) tokens.push(alias);
    if (emailLocal) tokens.push(emailLocal);
    // filtrar tokens muy cortos para evitar falsos positivos
    const relevant = tokens.filter(t => t && t.length >= 3);
    this.passwordRules.noPersonal = !relevant.some(t => pwd.includes(t));
  }

  canSubmit(): boolean {
  if (this.loading) return false;
  return this.hasAnyChange();
}

openConfirm(): void {
  this.errorMessage = '';
  this.successMessage = '';
  // Asegurar que no haya estados de carga previos que bloqueen Confirmar
  this.loading = false;
  if (!this.userId) { this.errorMessage = 'No se pudo identificar al usuario'; return; }
  this.showConfirm = true;
}

  cancelConfirm(): void {
    this.showConfirm = false;
  }
  onCloseRequested(): void { this.restoreOriginal(); this.close.emit(); }

  save(): void {
    if (this.loading) return;
    // Cerrar confirmación y preparar guardado
    this.showConfirm = false;
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    // Construir payload solo con campos permitidos
    const userData: any = {
      nombre: this.form.nombre?.trim() || '',
      apellidos: this.form.apellidos?.trim() || '',
      alias: this.form.alias?.trim() || '',
      fechanac: this.form.fechaNacimiento || null,
      foto: this.form.foto || null,
      vip: !!this.form.vip
    };

    const doUpdate = () => {
      this.adminService.updateUser(this.userId!, userData, 'Visualizador').subscribe({
        next: () => {
          this.loading = false;
          this.successMessage = 'Perfil actualizado correctamente';
          // limpiar contraseñas del formulario por seguridad
          this.form.currentPassword = '';
          this.form.newPassword = '';
          this.form.repeatPassword = '';
          this.passwordVerified = false;
          this.passwordCheckOk = '';
          
          this.captureOriginal();
        },
        error: (err: any) => {
          this.loading = false;
          const msg = err?.error?.mensaje || err?.message || 'No se pudo actualizar el perfil';
          this.errorMessage = msg;
        }
      });
    };

    // Si quiere cambiar contraseña, debe estar verificada previamente
    if (this.form.newPassword) {
      if (!this.passwordVerified) {
        this.loading = false;
        this.errorMessage = 'Verifica tu contraseña actual antes de cambiarla';
        return;
      }
      userData.contrasenia = this.form.newPassword;
    }

    // Si no cambia contraseña, actualizar directamente
    doUpdate();
  }
}
