import { Component, ElementRef, ViewChildren, QueryList } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../../userService';
@Component({
  selector: 'app-fa2-code',
  imports: [],
  templateUrl: './fa2-code.html',
  styleUrl: './fa2-code.css'
})
export class Fa2Code {
@ViewChildren('input1, input2, input3, input4, input5, input6') 
  inputs!: QueryList<ElementRef>;

  verificationCode: string = '';

  constructor(private router: Router, private userService: UserService) {}

  onInput(event: any, current: HTMLInputElement, next: HTMLInputElement | null): void {
    const value = event.target.value;
    
    // Solo permitir números
    if (!/^\d*$/.test(value)) {
      event.target.value = '';
      return;
    }

    // Si hay valor y hay siguiente input, enfocar el siguiente
    if (value && next) {
      next.focus();
    }

    // Actualizar el código completo
    this.updateVerificationCode();
  }

  onKeyDown(event: KeyboardEvent, prev: HTMLInputElement | null, current: HTMLInputElement): void {
    // Si presiona backspace y el campo actual está vacío, ir al anterior
    if (event.key === 'Backspace' && !current.value && prev) {
      prev.focus();
      event.preventDefault();
    }

    // Si presiona una tecla que no es número, backspace, tab o flechas, prevenir
    if (!/^\d$/.test(event.key) && 
        event.key !== 'Backspace' && 
        event.key !== 'Tab' && 
        event.key !== 'ArrowLeft' && 
        event.key !== 'ArrowRight') {
      event.preventDefault();
    }
  }

  updateVerificationCode(): void {
    const inputElements = this.inputs.toArray();
    this.verificationCode = inputElements
      .map(input => input.nativeElement.value)
      .join('');
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
        sessionStorage.setItem('token', res.sesionstoken.token);
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
