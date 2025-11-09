import { Component, OnInit, AfterViewInit, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Router, NavigationEnd } from '@angular/router';
import { MultimediaService } from '../services/multimedia.service';
import { GestionListasComponent } from '../gestion-listas/gestion-listas';
import { MultimediaListComponent } from '../multimedia-list/multimedia-list';

interface Star {
  left: number;
  top: number;
  delay: number;
}

@Component({
  selector: 'app-visu-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, GestionListasComponent, MultimediaListComponent],
  templateUrl: './visu-dashboard.html',
  styleUrl: './visu-dashboard.css'
})
export class VisuDashboard implements OnInit, AfterViewInit {
  stars: Star[] = [];
  mostrarListasPrivadas = false;
  filtroTipo: 'AUDIO' | 'VIDEO' | null = null;

  private multimedia = inject(MultimediaService);
  constructor(private router: Router) {}
  private platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    // Generación de estrellas si por cualquier motivo se queda en esta vista (fallback)
    this.generateStars();
    // Detectar ruta para ajustar filtro de contenido
    this.router.events.subscribe(evt => {
      if (evt instanceof NavigationEnd) {
        const url = evt.urlAfterRedirects || evt.url;
        if (url.includes('/dashboard/videos')) {
          this.filtroTipo = 'VIDEO';
        } else if (url.includes('/dashboard/audios')) {
          this.filtroTipo = 'AUDIO';
        } else {
          this.filtroTipo = null; // mostrar ambos
        }
      }
    });
    // Inicial rápido
    const initUrl = this.router.url || '';
    if (initUrl.includes('/dashboard/videos')) this.filtroTipo = 'VIDEO';
    else if (initUrl.includes('/dashboard/audios')) this.filtroTipo = 'AUDIO';
  }

  ngAfterViewInit(): void {}

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

  toggleListasPrivadas(): void {
    this.mostrarListasPrivadas = !this.mostrarListasPrivadas;
  }

  navigateToGestionListas(): void {
    this.router.navigate(['/gestion-listas']);
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
