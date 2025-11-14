import { Directive, Inject, PLATFORM_ID, ChangeDetectorRef, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { ListaService, ListasResponse } from '../services/lista.service';
import { MultimediaService } from '../services/multimedia.service';

@Directive()
export abstract class BaseListasComponent implements OnInit, OnChanges {
  listas: any[] = [];
  loading: boolean = false;
  userId: string = '';
  
  // Modal de edición
  mostrarModalEdicion: boolean = false;
  listaParaEditar?: any = null;
  
  // Cache de carátulas de los primeros contenidos
  caratulasCache: { [listaId: string]: string } = {};

  constructor(
    protected listaService: ListaService,
    protected multimediaService: MultimediaService,
    protected router: Router,
    @Inject(PLATFORM_ID) protected platformId: Object,
    protected cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.cargarUserId();
      this.inicializarComponente();
      this.cargarListas();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['forceReload'] && !changes['forceReload'].firstChange) {
      this.cargarListas();
    }
  }

  /**
   * Método abstracto para inicializar configuraciones específicas del componente
   */
  protected abstract inicializarComponente(): void;

  /**
   * Método abstracto para cargar las listas específicas según el tipo de componente
   */
  protected abstract cargarListasEspecificas(): void;

  /**
   * Método abstracto para determinar la ruta de navegación según el tipo de componente
   */
  protected abstract obtenerRutaNavegacion(lista: any): string[];

  protected cargarUserId(): void {
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

  protected cargarListas(): void {
    this.loading = true;
    this.cargarListasEspecificas();
  }

  protected procesarRespuestaListas(response: ListasResponse): void {
    this.loading = false;
    if (response && response.success) {
      this.listas = response.listas || [];
      this.cargarCaratulasPrimerosContenidos();
    } else {
      this.listas = [];
    }
    this.cdr.detectChanges();
  }

  protected manejarErrorCargaListas(error: any, mensaje: string = 'Error al cargar listas'): void {
    console.error(mensaje, error);
    this.loading = false;
    this.listas = [];
    this.cdr.detectChanges();
  }

  verListaCompleta(lista: any): void {
    const ruta = this.obtenerRutaNavegacion(lista);
    this.router.navigate(ruta);
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

  /**
   * Carga las carátulas de los primeros contenidos de cada lista
   */
  private cargarCaratulasPrimerosContenidos(): void {
    this.listas.forEach(lista => {
      if (lista.contenidosIds && lista.contenidosIds.length > 0) {
        const primerContenidoId = lista.contenidosIds[0];
        this.multimediaService.detalle(primerContenidoId).subscribe({
          next: (contenido) => {
            if (contenido.caratula) {
              this.caratulasCache[lista.id] = this.procesarCaratula(contenido.caratula);
              this.cdr.detectChanges();
            }
          },
          error: (error) => {
            console.warn(`No se pudo cargar la carátula para la lista ${lista.nombre}:`, error);
          }
        });
      }
    });
  }

  /**
   * Obtiene la carátula del primer contenido de una lista
   */
  obtenerCaratulaPrimerContenido(lista: any): string | null {
    return this.caratulasCache[lista.id] || null;
  }

  /**
   * Procesa la carátula para convertirla a formato mostrable
   */
  private procesarCaratula(caratula: any): string {
    if (!caratula) return '';
    
    if (typeof caratula === 'string') {
      // Si ya es una cadena (base64 o URL), devolverla directamente
      return caratula;
    }
    
    if (caratula.data && Array.isArray(caratula.data)) {
      // Si es un objeto con data como array de bytes, convertir a base64
      const uint8Array = new Uint8Array(caratula.data);
      let binary = '';
      for (let i = 0; i < uint8Array.byteLength; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      return `data:image/jpeg;base64,${btoa(binary)}`;
    }
    
    return '';
  }
}