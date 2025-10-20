import { Component, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UserService } from '../../userService';
import { isPlatformBrowser } from '@angular/common';
import { Session } from 'inspector/promises';
import { allowedNodeEnvironmentFlags } from 'process';

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  loginForm: any;
  email: string = '';
  password: string = '';
  errorMsg: string = '';

  constructor(
    private router: Router, 
    private userService: UserService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  onSubmit() {
    console.log('Intentando login con:', { email: this.email, password: this.password });
    this.errorMsg = '';
    
    this.userService.login(this.email, this.password).subscribe({
      next: (response) => {
        // Bloqueo: si el backend devuelve el usuario bloqueado, mostrar error y no continuar
        const usuario = response?.usuario ?? response;
        const bloqueado = usuario?.bloqueado === true || usuario?.isBloqueado === true;
        if (bloqueado) {
          this.errorMsg = 'No puede iniciar sesión. Usuario bloqueado';
          this.cdr.detectChanges();
          return;
        }

        // Persist current user for admin flows (Admin-ID header usage)
        try {
          if (isPlatformBrowser(this.platformId) && usuario) {
            localStorage.setItem('currentUser', JSON.stringify(usuario));
          }
        } catch {}

        sessionStorage.setItem('email', response.email);
        sessionStorage.setItem('currentUserClass', response.tipo);
        
        if(response.usuario.twoFactorAutenticationEnabled){
           this.router.navigate(['/2verification'], { state: { allowFa2Code: true } });
        }
        /*else if (!response.twoFactorAutenticationEnabled && response.tipo !== 'visualizador'){
          this.router.navigate(['/2fa'], { state: { allowFa2: true } });
        }*/
        else{
          if(response.tipo === 'visualizador'){
            this.router.navigate(['/visualizador']);
          }
          else if(response.tipo === 'admin'){
            this.router.navigate(['/admin-dashboard']);
          }
          else if(response.tipo === 'creador'){
            this.router.navigate(['/creador-dashboard']);
          }
          sessionStorage.setItem('token', response.sesionstoken.token);
          this.router.navigate(['/dashboard']);

        }

        
        

      },
      error: (error) => {
        console.error('Login failed:', error);
        console.error('Error details:', error.error);
        console.error('Status:', error.status);
        // Mensajería en caso de error: si detectamos bloqueo desde backend, mostrar mensaje específico
        const backendMsg = (error?.error && (error.error.mensaje || error.error.message || error.error.error)) || '';
        if (String(backendMsg).toLowerCase().includes('bloquead')) {
          this.errorMsg = 'No puede iniciar sesión. Usuario bloqueado';
          this.cdr.detectChanges();
        } else if (error.status === 403 || error.status === 401) {
          // Mensaje genérico para credenciales inválidas u otros problemas de acceso
          this.errorMsg = 'Ha habido un problema con su acceso, consulte con su administrador';
          this.cdr.detectChanges();
        } else {
          this.errorMsg = 'No se pudo iniciar sesión. Inténtelo de nuevo.';
          this.cdr.detectChanges();
        }
      }
    });
    
  }
}
