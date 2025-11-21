import { Component, EventEmitter, Input, Output, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { ListaService } from '../services/lista.service';
import { ContentService, ContenidoSearchResult } from '../services/content.service';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { Subject, of } from 'rxjs';

@Component({
  selector: 'crear-lista',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, HttpClientModule],
  templateUrl: './crear-lista.html',
  styleUrls: ['./crear-lista.css']
})
export class CrearListaComponent implements OnInit {
  @Input() modo: 'gestor' | 'visualizador' = 'visualizador';
  @Input() modal: boolean = false;
  @Input() listaParaEditar?: any = null; // Nueva propiedad para modo edición
  @Output() creada = new EventEmitter<any>();
  @Output() editada = new EventEmitter<any>(); // Nuevo evento para edición
  @Output() cancelada = new EventEmitter<void>();
  @Output() cerrar = new EventEmitter<void>();

  listaForm: FormGroup;
  guardando: boolean = false;
  userId: string = '';
  
  // Gestión de contenidos
  contenidosIds: string[] = [];
  nuevoContenido: string = '';
  mostrarErrorContenido: boolean = false;
  mensajeErrorNombre: string = '';
  mensajeExito: string = '';
  
  // Búsqueda de contenidos
  contenidosEncontrados: ContenidoSearchResult[] = [];
  mostrarSugerencias: boolean = false;
  buscandoContenidos: boolean = false;
  private searchSubject = new Subject<string>();
  private contenidosSeleccionados: Map<string, ContenidoSearchResult> = new Map();

  // Tags predefinidos para listas
  availableListTags = [
    { value: 'pop', label: 'Pop' },
    { value: 'rock', label: 'Rock' },
    { value: 'rap', label: 'Rap/Hip-Hop' },
    { value: 'jazz', label: 'Jazz' },
    { value: 'clasica', label: 'Clásica' },
    { value: 'electronica', label: 'Electrónica' },
    { value: 'reggaeton', label: 'Reggaeton' },
    { value: 'indie', label: 'Indie' },
    { value: 'folk', label: 'Folk' },
    { value: 'blues', label: 'Blues' },
    { value: 'metal', label: 'Metal' },
    { value: 'comedia', label: 'Comedia' },
    { value: 'drama', label: 'Drama' },
    { value: 'documental', label: 'Documental' },
    { value: 'accion', label: 'Acción' },
    { value: 'ciencia-ficcion', label: 'Ciencia Ficción' },
    { value: 'terror', label: 'Terror' },
    { value: 'romance', label: 'Romance' },
    { value: 'aventura', label: 'Aventura' },
    { value: 'fantasia', label: 'Fantasía' },
    { value: 'thriller', label: 'Thriller' },
    { value: 'instrumental', label: 'Instrumental' },
    { value: 'acustico', label: 'Acústico' },
    { value: 'en-vivo', label: 'En vivo' },
    { value: 'colaboracion', label: 'Colaboración' },
    { value: 'remix', label: 'Remix' },
    { value: 'experimental', label: 'Experimental' },
    { value: 'alternativo', label: 'Alternativo' },
    { value: 'nostalgico', label: 'Nostálgico' },
    { value: 'relajante', label: 'Relajante' },
    { value: 'energico', label: 'Enérgico' },
    { value: 'motivacional', label: 'Motivacional' }
  ];
  
  selectedTags: string[] = [];

  // Opciones de especialización para gestores (mismo que en admin-dashboard)
  especializacionesDisponibles = [
    'Música',
    'Películas y Cinema',
    'Documentales',
    'Podcasts',
    'Series de TV',
    'Entretenimiento General',
    'Contenido Educativo',
    'Deportes'
  ];

  constructor(
    private fb: FormBuilder, 
    private listaService: ListaService, 
    private contentService: ContentService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.listaForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: ['', [Validators.required, Validators.minLength(10)]],
      especializacion: [''],
      visible: [false], // Se actualizará en configurarFormularioSegunRol()
      tagsInput: ['']
    });
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.inicializarUsuario();
    this.configurarFormularioSegunRol();
    this.configurarBusquedaContenidos();

    if (this.listaParaEditar) {
      this.cargarDatosLista();
    }
  }

  private inicializarUsuario(): void {
    const userJson = sessionStorage.getItem('user');
    if (!userJson) {
      this.router.navigate(['/login']);
      return;
    }

    const user = JSON.parse(userJson);
    this.userId = user.id;
    this.modo = sessionStorage.getItem('currentUserClass') === 'GestordeContenido' ? 'gestor' : 'visualizador';
  }

  private parseTags(tagsInput: string): string[] {
    // Si tenemos tags seleccionados, usar esos directamente
    if (this.selectedTags.length > 0) {
      return this.selectedTags;
    }
    
    // Fallback para compatibilidad con tags introducidos manualmente
    if (!tagsInput || tagsInput.trim() === '') return [];
    return tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0);
  }

  onSubmit(): void {
    if (this.listaForm.invalid) {
      this.listaForm.markAllAsTouched();
      return;
    }

    const contenidosUnicos = [...new Set(this.contenidosIds)];
    if (contenidosUnicos.length === 0) {
      this.mostrarErrorContenido = true;
      return;
    }

    this.guardando = true;
    this.mensajeErrorNombre = '';
    this.mensajeExito = '';

    const datosLista = this.construirDatosLista(contenidosUnicos);
    const observable = this.listaParaEditar ? 
      this.listaService.editarLista(this.listaParaEditar.id, datosLista) :
      this.listaService.crearLista(datosLista);
    
    observable.subscribe({
      next: (res: any) => this.manejarExitoLista(res),
      error: (err: any) => this.manejarErrorLista(err)
    });
  }

  private construirDatosLista(contenidosUnicos: string[]) {
    const fv = this.listaForm.getRawValue();
    return {
      nombre: fv.nombre.trim(),
      descripcion: fv.descripcion.trim(),
      tags: this.parseTags(fv.tagsInput),
      visible: this.modo === 'gestor' ? fv.visible : false,
      creadorId: this.userId,
      especializacionGestor: this.modo === 'gestor' ? fv.especializacion?.trim() : null,
      contenidosIds: contenidosUnicos
    };
  }

  private manejarExitoLista(res: any): void {
    this.guardando = false;
    if (res?.success) {
      this.handleSuccessfulListOperation(res);
    } else {
      this.mensajeErrorNombre = res?.mensaje || 'No se pudo procesar la lista';
    }
  }

  private manejarErrorLista(err: any): void {
    this.guardando = false;
    this.mensajeErrorNombre = (err.status === 400 && err.error?.mensaje) ? 
      err.error.mensaje : 'Error al procesar la lista. Inténtalo de nuevo.';
  }

  onCancelar(): void {
    if (this.modal) {
      this.cerrar.emit();
    } else {
      this.cancelada.emit();
    }
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
          catchError(() => of({ success: false, contenidos: [], total: 0, query: query.trim(), mensaje: 'Error al buscar contenidos' }))
        );
      })
    ).subscribe({
      next: (response) => {
        this.buscandoContenidos = false;
        if (response?.success) {
          this.contenidosEncontrados = response.contenidos || [];
          this.mostrarSugerencias = this.contenidosEncontrados.length > 0;
        } else {
          this.contenidosEncontrados = [];
          this.mostrarSugerencias = false;
        }
      }
    });
  }

  /**
   * Configura el formulario según el rol del usuario
   */
  private configurarFormularioSegunRol(): void {
    if (this.modo === 'visualizador') {
      // Para visualizadores: ocultar campo visible y forzar a false
      this.listaForm.patchValue({ visible: false });
      this.listaForm.get('visible')?.disable();
      this.listaForm.get('especializacion')?.clearValidators();
    } else {
      // Para gestores: habilitar campo visible, establecer como público por defecto y añadir validación a especialización
      this.listaForm.patchValue({ visible: true });
      this.listaForm.get('visible')?.enable();
      this.listaForm.get('especializacion')?.setValidators([Validators.required]);
    }
    this.listaForm.get('especializacion')?.updateValueAndValidity();
  }

  /**
   * Resetea el formulario con valores por defecto según el rol del usuario
   */
  private resetearFormulario(): void {
    const defaultValues = {
      nombre: '',
      descripcion: '',
      especializacion: '',
      visible: this.modo === 'gestor' ? true : false, // Gestor: público por defecto, Visualizador: privado
      tagsInput: ''
    };

    this.listaForm.reset(defaultValues);
    this.contenidosIds = [];
    this.nuevoContenido = '';
    this.mostrarErrorContenido = false;
    this.mensajeErrorNombre = '';
    this.mensajeExito = '';
    this.selectedTags = []; // Limpiar tags seleccionados
    
    // Limpiar búsqueda y caché
    this.contenidosEncontrados = [];
    this.mostrarSugerencias = false;
    this.buscandoContenidos = false;
    this.contenidosSeleccionados.clear();
    
    // Reconfigurar según el rol después del reset
    this.configurarFormularioSegunRol();
  }

  /**
   * Navegar de vuelta a la gestión de listas
   */
  volver(): void {
    this.router.navigate(['/dashboard/listas']);
  }

  /**
   * Maneja el cambio en el campo de búsqueda de contenidos
   */
  onBuscarContenido(): void {
    this.searchSubject.next(this.nuevoContenido);
  }

  /**
   * Selecciona un contenido de las sugerencias
   */
  seleccionarContenido(contenido: ContenidoSearchResult): void {
    if (this.contenidosIds.includes(contenido.id)) {
      alert('Este contenido ya está en la lista');
      return;
    }

    this.contenidosSeleccionados.set(contenido.id, contenido);
    this.contenidosIds.push(contenido.id);
    this.nuevoContenido = '';
    this.mostrarSugerencias = false;
    this.contenidosEncontrados = [];
    this.mostrarErrorContenido = false;
  }

  /**
   * Cierra las sugerencias
   */
  cerrarSugerencias(): void {
    setTimeout(() => {
      this.mostrarSugerencias = false;
    }, 200); // Pequeño delay para permitir clicks en las sugerencias
  }

  /**
   * Obtiene el nombre del contenido por su ID (para mostrar en la lista)
   */
  obtenerNombreContenido(id: string): string {
    const contenidoCacheado = this.contenidosSeleccionados.get(id);
    if (contenidoCacheado) {
      return `${contenidoCacheado.titulo} (${contenidoCacheado.tipo})`;
    }
    
    const contenidoEncontrado = this.contenidosEncontrados.find(c => c.id === id);
    if (contenidoEncontrado) {
      return `${contenidoEncontrado.titulo} (${contenidoEncontrado.tipo})`;
    }
    
    return `Contenido ID: ${id}`;
  }

  /**
   * Añade un nuevo contenido a la lista (método legacy mantenido para compatibilidad)
   */
  agregarContenido(): void {
    const contenidoTrimmed = this.nuevoContenido?.trim();
    if (!contenidoTrimmed) return;

    const contenidoEncontrado = this.contenidosEncontrados.find(c => 
      c.titulo.toLowerCase() === contenidoTrimmed.toLowerCase()
    );
    
    if (contenidoEncontrado) {
      this.seleccionarContenido(contenidoEncontrado);
      return;
    }
    
    if (this.contenidosIds.includes(contenidoTrimmed)) {
      alert('Este contenido ya está en la lista');
      return;
    }

    this.contenidosIds.push(contenidoTrimmed);
    this.nuevoContenido = '';
    this.mostrarErrorContenido = false;
    this.mostrarSugerencias = false;
  }

  /**
   * Quita un contenido de la lista
   */
  quitarContenido(index: number): void {
    if (this.contenidosIds.length <= 1) {
      alert('⚠️ Una lista debe tener al menos un contenido. No puedes eliminar el último elemento.');
      return;
    }

    const contenidoEliminado = this.contenidosIds[index];
    this.contenidosIds.splice(index, 1);
    this.contenidosSeleccionados.delete(contenidoEliminado);
  }

  /**
   * Verifica si se puede eliminar un contenido
   */
  puedeEliminarContenido(): boolean {
    return this.contenidosIds.length > 1;
  }

  /**
   * Formatea la duración en segundos a un formato legible (mm:ss o hh:mm:ss)
   */
  formatDuration(seconds: number): string {
    if (!seconds) return '';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Verifica si se puede crear la lista
   */
  puedeCrearLista(): boolean {
    return this.listaForm.valid && 
           this.contenidosIds.length > 0 && 
           !this.guardando;
  }

  /**
   * Carga los datos de una lista existente para edición
   */
  private cargarDatosLista(): void {
    if (!this.listaParaEditar) return;

    if (this.listaParaEditar.tags?.length > 0) {
      this.selectedTags = [...this.listaParaEditar.tags];
    }

    this.listaForm.patchValue({
      nombre: this.listaParaEditar.nombre || '',
      descripcion: this.listaParaEditar.descripcion || '',
      especializacion: this.listaParaEditar.especializacionGestor || '',
      visible: this.listaParaEditar.visible || false,
      tagsInput: this.selectedTags.join(', ')
    });

    if (this.listaParaEditar.contenidosIds?.length > 0) {
      this.contenidosIds = [...this.listaParaEditar.contenidosIds];
    }

    if (this.listaParaEditar.contenidos?.length > 0) {
      this.listaParaEditar.contenidos.forEach((contenido: any) => {
        this.contenidosSeleccionados.set(contenido.id, {
          id: contenido.id,
          titulo: contenido.titulo || contenido.nombre,
          tipo: contenido.tipo,
          duracion: contenido.duracion
        });
      });
    }
  }

  /**
   * Métodos para manejar selección múltiple de tags
   */
  toggleTag(tagValue: string) {
    const index = this.selectedTags.indexOf(tagValue);
    if (index > -1) {
      this.selectedTags.splice(index, 1);
    } else {
      this.selectedTags.push(tagValue);
    }
    
    // Actualizar el formulario
    this.listaForm.patchValue({ tagsInput: this.selectedTags.join(',') });
  }

  isTagSelected(tagValue: string): boolean {
    return this.selectedTags.includes(tagValue);
  }

  getSelectedTagsText(): string {
    if (this.selectedTags.length === 0) return '';
    return this.selectedTags.map(tag => {
      const tagObj = this.availableListTags.find(t => t.value === tag);
      return tagObj ? tagObj.label : tag;
    }).join(', ');
  }

  /**
   * Verifica si hay al menos un tag seleccionado
   */
  hasSelectedTags(): boolean {
    return this.selectedTags.length > 0;
  }

  /**
   * Obtiene el número de tags seleccionados
   */
  getSelectedTagsCount(): number {
    return this.selectedTags.length;
  }

  /**
   * Obtiene el título del modal/componente según el modo
   */
  get tituloModal(): string {
    return this.listaParaEditar ? 'Editar lista' : 'Crear nueva lista';
  }

  /**
   * Obtiene el texto del botón de submit según el modo
   */
  get textoBotonSubmit(): string {
    if (this.guardando) {
      return this.listaParaEditar ? 'Actualizando...' : 'Creando...';
    }
    return this.listaParaEditar ? 'Actualizar lista' : 'Crear lista';
  }

  /**
   * Maneja el caso de operación exitosa (crear/editar lista)
   */
  private handleSuccessfulListOperation(res: any): void {
    const accion = this.listaParaEditar ? 'actualizada' : 'creada';
    this.mensajeExito = `✅ Lista ${accion} correctamente`;
    
    if (this.modal) {
      if (this.listaParaEditar) {
        this.editada.emit(res.lista);
      } else {
        this.creada.emit(res.lista);
      }
      setTimeout(() => this.resetearFormulario(), 500);
    } else {
      setTimeout(() => this.router.navigate(['/dashboard/listas']), 2000);
      this.resetearFormulario();
    }
  }
}
