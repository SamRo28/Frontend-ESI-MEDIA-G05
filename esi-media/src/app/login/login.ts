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
  showPassword: boolean = false;

  // Compatibilidad con la plantilla que usa "loginError"
  get loginError(): string { return this.errorMsg; }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

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
        sessionStorage.setItem('email', response.usuario.email);
        sessionStorage.setItem('currentUserClass', response.tipo);
        sessionStorage.setItem('user', JSON.stringify(response.usuario));

        if(response.usuario.twoFactorAutenticationEnabled){
           this.router.navigate(['/2verification'], { state: { allowFa2Code: true } });
        }
        else if (!response.twoFactorAutenticationEnabled && response.tipo !== 'visualizador'){
          this.router.navigate(['/2fa'], { state: { allowFa2: true } });
        }
        else{
          this.router.navigate(['/dashboard']);
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
