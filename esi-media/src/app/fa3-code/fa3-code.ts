import { Component, ElementRef, ViewChildren, QueryList, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../../userService';

@Component({
  selector: 'app-fa3-code',
  imports: [],
  templateUrl: './fa3-code.html',
  styleUrl: './fa3-code.css'
})
export class Fa3Code implements OnInit {
 @ViewChildren('input1, input2, input3, input4, input5, input6') 
  inputs!: QueryList<ElementRef>;

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
    this.userService.verify3ACode(this.codeId, this.verificationCode).subscribe({
      next: (response) => {
        console.log('Código verificado con éxito:', response);
        this.router.navigate(['/dashboard']);
      }
    });
  }

  resendCode(): void {
    this.userService.send3AVerificationCode(sessionStorage.getItem('email')!).subscribe({
      next: (response) => {
        this.codeId = response.codigoRecuperacionId;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/login']);
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text');
    
    if (pastedData && /^\d{6}$/.test(pastedData)) {
      const inputElements = this.inputs.toArray();
      const digits = pastedData.split('');
      
      digits.forEach((digit, index) => {
        if (inputElements[index]) {
          inputElements[index].nativeElement.value = digit;
        }
      });
      
      // Enfocar el último input
      if (inputElements.length > 0) {
        inputElements[inputElements.length - 1].nativeElement.focus();
      }
      
      this.updateVerificationCode();
    }
  }
}
