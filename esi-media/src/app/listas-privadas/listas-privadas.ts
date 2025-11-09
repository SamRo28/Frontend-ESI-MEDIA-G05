import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ListaService, ListasResponse } from '../services/lista.service';

@Component({
  selector: 'app-listas-privadas',
  imports: [CommonModule],
  templateUrl: './listas-privadas.html',
  styleUrl: './listas-privadas.css'
})
export class ListasPrivadas implements OnInit, OnChanges {
  @Input() forceReload?: any;
  @Output() cerrarPanel = new EventEmitter<void>();
  @Output() abrirCrearModal = new EventEmitter<void>();

  listas: any[] = [];
  loading: boolean = false;
  userId: string = '';

  constructor(
    private listaService: ListaService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.cargarUserId();
      this.cargarListas();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['forceReload'] && !changes['forceReload'].firstChange) {
      this.cargarListas();
    }
  }

  private cargarUserId(): void {
    try {
      const userStr = sessionStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        this.userId = user.id;
      }
    } catch (error) {
      console.error('Error cargando userId:', error);
    }
  }

  private cargarListas(): void {
    if (!this.userId) {
      return;
    }

    this.loading = true;
    this.listaService.obtenerListasUsuario(this.userId).subscribe({
      next: (response: ListasResponse) => {
        this.loading = false;
        if (response && response.success) {
          this.listas = response.listas || [];
        } else {
          console.error('Error al cargar listas:', response?.mensaje);
          this.listas = [];
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Error al cargar listas:', error);
        this.listas = [];
      }
    });
  }

  emitAbrirCrearModal(): void {
    this.abrirCrearModal.emit();
  }

  verListaCompleta(lista: any): void {
    console.log('Ver lista completa:', lista);
    // Aquí se puede implementar la navegación a la vista completa de la lista
  }
}
