import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { MultimediaService } from '../services/multimedia.service';

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

  private multimedia = inject(MultimediaService);
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
    // Limpiar token sesión y cache multimedia
    try { sessionStorage.removeItem('token'); } catch {}
    this.multimedia.clearCache();
    this.router.navigate(['/login']);
  }
}
