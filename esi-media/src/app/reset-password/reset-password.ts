import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../userService';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrls: ['./reset-password.css']
})
export class ResetPasswordComponent implements OnInit {
  token = '';
  loading = true;
  valid = false;
  error = '';
  success = '';
  password = '';
  confirm = '';
  isSaving = false;
  showPwd = false;
  showPwd2 = false;

  // Validacion de contrasena en tiempo real
  rules = {
    minLength: false,
    hasUpper: false,
    hasLower: false,
    hasNumber: false,
    hasSpecial: false,
    noPersonalData: true,
    noControlChars: true,
    noEdgeSpaces: true,
    match: false
  };
  allValid = false;
  showPolicy = false;

  constructor(private route: ActivatedRoute, private userService: UserService, private router: Router) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.loading = false;
      this.valid = false;
      this.error = 'El enlace no es valido o ha caducado';
      return;
    }
    // Fallback por si la validacion tarda demasiado
    const fallback = setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        this.valid = false;
        this.error = 'El enlace no es valido o ha caducado';
      }
    }, 7000);

    this.userService.validateResetToken(this.token).subscribe({
      next: (res: any) => {
        clearTimeout(fallback);
        this.valid = !!res?.valid;
        this.loading = false;
        if (!this.valid) this.error = 'El enlace no es valido o ha caducado';
      },
      error: () => {
        clearTimeout(fallback);
        this.valid = false;
        this.loading = false;
        this.error = 'El enlace no es valido o ha caducado';
      }
    });
  }

  submit(): void {
    if (!this.valid || this.loading) return;
    this.updateValidation();
    if (!this.rules.match) {
      this.showPolicy = true;
      this.error = 'No se pudo guardar la contrasena. Intentalo de nuevo y verifica la politica de seguridad.';
      return;
    }
    if (!this.allValid) {
      this.showPolicy = true;
      this.error = 'No se pudo guardar la contrasena. Intentalo de nuevo y verifica la politica de seguridad.';
      return;
    }
    this.error = '';
    this.isSaving = true;
    let toSend = (this.password || '').trim();
    try {
      toSend = (toSend as any).normalize ? (toSend as any).normalize('NFC') : toSend;
    } catch {}
    this.userService.resetPassword(this.token, toSend).subscribe({
      next: () => {
        this.isSaving = false;
        this.router.navigate(['/login']);
      },
      error: () => {
        this.isSaving = false;
        this.error = 'No se pudo guardar la contrasena. Intentalo de nuevo y verifica la politica de seguridad.';
      }
    });
  }

  onInputChange(): void {
    this.updateValidation();
    this.showPolicy = (this.password?.length > 0) || (this.confirm?.length > 0);
  }

  onFocus(): void {
    this.showPolicy = true;
  }

  togglePwd1(): void { this.showPwd = !this.showPwd; }
  togglePwd2(): void { this.showPwd2 = !this.showPwd2; }

  private updateValidation(): void {
    const pwd = this.password || '';
    const confirm = this.confirm || '';
    this.rules.minLength = pwd.length >= 8;
    this.rules.hasUpper = /[A-Z]/.test(pwd);
    this.rules.hasLower = /[a-z]/.test(pwd);
    this.rules.hasNumber = /[0-9]/.test(pwd);
    this.rules.hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pwd);
    this.rules.noPersonalData = this.noPersonalTerms(pwd);
    this.rules.noControlChars = !(/[\u0000-\u001F\u007F-\u009F]/.test(pwd));
    this.rules.noEdgeSpaces = (pwd === pwd.trim());
    this.rules.match = pwd.length > 0 && pwd === confirm;
    this.allValid = this.rules.minLength && this.rules.hasUpper && this.rules.hasLower && this.rules.hasNumber && this.rules.hasSpecial && this.rules.noPersonalData && this.rules.noControlChars && this.rules.noEdgeSpaces && this.rules.match;
  }

  private noPersonalTerms(pwd: string): boolean {
    const p = (pwd || '').toLowerCase();
    // Intento de obtener datos basicos del usuario desde sessionStorage (si existen)
    let tokens: string[] = ['esimedia', 'password', 'contrasena', 'usuario', 'admin'];
    try {
      const userStr = sessionStorage.getItem('user');
      if (userStr) {
        const u = JSON.parse(userStr);
        if (u?.nombre) tokens.push(String(u.nombre).toLowerCase());
        if (u?.apellidos) tokens.push(String(u.apellidos).toLowerCase());
        if (u?.username) tokens.push(String(u.username).toLowerCase());
        if (u?.email) {
          const local = String(u.email).toLowerCase().split('@')[0];
          tokens.push(local);
        }
      } else {
        const email = sessionStorage.getItem('email');
        if (email) tokens.push(String(email).toLowerCase().split('@')[0]);
      }
    } catch {}
    // Filtrar tokens muy cortos
    tokens = tokens.filter(t => t && t.length >= 3);
    return !tokens.some(t => p.includes(t));
  }
}
