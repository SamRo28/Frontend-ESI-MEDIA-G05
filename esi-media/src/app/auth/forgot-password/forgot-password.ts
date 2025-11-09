import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../../../../src/userService';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.css']
})
export class ForgotPasswordComponent {
  email: string = '';
  message: string = '';
  error: string = '';

  constructor(private userService: UserService, private router: Router) {}

  submit() {
    this.message = '';
    this.error = '';
    const frontendUrl = window.location.origin; // enviar la URL del frontend para construir el enlace
    this.userService.forgotPassword(this.email, frontendUrl).subscribe({
      next: () => {
        this.message = 'Si existe una cuenta asociada al correo se ha enviado un email con instrucciones.';
      },
      error: (err) => {
        console.error('Error forgotPassword', err);
        this.error = 'No se pudo enviar la solicitud. Inténtalo de nuevo más tarde.';
      }
    });
  }
}
