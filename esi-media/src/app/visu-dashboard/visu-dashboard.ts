import { Component, OnInit, AfterViewInit, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
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
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './visu-dashboard.html',
  styleUrl: './visu-dashboard.css'
})
export class VisuDashboard implements OnInit, AfterViewInit {
  stars: Star[] = [];

  private multimedia = inject(MultimediaService);
  constructor(private router: Router) {}
  private platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    // Generación de estrellas si por cualquier motivo se queda en esta vista (fallback)
    this.generateStars();
  }

  ngAfterViewInit(): void {
    // Redirección sólo en navegador para evitar SSR/hidratación problemática
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => this.router.navigate(['/multimedia']), 0);
    }
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
