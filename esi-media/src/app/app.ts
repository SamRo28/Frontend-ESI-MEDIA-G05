import { Component, signal } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('esi-media');
<<<<<<< HEAD
  
  constructor(private router: Router) {}
  
  toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
  }
  
  navigateToHome() {
    this.router.navigate(['/home']);
  }
=======
>>>>>>> alvaro
}
