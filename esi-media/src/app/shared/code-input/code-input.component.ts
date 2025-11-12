import { Component, ElementRef, ViewChildren, QueryList, Output, EventEmitter, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-code-input',
  standalone: true,
  templateUrl: './code-input.component.html',
  styleUrl: './code-input.component.css'
})
export class CodeInputComponent implements AfterViewInit {
  @ViewChildren('input1, input2, input3, input4, input5, input6') 
  inputs!: QueryList<ElementRef>;

  @Output() codeComplete = new EventEmitter<string>();
  @Output() codeChange = new EventEmitter<string>();

  verificationCode: string = '';

  ngAfterViewInit(): void {
    // Enfocar el primer input al cargar
    const firstInput = this.inputs.first;
    if (firstInput) {
      setTimeout(() => firstInput.nativeElement.focus(), 100);
    }
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

  updateVerificationCode(): void {
    const inputElements = this.inputs.toArray();
    this.verificationCode = inputElements
      .map(input => input.nativeElement.value)
      .join('');
    
    this.codeChange.emit(this.verificationCode);
    
    // Si el código está completo (6 dígitos), emitir evento
    if (this.verificationCode.length === 6) {
      this.codeComplete.emit(this.verificationCode);
    }
  }

  clearCode(): void {
    const inputElements = this.inputs.toArray();
    inputElements.forEach(input => {
      input.nativeElement.value = '';
    });
    this.verificationCode = '';
    this.codeChange.emit('');
    
    // Enfocar el primer input
    const firstInput = this.inputs.first;
    if (firstInput) {
      firstInput.nativeElement.focus();
    }
  }

  getCode(): string {
    return this.verificationCode;
  }
}
