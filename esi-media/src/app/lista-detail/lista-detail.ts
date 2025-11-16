import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ListaService } from '../services/lista.service';
import { MultimediaService, ContenidoResumenDTO } from '../services/multimedia.service';
import { ContentService, ContenidoSearchResult } from '../services/content.service';
import { Subject, takeUntil, forkJoin, debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';

import { ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal';

@Component({
  selector: 'app-lista-detail',
  standalone: true,
  imports: [CommonModule, FormsModule,  ConfirmationModalComponent],
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

    const observables = this.crearObservablesLista(listaId);
    
    forkJoin(observables).subscribe({
      next: (responses) => this.procesarRespuestasLista(responses),
      error: (error) => this.manejarErrorCarga(error)
    });
  }

  private crearObservablesLista(listaId: string) {
    const tipoUsuario = this.obtenerTipoUsuario();
    console.log('🔍 DEBUG - Tipo de usuario:', tipoUsuario);

    if (this.esVisualizador()) {
      return {
        lista: this.crearObservableListaVisualizador(listaId),
        contenidos: this.crearObservableContenidosVisualizador(listaId)
      };
    }

    return {
      lista: this.listaService.obtenerListaPorId(listaId),
      contenidos: this.listaService.obtenerContenidosLista(listaId)
    };
  }

  private crearObservableListaVisualizador(listaId: string) {
    return this.listaService.obtenerListaPublicaPorId(listaId).pipe(
      catchError(error => {
        console.log('❌ Error con lista pública:', error.status, '- intentando lista privada');
        return (error.status === 404 || error.status === 403) 
          ? this.listaService.obtenerListaPorId(listaId)
          : of(error);
      })
    );
  }

  private crearObservableContenidosVisualizador(listaId: string) {
    return this.listaService.obtenerContenidosListaPublica(listaId).pipe(
      catchError(error => {
        console.log('❌ Error con contenidos públicos:', error.status, '- intentando contenidos privados');
        return (error.status === 404 || error.status === 403)
          ? this.listaService.obtenerContenidosLista(listaId)
          : of(error);
      })
    );
  }

  private procesarRespuestasLista(responses: any): void {
    this.procesarRespuestaLista(responses.lista);
    this.procesarRespuestaContenidos(responses.contenidos);
    this.finalizarCarga();
  }

  private procesarRespuestaLista(respuestaLista: any): void {
    if (respuestaLista?.success) {
      this.lista = respuestaLista.lista;
      
      if (!this.puedeVerLista()) {
        this.error = 'No tienes permisos para acceder a esta lista';
        return;
      }
    } else {
      this.error = respuestaLista?.mensaje || 'No se pudo cargar la lista';
    }
  }

  private procesarRespuestaContenidos(respuestaContenidos: any): void {
    if (respuestaContenidos?.success && this.puedeVerLista()) {
      this.contenidos = respuestaContenidos.contenidos || [];
      console.log('Contenidos cargados:', this.contenidos.length, this.contenidos);
    } else {
      this.contenidos = [];
      console.log('No se encontraron contenidos o respuesta sin éxito');
    }
  }

  private finalizarCarga(): void {
    this.ngZone.run(() => {
      this.loading = false;
      this.cdr.detectChanges();
    });
  }

  private manejarErrorCarga(error: any): void {
    console.error('Error cargando datos de la lista:', error);
    this.error = this.obtenerMensajeError(error);
    this.finalizarCarga();
  }

  private obtenerMensajeError(error: any): string {
    switch (error.status) {
      case 404: return 'Lista no encontrada';
      case 403: return 'No tienes permisos para acceder a esta lista privada';
      case 401: return 'Debes iniciar sesión para acceder a las listas';
      default: return 'Error al cargar la lista. Intenta de nuevo más tarde.';
    }
  }

  /**
   * Navega a la vista detalle de un contenido específico
   */
  verContenido(contenido: ContenidoResumenDTO): void {
    // Usar la ruta correcta según el tipo de usuario
    this.router.navigate(['/dashboard', contenido.id]);
  }

  /**
   * Volver a la vista anterior
   */
  volver(): void {
    const tipoUsuario = this.obtenerTipoUsuario();
    
    // Redirigir según el tipo de usuario y contexto
    if (tipoUsuario === 'GestordeContenido') {
      // Los gestores van a su dashboard con gestión de listas
      this.router.navigate(['/gestor-dashboard']);
    } else {
      // Los visualizadores van al dashboard con listas públicas
      this.router.navigate(['/dashboard/listas-publicas']);
    }
  }

  /**
   * Verifica si el usuario es el propietario de la lista
   */
  esPropietario(): boolean {
    // Verificar si tenemos los datos necesarios
    if (!this.lista || !this.userId) {
      return false;
    }
    
    // Solo el creador de la lista puede editarla/eliminarla
    return this.lista.creadorId === this.userId;
  }

  /**
   * Verifica si el usuario puede ver la lista (acceso de lectura)
   */
  puedeVerLista(): boolean {
    // Si no hay lista cargada, no puede ver nada
    if (!this.lista) {
      return false;
    }

    // El propietario siempre puede ver su lista
    if (this.esPropietario()) {
      return true;
    }

    // Los visualizadores pueden ver listas públicas
    if (this.esVisualizador() && this.lista.visible === true) {
      return true;
    }

    // Los gestores pueden ver cualquier lista
    if (this.esGestorDeContenido()) {
      return true;
    }

    return false;
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
      switchMap(query => this.procesarQueryBusqueda(query)),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => this.procesarResultadoBusqueda(response),
      error: (error) => this.manejarErrorBusqueda(error)
    });
  }

  private procesarQueryBusqueda(query: string) {
    if (!this.esQueryValido(query)) {
      this.buscandoContenidos = false;
      return of(this.crearRespuestaVacia());
    }
    
    this.buscandoContenidos = true;
    return this.contentService.buscarContenidos(query.trim(), 8).pipe(
      catchError(error => this.manejarErrorHttpBusqueda(error, query))
    );
  }

  private esQueryValido(query: string): boolean {
    return !!(query && query.trim().length >= 2);
  }

  private crearRespuestaVacia() {
    return { success: false, contenidos: [], total: 0, query: '', mensaje: '' };
  }

  private manejarErrorHttpBusqueda(error: any, query: string) {
    console.error('Error HTTP en búsqueda:', error);
    return of({ 
      success: false, 
      contenidos: [], 
      total: 0, 
      query: query.trim(), 
      mensaje: 'Error al buscar contenidos' 
    });
  }

  private procesarResultadoBusqueda(response: any): void {
    this.buscandoContenidos = false;
    
    if (response?.success) {
      this.contenidosEncontrados = response.contenidos || [];
      this.mostrarSugerencias = this.contenidosEncontrados.length > 0;
    } else {
      this.limpiarResultadosBusqueda();
    }
  }

  private limpiarResultadosBusqueda(): void {
    this.contenidosEncontrados = [];
    this.mostrarSugerencias = false;
  }

  private manejarErrorBusqueda(error: any): void {
    console.error('Error en búsqueda de contenidos:', error);
    this.buscandoContenidos = false;
    this.limpiarResultadosBusqueda();
  }

  /**
   * Identifica el tipo de usuario actual
   */
  obtenerTipoUsuario(): string {
    return sessionStorage.getItem('currentUserClass') || '';
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
    const datosLista = this.construirDatosLista();

    this.listaService.editarLista(this.lista.id, datosLista).subscribe({
      next: (response) => this.procesarRespuestaGuardado(response),
      error: (error) => this.manejarErrorGuardado(error)
    });
  }

  private construirDatosLista() {
    return {
      nombre: this.datosEdicion.nombre.trim(),
      descripcion: this.datosEdicion.descripcion.trim(),
      tags: this.parseTags(this.datosEdicion.tagsInput),
      visible: this.esGestorDeContenido() ? this.datosEdicion.visible : false,
      creadorId: this.userId,
      especializacionGestor: this.lista.especializacionGestor,
      contenidosIds: [...new Set(this.contenidosEditables)]
    };
  }

  private procesarRespuestaGuardado(response: any): void {
    this.guardandoEdicion = false;
    
    if (response?.success) {
      this.actualizarDatosLocales(response);
      this.finalizarEdicion();
      alert('✅ Lista actualizada correctamente');
    } else {
      alert(response?.mensaje || 'Error al actualizar la lista');
    }
  }

  private actualizarDatosLocales(response: any): void {
    this.lista = { ...this.lista, ...this.construirDatosLista() };
    this.cargarContenidosLista();
  }

  private finalizarEdicion(): void {
    this.ngZone.run(() => {
      this.modoEdicion = false;
      this.limpiarDatosEdicion();
      this.cdr.detectChanges();
    });
  }

  private manejarErrorGuardado(error: any): void {
    this.guardandoEdicion = false;
    console.error('Error actualizando lista:', error);
    alert('Error al actualizar la lista');
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
    
    const contenidosObservable = this.crearObservableContenidos();
    
    contenidosObservable.subscribe({
      next: (response) => this.procesarRespuestaRecargaContenidos(response),
      error: (error) => console.error('Error recargando contenidos:', error)
    });
  }

  private crearObservableContenidos() {
    return this.esVisualizador() 
      ? this.crearObservableContenidosVisualizador(this.lista.id)
      : this.listaService.obtenerContenidosLista(this.lista.id);
  }

  private procesarRespuestaRecargaContenidos(response: any): void {
    console.log('Respuesta de recarga de contenidos:', response);
    
    if (response?.success) {
      this.contenidos = response.contenidos || [];
      console.log('Contenidos actualizados después de edición:', this.contenidos.length, this.contenidos);
      
      this.ngZone.run(() => {
        this.cdr.detectChanges();
      });
    }
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
    if (this.esContenidoDuplicado(contenido.id)) {
      alert('Este contenido ya está en la lista');
      return;
    }

    this.agregarContenidoALista(contenido);
    this.limpiarFormularioBusqueda();
  }

  private esContenidoDuplicado(contenidoId: string): boolean {
    return this.contenidosEditables.includes(contenidoId);
  }

  private agregarContenidoALista(contenido: ContenidoSearchResult): void {
    this.contenidosSeleccionados.set(contenido.id, contenido);
    this.contenidosEditables.push(contenido.id);
  }

  private limpiarFormularioBusqueda(): void {
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
    const contenidoTrimmed = this.nuevoContenido?.trim();
    
    if (!contenidoTrimmed) {
      return;
    }

    const contenidoEncontrado = this.buscarContenidoExacto(contenidoTrimmed);
    
    if (contenidoEncontrado) {
      this.seleccionarContenido(contenidoEncontrado);
      return;
    }
    
    this.agregarContenidoPorId(contenidoTrimmed);
  }

  private buscarContenidoExacto(contenido: string): ContenidoSearchResult | undefined {
    return this.contenidosEncontrados.find(c => 
      c.titulo.toLowerCase() === contenido.toLowerCase()
    );
  }

  private agregarContenidoPorId(contenidoId: string): void {
    if (this.esContenidoDuplicado(contenidoId)) {
      alert('Este contenido ya está en la lista');
      return;
    }

    this.contenidosEditables.push(contenidoId);
    this.limpiarFormularioBusqueda();
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
    const contenidoCacheado = this.buscarEnCache(id);
    if (contenidoCacheado) {
      return this.formatearNombreContenido(contenidoCacheado.titulo, contenidoCacheado.tipo);
    }
    
    const contenidoActual = this.buscarEnContenidosActuales(id);
    if (contenidoActual) {
      return this.formatearNombreContenido(contenidoActual.titulo, contenidoActual.tipo);
    }
    
    return `Contenido ID: ${id}`;
  }

  private buscarEnCache(id: string): ContenidoSearchResult | undefined {
    return this.contenidosSeleccionados.get(id);
  }

  private buscarEnContenidosActuales(id: string): ContenidoResumenDTO | undefined {
    return this.contenidos.find(c => c.id === id);
  }

  private formatearNombreContenido(titulo: string, tipo: string): string {
    return `${titulo} (${tipo})`;
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