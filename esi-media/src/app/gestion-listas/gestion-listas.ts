import { Component, Input, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ListaService, ListasResponse } from '../services/lista.service';
import { MultimediaService } from '../services/multimedia.service';
import { CrearListaComponent } from '../crear-lista/crear-lista';
import { BaseListasComponent } from '../shared/base-listas.component';

@Component({
  selector: 'app-gestion-listas',
  standalone: true,
  imports: [CommonModule, CrearListaComponent],
  templateUrl: './gestion-listas.html',
  styleUrls: ['./gestion-listas.css']
})
export class GestionListasComponent extends BaseListasComponent {
  @Input() modo: 'gestor' | 'visualizador' = 'visualizador';
  @Input() forceReload?: any;

  constructor(
    listaService: ListaService,
    multimediaService: MultimediaService,
    router: Router,
    @Inject(PLATFORM_ID) platformId: Object,
    cdr: ChangeDetectorRef
  ) {
    super(listaService, multimediaService, router, platformId, cdr);
  }

  protected inicializarComponente(): void {
    this.determinarModo();
  }

  protected cargarListasEspecificas(): void {
    if (this.modo === 'gestor') {
      // Gestor: obtener todas las listas públicas para poder modificarlas
      this.listaService.obtenerListasPublicas().subscribe({
        next: (response: ListasResponse) => {
          this.procesarRespuestaListas(response);
        },
        error: (error: any) => {
          this.manejarErrorCargaListas(error, 'Error al cargar listas');
        }
      });
    } else {
      // Visualizador: obtener todas las listas públicas de gestores
      this.listaService.obtenerListasPublicas().subscribe({
        next: (response: ListasResponse) => {
          this.procesarRespuestaListas(response);
        },
        error: (error: any) => {
          this.manejarErrorCargaListas(error, 'Error al cargar listas públicas');
        }
      });
    }
  }

  protected obtenerRutaNavegacion(lista: any): string[] {
    // Navegar a la vista detalle de la lista según el rol del usuario
    if (this.modo === 'gestor') {
      return ['gestor-dashboard/gestion-listas', lista.id];
    } else {
      // Para visualizadores, siempre navegar a las rutas de dashboard
      return ['dashboard/listas', lista.id];
    }
  }

  private determinarModo(): void {
    try {
      const currentUserClass = sessionStorage.getItem('currentUserClass');
      this.modo = currentUserClass === 'GestordeContenido' ? 'gestor' : 'visualizador';
    } catch (error) {
      this.modo = 'visualizador';
    }
  }
}