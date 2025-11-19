import { Component, ViewChild, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../services/userService';
import { CodeInputComponent } from '../shared/code-input/code-input.component';

@Component({
  selector: 'app-fa3-code',
  imports: [CodeInputComponent],
  templateUrl: './fa3-code.html',
  styleUrl: './fa3-code.css'
})
export class Fa3Code implements OnInit {
  @ViewChild(CodeInputComponent) codeInput!: CodeInputComponent;
  
  verificationCode: string = '';
  codeId: string = '';

  constructor(private router: Router, private userService: UserService) {}
  
  ngOnInit(): void {
    this.userService.send3AVerificationCode(sessionStorage.getItem('email')!).subscribe({
      next: (response) => {
        this.codeId = response.codigoRecuperacionId;
        console.log('Código de verificación 3A enviado:', response);
      }
    });
  }

  onCodeChange(code: string): void {
    this.verificationCode = code;
  }

  verifyCode(): void {
    this.userService.verify3ACode(this.codeId, this.verificationCode).subscribe({
      next: (response) => {
        let tipoUsuario = sessionStorage.getItem('currentUserClass');
        // El token ya está en la cookie HttpOnly, no necesitamos guardarlo

        if(tipoUsuario === 'Visualizador'){
          this.router.navigate(['/dashboard']);
          return;
        }
        else if (tipoUsuario === 'Administrador'){
          this.router.navigate(['/admin-dashboard']);
          return;
        }
        else{
          this.router.navigate(['/gestor-dashboard']);
        }
      }
    });
  }

  resendCode(): void {
    this.userService.send3AVerificationCode(sessionStorage.getItem('email')!).subscribe({
      next: (response) => {
        this.codeId = response.codigoRecuperacionId;
        // Limpiar el input de código
        if (this.codeInput) {
          this.codeInput.clearCode();
        }
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/login']);
  }
}
