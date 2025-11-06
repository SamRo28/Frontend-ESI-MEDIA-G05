import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';

interface Star {
  left: number;
  top: number;
  delay: number;
}

@Component({
  selector: 'app-visu-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './visu-dashboard.html',
  styleUrl: './visu-dashboard.css'
})
export class VisuDashboard implements OnInit {
  stars: Star[] = [];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.generateStars();
  }

  generateStars(): void {
    // Generar 50 estrellas con posiciones aleatorias
    for (let i = 0; i < 50; i++) {
      this.stars.push({
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 3
      });
    }
  }

  toggleUserMenu(): void {
    console.log('Abrir menú de usuario');
    
    // Aquí podrías abrir un dropdown con opciones como:
    // - Mi perfil
    // - Configuración
    // - Cerrar sesión
    // etc.
  }

  logout(): void {
    console.log('Cerrando sesión...');
    
    // Aquí iría tu lógica de logout
    // this.authService.logout();
    // this.router.navigate(['/login']);
  }
}
