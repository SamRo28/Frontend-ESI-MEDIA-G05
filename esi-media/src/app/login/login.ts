import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../userService';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  loginForm: any;
  email: string = '';
  password: string = '';

  constructor(
    private router: Router, 
    private userService: UserService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  onSubmit() {
    console.log('Intentando login con:', { email: this.email, password: this.password });
    
    this.userService.login(this.email, this.password).subscribe({
      next: (response) => {
        console.log('✅ Login successful:', response);
        console.log('📋 _class del usuario:', response._class);
        console.log('🔍 Tipo de _class:', typeof response._class);
        
        // Guardar información del usuario en localStorage (solo en el navegador)
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('currentUser', JSON.stringify(response));
          
          // Guardar el token de sesión si existe
          if (response.sesionstoken && response.sesionstoken.length > 0) {
            const sessionToken = response.sesionstoken[response.sesionstoken.length - 1]; // Último token generado
            localStorage.setItem('sessionToken', sessionToken.token);
            console.log('🎫 Token de sesión guardado:', sessionToken.token);
          }
        }
        
        // Verificar si el usuario es administrador basándose en _class
        const isAdmin = response._class === 'iso25.g05.esi_media.model.Administrador';
        console.log('🎯 ¿Es administrador?', isAdmin);
        console.log('🔍 Comparación:', {
          recibido: response._class,
          esperado: 'iso25.g05.esi_media.model.Administrador',
          sonIguales: response._class === 'iso25.g05.esi_media.model.Administrador'
        });
        
        if (isAdmin) {
          console.log('✅ Usuario administrador detectado, redirigiendo a /admin-dashboard');
          console.log('🚀 Navegando ahora...');
          this.router.navigate(['/admin-dashboard']).then(success => {
            console.log('📍 Navegación completada:', success);
          }).catch(error => {
            console.error('❌ Error en navegación:', error);
          });
        } else {
          console.log('ℹ️ Usuario normal, redirigiendo a /dashboard');
          this.router.navigate(['/dashboard']).then(success => {
            console.log('📍 Navegación completada:', success);
          });
        }
      },
      error: (error) => {
        console.error('Login failed:', error);
        console.error('Error details:', error.error);
        console.error('Status:', error.status);
        // Handle login failure (e.g., show an error message)
      }
    });
    
  }
}
