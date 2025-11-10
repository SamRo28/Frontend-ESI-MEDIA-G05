import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UserService } from '../../userService';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.css']
})
export class ForgotPasswordComponent {
  email = '';
  submitted = false;
  loading = false;
  message = '';
  errorMsg = '';

  constructor(private userService: UserService) {}

  submit() {
    if (!this.email || this.loading) return;
    this.errorMsg = '';
    this.loading = true;

    this.userService.requestPasswordReset(this.email).subscribe({
      next: () => {
        this.loading = false;
        this.submitted = true;
        this.message = 'Hemos enviado un correo electronico. Sigue las instrucciones para obtener una nueva contrasena.';
      },
      error: () => {
        this.loading = false;
        // Mensaje generico (sin revelar existencia del correo)
        this.errorMsg = 'No hemos podido procesar tu solicitud en este momento. Intentalo de nuevo mas tarde.';
      }
    });
  }
}

