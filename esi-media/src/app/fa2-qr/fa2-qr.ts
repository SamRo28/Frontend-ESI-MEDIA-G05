import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UserService } from '../../userService';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';

@Component({
  selector: 'app-fa2-qr',
  imports: [CommonModule, FormsModule],
  templateUrl: './fa2-qr.html',
  styleUrl: './fa2-qr.css'
})
export class Fa2Qr implements OnInit {

    // URL del código QR generado por el backend (trusted)
    qrCodeUrl: SafeUrl | string = '';
    // URL cruda para pruebas (enlace clickable)
    rawQrUrl: string = '';
    // Control de estado de carga de la imagen
    qrVisible: boolean = false;
    qrLoadError: string | null = null;
  
  // Clave secreta para entrada manual
  secretKey: string = '';
  
  // Código de verificación ingresado por el usuario
  verificationCode: string = '';
  
  // Estado del botón de copiar
  isCopied: boolean = false;

  constructor(private userService: UserService, private sanitizer: DomSanitizer, private cdr: ChangeDetectorRef, private router: Router) { }

  ngOnInit(): void {
    // Aquí llamarías a tu servicio para obtener el QR y la clave secreta
    this.loadQRCode();
  }

  loadQRCode(): void {
    this.userService.loadQRCode().subscribe({
      next: (data: any) => {
        // El backend devuelve { mensaje: "<url>" }
        const mensaje = data?.mensaje;
        if (mensaje) {
          // Guardar la URL cruda para pruebas (enlace)
          this.rawQrUrl = mensaje.toString();
          // Angular puede bloquear URLs externas; marcaremos la URL como segura
          const sanitized = this.sanitizer.bypassSecurityTrustUrl(this.rawQrUrl);
          console.log('QR URL (raw):', this.rawQrUrl);
          console.log('QR URL (sanitized):', sanitized);
          // Reset load state: ocultar imagen hasta que termine la carga
          this.qrVisible = false;
          this.qrLoadError = null;
          this.qrCodeUrl = sanitized;
          // Forzar actualización de la vista en caso de que el cambio no se detecte automáticamente
          this.cdr.detectChanges();
        } else {
          console.warn('Respuesta inesperada al cargar QR:', data);
        }
      },
      error: (err: any) => {
        console.error('Error al cargar el QR:', err);
      }
    });
  }

  onQrLoad(): void {
    console.log('QR image loaded successfully');
    this.qrVisible = true;
  this.cdr.detectChanges();
  }

  onQrError(event: any): void {
    console.error('QR image failed to load', event);
    this.qrVisible = false;
    this.qrLoadError = event?.type ? `Error: ${event.type}` : 'Unknown error loading QR image';
  this.cdr.detectChanges();
  }

  copySecretKey(): void {
    // Copiar al portapapeles
    navigator.clipboard.writeText(this.secretKey).then(() => {
      this.isCopied = true;
      setTimeout(() => {
        this.isCopied = false;
      }, 2000);
    }).catch(err => {
      console.error('Error al copiar:', err);
    });
  }

  verifyCode(): void {
    const email = sessionStorage.getItem('email') || '';

  if (!email) {
    alert('No se encontró el correo del usuario. Inicia sesión de nuevo e inténtalo otra vez.');
    return;
  }

  if (!this.verificationCode || this.verificationCode.trim() === '') {
    alert('Introduce el código de verificación antes de enviar.');
    return;
  }

  console.log('Verificando código:', this.verificationCode, 'para', email);

  this.userService.verify2FACode(email, this.verificationCode).subscribe({
    next: (res: any) => {

      if(sessionStorage.getItem('currentUserClass') !== 'visualizador'){
          this.router.navigate(['3verification'], { state: { allowFa3Code: true }
          });
      }
      else{
        const wants2fa = window.confirm('Registro completado. ¿Deseas activar la autenticación en 2 pasos (2FA) ahora?');

          if (wants2fa) {
            // Redirigir a la página de configuración de 2FA
            this.router.navigate(['3verification'], { state: { allowFa3Code: true } });
          } else {
            // Si el usuario no quiere 2FA, redirigir a la página principal o login
            // Ajusta la ruta según la estructura de rutas de la aplicación
            this.router.navigate(['/dashboard']);
          }
        }
    },
    error: (err: any) => {
      console.error('Error verificando 2FA:', err);
      alert('Código inválido o error en el servidor. Revisa el código e inténtalo de nuevo.');
    }
  });
  }

}
