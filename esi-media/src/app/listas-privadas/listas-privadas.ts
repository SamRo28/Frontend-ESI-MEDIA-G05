import { Component, Input, Output, EventEmitter, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ListaService, ListasResponse } from '../services/lista.service';
import { MultimediaService } from '../services/multimedia.service';
import { CrearListaComponent } from '../crear-lista/crear-lista';
import { Router } from '@angular/router';
import { BaseListasComponent } from '../shared/base-listas.component';

@Component({
  selector: 'app-listas-privadas',
  imports: [CommonModule, CrearListaComponent],
  templateUrl: './listas-privadas.html',
  styleUrl: './listas-privadas.css'
})
export class ListasPrivadas extends BaseListasComponent {
  @Input() forceReload?: any;
  @Output() cerrarPanel = new EventEmitter<void>();
  @Output() abrirCrearModal = new EventEmitter<void>();

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
    // No hay configuración específica adicional para listas privadas
  }

  protected cargarListasEspecificas(): void {
    if (!this.userId) {
      return;
    }
    
    this.listaService.obtenerListasUsuario(this.userId).subscribe({
      next: (response: ListasResponse) => {
        this.procesarRespuestaListas(response);
      },
      error: (error) => {
        this.manejarErrorCargaListas(error, 'Error al cargar listas');
      }
    });
  }

  protected obtenerRutaNavegacion(lista: any): string[] {
    // Navegar a la vista detalle de la lista
    return ['dashboard/listas', lista.id];
  }

  emitAbrirCrearModal(): void {
    this.abrirCrearModal.emit();
  }
}
