import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ListaService } from '../services/lista.service';
import { MultimediaService, ContenidoResumenDTO } from '../services/multimedia.service';
import { ContentService, ContenidoSearchResult } from '../services/content.service';
import { Subject, takeUntil, forkJoin, debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { MultimediaListComponent } from '../multimedia-list/multimedia-list';
import { ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal';

@Component({
  selector: 'app-lista-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MultimediaListComponent, ConfirmationModalComponent],
  templateUrl: './lista-detail.html',
  styleUrls: ['./lista-detail.css']
})
export class ListaDetailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();
  
  lista: any = null;
  contenidos: ContenidoResumenDTO[] = [];
  loading: boolean = true;
  error: string | null = null;
  userId: string = '';

  // Modo de edición
  modoEdicion: boolean = false;
  datosEdicion: any = {};
  contenidosEditables: string[] = [];
  guardandoEdicion: boolean = false;

  // Modal de confirmación para eliminar
  mostrarModalEliminar: boolean = false;
  eliminandoLista: boolean = false;

  // Búsqueda de contenidos
  nuevoContenido: string = '';
  contenidosEncontrados: ContenidoSearchResult[] = [];
  mostrarSugerencias: boolean = false;
  buscandoContenidos: boolean = false;
  private contenidosSeleccionados: Map<string, ContenidoSearchResult> = new Map();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private listaService: ListaService,
    private multimediaService: MultimediaService,
    private contentService: ContentService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Cargar usuario
    this.cargarUserId();

    // Configurar búsqueda de contenidos
    this.configurarBusquedaContenidos();

    // Obtener ID de la lista desde la ruta
    this.route.paramMap.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const listaId = params.get('id');
      if (listaId) {
        this.cargarDatosLista(listaId);
      } else {
        this.error = 'ID de lista no válido';
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

  private cargarDatosLista(listaId: string): void {
    this.loading = true;
    this.error = null;

    // Cargar datos de la lista y sus contenidos en paralelo
    forkJoin({
      lista: this.listaService.obtenerListaPorId(listaId),
      contenidos: this.listaService.obtenerContenidosLista(listaId)
    }).subscribe({
      next: (responses) => {
        // Procesar respuesta de la lista
        if (responses.lista?.success) {
          this.lista = responses.lista.lista;
        } else {
          this.error = responses.lista?.mensaje || 'No se pudo cargar la lista';
        }

        // Procesar respuesta de los contenidos
        if (responses.contenidos?.success) {
          this.contenidos = responses.contenidos.contenidos || [];
          console.log('Contenidos cargados:', this.contenidos.length, this.contenidos);
        } else {
          // No es error crítico si no hay contenidos
          this.contenidos = [];
          console.log('No se encontraron contenidos o respuesta sin éxito');
        }

        // Actualizar estado dentro de NgZone
        this.ngZone.run(() => {
          this.loading = false;
          // Forzar detección de cambios
          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        console.error('Error cargando datos de la lista:', error);
        
        if (error.status === 404) {
          this.error = 'Lista no encontrada';
        } else if (error.status === 403) {
          this.error = 'No tienes permisos para acceder a esta lista';
        } else {
          this.error = 'Error al cargar la lista';
        }
        
        // Actualizar estado dentro de NgZone
        this.ngZone.run(() => {
          this.loading = false;
          // Forzar detección de cambios
          this.cdr.detectChanges();
        });
      }
    });
  }

  /**
   * Navega a la vista detalle de un contenido específico
   */
  verContenido(contenido: ContenidoResumenDTO): void {
    this.router.navigate(['/multimedia', contenido.id]);
  }

  /**
   * Volver a la vista anterior
   */
  volver(): void {
    const tipoUsuario = this.obtenerTipoUsuario();
    
    // Redirigir según el tipo de usuario
    if (tipoUsuario === 'Gestor' || tipoUsuario === 'GestordeContenido') {
      this.router.navigate(['/gestor-dashboard']);
    } else {
      // Para Visualizadores y otros tipos de usuario
      this.router.navigate(['/dashboard']);
    }
  }

  /**
   * Verifica si el usuario es el propietario de la lista
   */
  esPropietario(): boolean {
    return this.lista && this.lista.creadorId === this.userId;
  }



  /**
   * Obtiene URL de la carátula del contenido
   */
  caratulaUrl(contenido: ContenidoResumenDTO): string | null {
    const c: any = (contenido as any).caratula;
    if (!c) return null;
    if (typeof c === 'string') return c;
    if (typeof c === 'object') {
      if (typeof c.url === 'string') return c.url;
      if (typeof c.src === 'string') return c.src;
      if (typeof c.data === 'string') return c.data;
    }
    return null;
  }

  /**
   * Track function para ngFor
   */
  trackById(index: number, item: ContenidoResumenDTO): string {
    return item?.id || index.toString();
  }

  /**
   * Configura la búsqueda en tiempo real de contenidos
   */
  private configurarBusquedaContenidos(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query || query.trim().length < 2) {
          this.buscandoContenidos = false;
          return of({ success: false, contenidos: [], total: 0, query: '', mensaje: '' });
        }
        
        this.buscandoContenidos = true;
        return this.contentService.buscarContenidos(query.trim(), 8).pipe(
          catchError(error => {
            console.error('Error HTTP en búsqueda:', error);
            return of({ 
              success: false, 
              contenidos: [], 
              total: 0, 
              query: query.trim(), 
              mensaje: 'Error al buscar contenidos' 
            });
          })
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.buscandoContenidos = false;
        if (response && response.success) {
          this.contenidosEncontrados = response.contenidos || [];
          this.mostrarSugerencias = this.contenidosEncontrados.length > 0;
        } else {
          this.contenidosEncontrados = [];
          this.mostrarSugerencias = false;
        }
      },
      error: (error) => {
        console.error('Error en búsqueda de contenidos:', error);
        this.buscandoContenidos = false;
        this.contenidosEncontrados = [];
        this.mostrarSugerencias = false;
      }
    });
  }

  /**
   * Identifica el tipo de usuario actual
   */
  obtenerTipoUsuario(): string {
    return sessionStorage.getItem('currentUserClass') || '';
  }

  /**
   * Verifica si el usuario es gestor
   */
  esGestor(): boolean {
    return sessionStorage.getItem('currentUserClass') === 'Gestor';
  }

  /**
   * Verifica si el usuario es gestor de contenido
   */
  esGestorDeContenido(): boolean {
    return sessionStorage.getItem('currentUserClass') === 'GestordeContenido';
  }

  /**
   * Verifica si el usuario es visualizador
   */
  esVisualizador(): boolean {
    return sessionStorage.getItem('currentUserClass') === 'Visualizador';
  }

  /**
   * Activa o desactiva el modo de edición
   */
  toggleEdicion(): void {
    if (this.modoEdicion) {
      // Guardar cambios
      this.guardarEdicion();
    } else {
      // Entrar en modo edición
      this.iniciarEdicion();
    }
  }

  /**
   * Inicia el modo de edición
   */
  private iniciarEdicion(): void {
    this.ngZone.run(() => {
      this.modoEdicion = true;
      
      // Copiar datos actuales al formulario de edición
      this.datosEdicion = {
        nombre: this.lista.nombre || '',
        descripcion: this.lista.descripcion || '',
        tagsInput: this.lista.tags ? this.lista.tags.join(', ') : '',
        visible: this.lista.visible || false
      };

      // Copiar IDs de contenidos para edición
      this.contenidosEditables = this.contenidos.map(c => c.id);
      
      // Llenar caché de contenidos seleccionados
      this.contenidos.forEach(contenido => {
        this.contenidosSeleccionados.set(contenido.id, {
          id: contenido.id,
          titulo: contenido.titulo,
          tipo: contenido.tipo as 'Video' | 'Audio',
          descripcion: (contenido as any).descripcion,
          duracion: (contenido as any).duracion
        });
      });
      
      this.cdr.detectChanges();
    });
  }

  /**
   * Guarda los cambios de la edición
   */
  private guardarEdicion(): void {
    if (!this.validarDatosEdicion()) {
      return;
    }

    this.guardandoEdicion = true;

    const datosLista = {
      nombre: this.datosEdicion.nombre.trim(),
      descripcion: this.datosEdicion.descripcion.trim(),
      tags: this.parseTags(this.datosEdicion.tagsInput),
      visible: this.esGestor() ? this.datosEdicion.visible : false,
      creadorId: this.userId,
      especializacionGestor: this.lista.especializacionGestor,
      contenidosIds: [...new Set(this.contenidosEditables)] // Eliminar duplicados
    };

    this.listaService.editarLista(this.lista.id, datosLista).subscribe({
      next: (response) => {
        this.guardandoEdicion = false;
        if (response && response.success) {
          // Actualizar datos locales
          this.lista = { ...this.lista, ...datosLista };
          
          // Recargar contenidos para mostrar los cambios
          this.cargarContenidosLista();
          
          // Salir del modo edición y limpiar datos
          this.ngZone.run(() => {
            this.modoEdicion = false;
            this.limpiarDatosEdicion();
            this.cdr.detectChanges();
          });
          
          alert('✅ Lista actualizada correctamente');
        } else {
          alert(response?.mensaje || 'Error al actualizar la lista');
        }
      },
      error: (error) => {
        this.guardandoEdicion = false;
        console.error('Error actualizando lista:', error);
        alert('Error al actualizar la lista');
      }
    });
  }

  /**
   * Cancela la edición
   */
  cancelarEdicion(): void {
    this.ngZone.run(() => {
      this.modoEdicion = false;
      this.datosEdicion = {};
      this.contenidosEditables = [];
      this.nuevoContenido = '';
      this.contenidosEncontrados = [];
      this.mostrarSugerencias = false;
      this.contenidosSeleccionados.clear();
      this.cdr.detectChanges();
    });
  }

  /**
   * Limpia los datos de edición
   */
  private limpiarDatosEdicion(): void {
    this.datosEdicion = {};
    this.contenidosEditables = [];
    this.nuevoContenido = '';
    this.contenidosEncontrados = [];
    this.mostrarSugerencias = false;
    this.contenidosSeleccionados.clear();
  }

  /**
   * Valida los datos de edición
   */
  private validarDatosEdicion(): boolean {
    if (!this.datosEdicion.nombre || this.datosEdicion.nombre.trim().length < 3) {
      alert('⚠️ El nombre debe tener al menos 3 caracteres');
      return false;
    }

    if (!this.datosEdicion.descripcion || this.datosEdicion.descripcion.trim().length < 10) {
      alert('⚠️ La descripción debe tener al menos 10 caracteres');
      return false;
    }

    if (this.contenidosEditables.length === 0) {
      alert('⚠️ La lista debe tener al menos un contenido');
      return false;
    }

    return true;
  }

  /**
   * Convierte string de tags separados por comas a array
   */
  private parseTags(tagsInput: string): string[] {
    if (!tagsInput || tagsInput.trim() === '') return [];
    return tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0);
  }

  /**
   * Recarga solo los contenidos de la lista
   */
  private cargarContenidosLista(): void {
    console.log('Recargando contenidos para lista:', this.lista.id);
    this.listaService.obtenerContenidosLista(this.lista.id).subscribe({
      next: (response) => {
        console.log('Respuesta de recarga de contenidos:', response);
        if (response?.success) {
          this.contenidos = response.contenidos || [];
          console.log('Contenidos actualizados después de edición:', this.contenidos.length, this.contenidos);
          
          // Forzar detección de cambios dentro de NgZone
          this.ngZone.run(() => {
            this.cdr.detectChanges();
          });
        }
      },
      error: (error) => {
        console.error('Error recargando contenidos:', error);
      }
    });
  }

  /**
   * Maneja la búsqueda de contenidos
   */
  onBuscarContenido(): void {
    this.searchSubject.next(this.nuevoContenido);
  }

  /**
   * Selecciona un contenido de las sugerencias
   */
  seleccionarContenido(contenido: ContenidoSearchResult): void {
    // Verificar que no esté duplicado
    if (this.contenidosEditables.includes(contenido.id)) {
      alert('Este contenido ya está en la lista');
      return;
    }

    // Guardar en caché y agregar a la lista
    this.contenidosSeleccionados.set(contenido.id, contenido);
    this.contenidosEditables.push(contenido.id);
    
    // Limpiar búsqueda
    this.nuevoContenido = '';
    this.mostrarSugerencias = false;
    this.contenidosEncontrados = [];
  }

  /**
   * Cierra las sugerencias
   */
  cerrarSugerencias(): void {
    setTimeout(() => {
      this.mostrarSugerencias = false;
    }, 200);
  }

  /**
   * Agrega un contenido (método legacy)
   */
  agregarContenido(): void {
    if (!this.nuevoContenido || !this.nuevoContenido.trim()) {
      return;
    }

    const contenido = this.nuevoContenido.trim();
    
    // Si hay sugerencias y coincide exactamente, seleccionar
    const contenidoEncontrado = this.contenidosEncontrados.find(c => 
      c.titulo.toLowerCase() === contenido.toLowerCase()
    );
    
    if (contenidoEncontrado) {
      this.seleccionarContenido(contenidoEncontrado);
      return;
    }
    
    // Verificar duplicados
    if (this.contenidosEditables.includes(contenido)) {
      alert('Este contenido ya está en la lista');
      return;
    }

    // Agregar como ID directo
    this.contenidosEditables.push(contenido);
    this.nuevoContenido = '';
    this.mostrarSugerencias = false;
  }

  /**
   * Quita un contenido de la lista en edición
   */
  quitarContenido(index: number): void {
    if (this.contenidosEditables.length > 1) {
      const contenidoEliminado = this.contenidosEditables[index];
      this.contenidosEditables.splice(index, 1);
      this.contenidosSeleccionados.delete(contenidoEliminado);
    } else {
      alert('⚠️ Una lista debe tener al menos un contenido.');
    }
  }

  /**
   * Obtiene el nombre de un contenido por su ID
   */
  obtenerNombreContenido(id: string): string {
    // Buscar en caché
    const contenidoCacheado = this.contenidosSeleccionados.get(id);
    if (contenidoCacheado) {
      return `${contenidoCacheado.titulo} (${contenidoCacheado.tipo})`;
    }
    
    // Buscar en contenidos actuales
    const contenidoActual = this.contenidos.find(c => c.id === id);
    if (contenidoActual) {
      return `${contenidoActual.titulo} (${contenidoActual.tipo})`;
    }
    
    return `Contenido ID: ${id}`;
  }

  /**
   * Muestra el modal de confirmación para eliminar
   */
  mostrarConfirmacionEliminar(): void {
    if (!this.esPropietario()) {
      alert('Solo el creador puede eliminar la lista');
      return;
    }
    this.mostrarModalEliminar = true;
  }

  /**
   * Confirma la eliminación de la lista
   */
  confirmarEliminarLista(): void {
    this.eliminandoLista = true;
    
    this.listaService.eliminarLista(this.lista.id).subscribe({
      next: (response) => {
        this.eliminandoLista = false;
        if (response.success) {
          this.mostrarModalEliminar = false;
          alert('Lista eliminada correctamente');
          this.router.navigate(['/dashboard/listas']);
        } else {
          alert(response.mensaje || 'Error al eliminar la lista');
        }
      },
      error: (error) => {
        this.eliminandoLista = false;
        console.error('Error eliminando lista:', error);
        alert('Error al eliminar la lista');
      }
    });
  }

  /**
   * Cancela la eliminación de la lista
   */
  cancelarEliminarLista(): void {
    this.mostrarModalEliminar = false;
  }

  /**
   * Obtiene el mensaje de confirmación para eliminar
   */
  getMensajeEliminar(): string {
    const nombreLista = this.lista?.nombre || 'esta lista';
    return `¿Estás seguro de que deseas eliminar la lista "${nombreLista}"?`;
  }
}