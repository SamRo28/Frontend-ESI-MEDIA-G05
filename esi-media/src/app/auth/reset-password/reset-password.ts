import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../../../../src/userService';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reset-password.html',
  styleUrls: ['./reset-password.css']
})
export class ResetPasswordComponent {
  token: string | null = null;
  newPassword: string = '';
  confirmPassword: string = '';
  error: string = '';
  message: string = '';

  constructor(private route: ActivatedRoute, private userService: UserService, private router: Router) {
    this.token = this.route.snapshot.queryParamMap.get('token');
  }

  submit() {
    this.error = '';
    this.message = '';
    if (!this.token) {
      this.error = 'Token no proporcionado.';
      return;
    }
    if (this.newPassword.length < 8) {
      this.error = 'La contraseña debe tener al menos 8 caracteres.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.error = 'Las contraseñas no coinciden.';
      return;
    }

    this.userService.resetPassword(this.token, this.newPassword).subscribe({
      next: () => {
        this.message = 'Contraseña restablecida correctamente.';
        // opcional: redirigir al login
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: (err) => {
        console.error('Reset error', err);
        this.error = (err?.error) || 'El enlace no es válido o ha caducado';
      }
    });
  }
}
