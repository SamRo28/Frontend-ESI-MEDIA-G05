import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UserService } from '../../userService';

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
  loginError: string = '';

  constructor(
    private router: Router, 
    private userService: UserService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  onSubmit() {
    console.log('Intentando login con:', { email: this.email, password: this.password });
    
    // resetear error anterior
    this.loginError = '';

    this.userService.login(this.email, this.password).subscribe({
      next: (response) => {
        sessionStorage.setItem('email', response.usuario.email);
        sessionStorage.setItem('currentUserClass', response.tipo);
        sessionStorage.setItem('user', JSON.stringify(response.usuario));

        if(response.usuario.twoFactorAutenticationEnabled){
           this.router.navigate(['/2verification'], { state: { allowFa2Code: true } });
        }
        else if (!response.usuario.twoFactorAutenticationEnabled && response.tipo !== 'Visualizador'){
          this.router.navigate(['/2fa'], { state: { allowFa2: true } });
        }
        else{
          
          this.router.navigate(['/dashboard']);
        }
      },
      error: (error) => {
        this.loginError = 'Credenciales inválidas';
        console.log('Error establecido:', this.loginError);
      }
    });
  }
}
