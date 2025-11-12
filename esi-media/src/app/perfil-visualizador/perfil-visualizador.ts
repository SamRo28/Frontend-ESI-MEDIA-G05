import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService } from '../services/admin.service';

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
  email = '';

  form = {
    nombre: '',
    apellidos: '',
    alias: '',
    fechaNacimiento: '', // yyyy-MM-dd
    foto: '',
    vip: false,
    newPassword: '',
    repeatPassword: ''
  };

  // Validación en tiempo real
  passwordRules = {
    minLength: false,
    upper: false,
    lower: false,
    number: false,
    special: false,
    match: true
  };

  rol: string = 'Visualizador';

  constructor(
    private readonly adminService: AdminService,
    @Inject(PLATFORM_ID) private readonly platformId: Object
  ) {}

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
          this.rol = u?.rol || this.rol;
          this.loading = false;
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

  private toDateInputValue(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  onPasswordInput(): void {
    const p = this.form.newPassword || '';
    this.passwordRules.minLength = p.length >= 8 && p.length <= 64;
    this.passwordRules.upper = /[A-Z]/.test(p);
    this.passwordRules.lower = /[a-z]/.test(p);
    this.passwordRules.number = /\d/.test(p);
    this.passwordRules.special = /[^A-Za-z0-9]/.test(p);
    this.passwordRules.match = this.form.newPassword === this.form.repeatPassword;
  }

  canSubmit(): boolean {
    if (this.loading) return false;
    // validación básica de nombre/apellidos longitudes
    if (this.form.nombre.length > 80 || this.form.apellidos.length > 120 || this.form.alias.length > 80) return false;
    // fecha válida (si se indica)
    if (this.form.fechaNacimiento) {
      const d = new Date(this.form.fechaNacimiento);
      if (isNaN(d.getTime())) return false;
    }
    // si hay contraseña, validar reglas
    if (this.form.newPassword || this.form.repeatPassword) {
      this.onPasswordInput();
      const ok = this.passwordRules.minLength && this.passwordRules.upper && this.passwordRules.lower && this.passwordRules.number && this.passwordRules.special && this.passwordRules.match;
      if (!ok) return false;
    }
    return true;
  }

  openConfirm(): void {
    this.errorMessage = '';
    this.successMessage = '';
    if (!this.userId) {
      this.errorMessage = 'No se pudo identificar al usuario';
      return;
    }
    if (!this.canSubmit()) {
      this.errorMessage = 'Revisa los campos antes de guardar';
      return;
    }
    this.showConfirm = true;
  }

  cancelConfirm(): void {
    this.showConfirm = false;
  }

  save(): void {
    if (!this.userId) return;
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

    if (this.form.newPassword) {
      userData.contrasenia = this.form.newPassword;
    }

    this.adminService.updateUser(this.userId, userData, 'Visualizador').subscribe({
      next: () => {
        this.loading = false;
        this.showConfirm = false;
        this.successMessage = 'Perfil actualizado correctamente';
      },
      error: (err) => {
        this.loading = false;
        this.showConfirm = false;
        const msg = err?.error?.mensaje || err?.message || 'No se pudo actualizar el perfil';
        this.errorMessage = msg;
      }
    });
  }
}
