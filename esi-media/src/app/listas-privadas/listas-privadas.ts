import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ListaService, ListasResponse } from '../services/lista.service';
import { CrearListaComponent } from '../crear-lista/crear-lista';
import { Router } from '@angular/router';

@Component({
  selector: 'app-listas-privadas',
  imports: [CommonModule, CrearListaComponent],
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
  
  // Modal de edición
  mostrarModalEdicion: boolean = false;
  listaParaEditar?: any = null;

  constructor(
    private listaService: ListaService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
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
          this.listas = [];
        }
        
        // Forzar detección de cambios para actualizar la vista
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error al cargar listas:', error);
        this.loading = false;
        this.listas = [];
        this.cdr.detectChanges();
      }
    });
  }

  emitAbrirCrearModal(): void {
    this.abrirCrearModal.emit();
  }

  verListaCompleta(lista: any): void {
    // Navegar a la vista detalle de la lista
    this.router.navigate(['dashboard/listas', lista.id]);
  }

  editarLista(lista: any, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    
    // Verificar permisos
    if (!this.listaService.puedeEditarLista(lista)) {
      alert('No tienes permisos para editar esta lista');
      return;
    }

    // Cargar datos completos de la lista
    this.listaService.obtenerListaPorId(lista.id).subscribe({
      next: (response) => {
        if (response.success && response.lista) {
          this.listaParaEditar = response.lista;
          this.mostrarModalEdicion = true;
        } else {
          alert('Error al cargar los datos de la lista');
        }
      },
      error: (error) => {
        console.error('Error cargando lista:', error);
        alert('Error al cargar los datos de la lista');
      }
    });
  }

  eliminarLista(lista: any, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    
    // Verificar permisos
    if (!this.listaService.puedeEliminarLista(lista)) {
      alert('Solo el creador de la lista puede eliminarla');
      return;
    }

    // Confirmación
    const confirmacion = confirm(`¿Estás seguro de que deseas eliminar la lista "${lista.nombre}"? Esta acción no se puede deshacer.`);
    
    if (confirmacion) {
      this.listaService.eliminarLista(lista.id).subscribe({
        next: (response) => {
          if (response.success) {
            // Recargar listas
            this.cargarListas();
            alert('Lista eliminada correctamente');
          } else {
            alert(response.mensaje || 'Error al eliminar la lista');
          }
        },
        error: (error) => {
          console.error('Error eliminando lista:', error);
          alert('Error al eliminar la lista');
        }
      });
    }
  }

  onListaEditada(listaActualizada: any): void {
    this.mostrarModalEdicion = false;
    this.listaParaEditar = null;
    // Recargar listas para mostrar cambios
    this.cargarListas();
  }

  onCancelarEdicion(): void {
    this.mostrarModalEdicion = false;
    this.listaParaEditar = null;
  }

  /**
   * Verifica si el usuario puede editar una lista
   */
  puedeEditar(lista: any): boolean {
    return this.listaService.puedeEditarLista(lista);
  }

  /**
   * Verifica si el usuario puede eliminar una lista
   */
  puedeEliminar(lista: any): boolean {
    return this.listaService.puedeEliminarLista(lista);
  }
}
