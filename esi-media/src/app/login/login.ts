import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../userService';
import { isPlatformBrowser } from '@angular/common';
import { Session } from 'inspector/promises';
import { allowedNodeEnvironmentFlags } from 'process';

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
          else if(response.tipo === 'gestor_de_contenido'){
            this.router.navigate(['/gestor-dashboard']);
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
        // Handle login failure (e.g., show an error message)
      }
    });
    
  }
}
