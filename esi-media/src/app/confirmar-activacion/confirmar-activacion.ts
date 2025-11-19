import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { VisualizadorService } from '../services/visualizador.service';

@Component({
  selector: 'app-confirmar-activacion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmar-activacion.html',
  styleUrls: ['./confirmar-activacion.css']
})
export class ConfirmarActivacionComponent implements OnInit {
  estado: 'procesando' | 'ok' | 'error' = 'procesando';
  mensaje = 'Activando tu cuenta...';

  constructor(private svc: VisualizadorService, private router: Router) {}

  ngOnInit(): void {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) {
      this.estado = 'error';
      this.mensaje = 'Token de activación no encontrado';
      return;
    }

    this.svc.activarCuenta(token).subscribe({
      next: (res) => {
        // El token ya está en la cookie HttpOnly, no necesitamos guardarlo
        this.estado = 'ok';
        this.mensaje = 'Cuenta activada correctamente.';
        setTimeout(() => {
          const wants2fa = window.confirm('Cuenta activada. ¿Deseas activar 2FA ahora?');
          if (wants2fa) {
            this.router.navigate(['/2fa'], { state: { allowFa2: true } });
          } else {
            this.router.navigate(['/dashboard']);
          }
        }, 800);
      },
      error: () => {
        this.estado = 'error';
        this.mensaje = 'El enlace de activación no es válido o ha expirado.';
      }
    });
  }
}
