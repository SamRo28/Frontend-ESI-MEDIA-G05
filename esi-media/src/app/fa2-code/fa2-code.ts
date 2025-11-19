import { Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../services/userService';
import { CodeInputComponent } from '../shared/code-input/code-input.component';

@Component({
  selector: 'app-fa2-code',
  imports: [CodeInputComponent],
  templateUrl: './fa2-code.html',
  styleUrl: './fa2-code.css'
})
export class Fa2Code {
  @ViewChild(CodeInputComponent) codeInput!: CodeInputComponent;
  
  verificationCode: string = '';

  constructor(private router: Router, private userService: UserService) {}

  onCodeChange(code: string): void {
    this.verificationCode = code;
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
        let user = JSON.parse(sessionStorage.getItem('user') || '{}');
        if(user.threeFactorAutenticationEnabled){
          this.router.navigate(['/3verification'], { state: { allowFa3Code: true } });
          return;
        }
        else{
          // El token ya está en la cookie HttpOnly, no necesitamos guardarlo
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err: any) => {
        console.error('Error verificando 2FA:', err);
        alert('Código inválido o error en el servidor. Revisa el código e inténtalo de nuevo.');
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/login']);
  }
}
