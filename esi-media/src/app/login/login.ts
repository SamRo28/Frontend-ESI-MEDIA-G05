import { Component, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UserService } from '../../userService';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {
  loginForm: any;
  email: string = '';
  password: string = '';
  errorMsg: string = '';
  showPassword: boolean = false;
  isBlocked: boolean = false;
  blockTimeRemaining: number = 0;
  private blockTimer: any;

  // Compatibilidad con la plantilla que usa "loginError"
  get loginError(): string { 
    return this.errorMsg; 
  }

  // Propiedad computada para obtener el tiempo formateado
  get formattedBlockTime(): string {
    return this.formatTime(this.blockTimeRemaining);
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  constructor(
    private router: Router, 
    private userService: UserService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnDestroy() {
    if (this.blockTimer) {
      clearInterval(this.blockTimer);
    }
  }

  private formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${seconds} segundo${seconds !== 1 ? 's' : ''}`;
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts: string[] = [];
    
    if (hours > 0) {
      parts.push(`${hours} hora${hours !== 1 ? 's' : ''}`);
    }
    if (minutes > 0) {
      parts.push(`${minutes} minuto${minutes !== 1 ? 's' : ''}`);
    }
    if (secs > 0) {
      parts.push(`${secs} segundo${secs !== 1 ? 's' : ''}`);
    }

    return parts.join(', ');
  }

  onSubmit() {
    if (this.isBlocked) {
      return;
    }

    this.errorMsg = '';
    
    this.userService.login(this.email, this.password).subscribe({
      next: (response) => {
        // Limpiar bloqueo si el login es exitoso
        this.isBlocked = false;
        this.blockTimeRemaining = 0;
        if (this.blockTimer) {
          clearInterval(this.blockTimer);
        }

        sessionStorage.setItem('email', response.usuario.email);
        sessionStorage.setItem('currentUserClass', response.tipo);
        sessionStorage.setItem('user', JSON.stringify(response.usuario));

        if(response.usuario.twoFactorAutenticationEnabled){
           this.router.navigate(['/2verification'], { state: { allowFa2Code: true } });
        }
        else if (!response.twoFactorAutenticationEnabled && response.tipo !== 'Visualizador'){
          this.router.navigate(['/2fa'], { state: { allowFa2: true } });
        }
        else{
          sessionStorage.setItem('token', response.token);
          this.router.navigate(['/dashboard']);
        }
      },
      error: (error) => {
        // Obtener el texto del error correctamente
        let errorText = '';
        
        if (typeof error.error === 'string') {
          errorText = error.error;
        } else if (error.error?.message) {
          errorText = error.error.message;
        } else if (error.message) {
          errorText = error.message;
        } else {
          errorText = '';
        }
        
        // Detectar bloqueo de IP
        const textToSearch = errorText.toLowerCase();
        const isIpBlocked = error.status === 403 && (
          textToSearch.includes('ip ha sido bloqueada') || 
          textToSearch.includes('ip está bloqueada') ||
          textToSearch.includes('demasiados intentos')
        );
        
        if (isIpBlocked) {
          // Extraer el tiempo de bloqueo
          const timeMatch = errorText.match(/(\d+)\s*segundo/i);
          const blockTime = timeMatch ? parseInt(timeMatch[1]) : 60;
          
          this.isBlocked = true;
          this.blockTimeRemaining = blockTime;
          this.errorMsg = `Ha sido bloqueado por demasiados intentos fallidos. Inténtelo de nuevo en ${this.formatTime(blockTime)}.`;
          
          // Iniciar contador regresivo
          this.startBlockTimer();
          
          this.cdr.markForCheck();
          this.cdr.detectChanges();
          
        } else {
          // Resto de la lógica de errores existente
          const backendMsg = errorText || '';
          const lowerMsg = backendMsg.toLowerCase();
          
          if (lowerMsg.includes('bloquead')) {
            this.errorMsg = 'No puede iniciar sesión. Usuario bloqueado';
          } else if (lowerMsg.includes('credenciales inválidas') || lowerMsg.includes('credenciales invalidas')) {
            this.errorMsg = 'No se pudo iniciar sesión. Inténtelo de nuevo.';
          } else if (backendMsg) {
            this.errorMsg = backendMsg; // Mostrar el mensaje original del backend
          } else {
            this.errorMsg = 'Ha habido un problema con su acceso, consulte con su administrador';
          }
          
          this.cdr.detectChanges();
        }
      }
    });
  }

  private startBlockTimer() {
    // Limpiar timer anterior si existe
    if (this.blockTimer) {
      clearInterval(this.blockTimer);
    }

    // Actualizar cada segundo
    this.blockTimer = setInterval(() => {
      this.blockTimeRemaining--;
      
      if (this.blockTimeRemaining > 0) {
        this.errorMsg = `Ha sido bloqueado por demasiados intentos fallidos. Inténtelo de nuevo en ${this.formatTime(this.blockTimeRemaining)}.`;
      } else {
        this.errorMsg = '';
        this.isBlocked = false;
        clearInterval(this.blockTimer);
      }
      
      this.cdr.detectChanges();
    }, 1000);
  }
}