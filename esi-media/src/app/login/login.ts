import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../userService';

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

  constructor(private router: Router, private userService: UserService) {}

  onSubmit() {
    this.userService.login(this.email, this.password).subscribe({
      next: (response) => {
        console.log('Login successful:', response);
  // Redirect to 2FA route after successful login
  // Pasamos un flag en navigation extras para que el guard permita el acceso
  this.router.navigate(['/2fa'], { state: { allowFa2: true } });
      },
      error: (error) => {
        console.error('Login failed:', error);
        // Handle login failure (e.g., show an error message)
      }
    });
    
  }
}
