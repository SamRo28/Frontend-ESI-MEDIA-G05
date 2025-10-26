import { Component, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UserService } from '../../userService';
import { isPlatformBrowser } from '@angular/common';
// Eliminar imports de Node no usados para evitar problemas en build web

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

  // Compatibilidad con la plantilla que usa "loginError"
  get loginError(): string { return this.errorMsg; }

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

        // Guardar email y tipo con comprobaciones
        const emailToStore = response?.email ?? usuario?.email ?? '';
        const tipoToStore = response?.tipo ?? usuario?.tipo ?? usuario?.rol ?? '';
        if (emailToStore) sessionStorage.setItem('email', emailToStore);
        if (tipoToStore) sessionStorage.setItem('currentUserClass', tipoToStore);

        // Extraer token de forma defensiva (varios backends usan diferentes nombres)
        const token = response?.sesionstoken?.token
          ?? response?.sessionToken
          ?? response?.token
          ?? response?.tokenSesion
          ?? response?.sesionstoken
          ?? null;

        if (!token) {
          console.warn('Login: token no encontrado en la respuesta', response);
        } else {
          try { sessionStorage.setItem('token', token); } catch {}
        }

        const twoFaEnabled = usuario?.twoFactorAutenticationEnabled ?? response?.twoFactorAutenticationEnabled ?? false;
        if (twoFaEnabled) {
          this.router.navigate(['/2verification'], { state: { allowFa2Code: true } });
        }
        /*else if (!response.twoFactorAutenticationEnabled && response.tipo !== 'visualizador'){
          this.router.navigate(['/2fa'], { state: { allowFa2: true } });
        }*/
        else {
          // Navegación por tipo - usar la variable guardada (tipoToStore)
          if (tipoToStore === 'visualizador') {
            this.router.navigate(['/visualizador']);
          } else if (tipoToStore === 'admin' || tipoToStore === 'Administrador' || tipoToStore === 'administrador') {
            this.router.navigate(['/admin-dashboard']);
          } else if (tipoToStore === 'creador') {
            this.router.navigate(['/creador-dashboard']);
          }
          // Si no se navegó ya a un dashboard específico, ir al dashboard genérico
          setTimeout(() => {
            if (!this.router.url.includes('/admin-dashboard') && !this.router.url.includes('/visualizador') && !this.router.url.includes('/creador-dashboard')) {
              this.router.navigate(['/dashboard']);
            }
          }, 10);
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
