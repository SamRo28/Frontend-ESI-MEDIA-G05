import { Component, Input, Output, EventEmitter, SimpleChanges, OnInit, OnChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

export interface TagOption { value: string; label: string; }

export interface ContentFilterDTO {
  contentType: 'all' | 'video' | 'audio';
  tags: string[];
  suscripcion: 'ANY' | 'VIP' | 'STANDARD';
  edad: 'TP' | '18' | null;
  resoluciones: string[];
  // Especial: modo opcional para filtros avanzados
  specialMode?: 'top-contents' | 'top-tags' | 'top-rated';
  specialPayload?: any;
}

@Component({
  selector: 'app-content-filter',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './content-filter.component.html',
  styleUrls: ['./content-filter.component.css']
})
export class ContentFilterComponent implements OnInit, OnChanges {
  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  @Input() contentType: 'all' | 'video' | 'audio' = 'all';
  @Input() allowSpecial = true;
  @Output() filtersApplied = new EventEmitter<string[]>();
  @Output() filtersChanged = new EventEmitter<ContentFilterDTO>();

  // UI state
  // Mantener un tipo activo localmente; si el input `contentType` viene forzado (no 'all'), lo bloqueamos
  activeContentType: 'all' | 'video' | 'audio' | 'special' = 'all';
  lockedContentType = false;
  // Tags separados por sub-panel para evitar mezclar selecciones de vídeo y audio
  selectedTagsVideo: string[] = [];
  selectedTagsAudio: string[] = [];
  showFilterPanel = false;
  // Mostrar directamente las lanes/controles avanzados para que sea interactuable
  initialScreen = false;
  allowApplyFromInitial = true;

  // filtros adicionales
  selectedSuscripcion: 'ANY' | 'VIP' | 'STANDARD' = 'ANY';
  selectedEdad: 'TP' | '18' | null = null;
  // Solo una resolución permitida (o ninguna). Null = todas
  selectedResolution: string | null = null;

  // Especial
  selectedSpecialMode: 'none' | 'top-contents' | 'top-tags' | 'top-rated' = 'none';
  topContentsResults: any[] = [];
  topTagsResults: Array<{ tag: string; label?: string; views: number }> = [];
  loadingSpecial = false;
  specialError: string | null = null;
  // selección temporal dentro del subpanel especial (no modifica tags de vídeo/audio hasta aplicar)
  specialSelectedTags: string[] = [];

  ngOnInit(): void {
    this.lockedContentType = this.contentType !== 'all';
    if (this.lockedContentType) this.activeContentType = this.contentType;
    else if (this.activeContentType === 'all') this.activeContentType = 'video';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['contentType']) {
      this.lockedContentType = this.contentType !== 'all';
      if (this.lockedContentType) this.activeContentType = this.contentType;
      else if (this.activeContentType === 'all') this.activeContentType = 'video';
    }
  }

  selectResolution(res: string | null): void {
    if (res === null) { this.selectedResolution = null; return; }
    if (this.selectedResolution === res) this.selectedResolution = null;
    else this.selectedResolution = res;
  }

  // Getter para las tags activas según el sub-panel
  get selectedTags(): string[] {
    return this.activeContentType === 'audio' ? this.selectedTagsAudio : this.selectedTagsVideo;
  }

  // Setter helper (no-op used by toggleTag)
  private setSelectedTags(arr: string[]) {
    if (this.activeContentType === 'audio') this.selectedTagsAudio = arr;
    else this.selectedTagsVideo = arr;
  }

  // Tags predefinidos para videos
  private readonly videoTags: TagOption[] = [
    { value: 'cocina', label: 'Cocina' },
    { value: 'programacion', label: 'Programación' },
    { value: 'videojuegos', label: 'Videojuegos' },
    { value: 'musica', label: 'Música' },
    { value: 'educativo', label: 'Educativo' },
    { value: 'tutorial', label: 'Tutorial' },
    { value: 'entretenimiento', label: 'Entretenimiento' },
    { value: 'deportes', label: 'Deportes' },
    { value: 'tecnologia', label: 'Tecnología' },
    { value: 'arte', label: 'Arte y Diseño' },
    { value: 'viajes', label: 'Viajes' },
    { value: 'salud', label: 'Salud y Fitness' },
    { value: 'comedia', label: 'Comedia' },
    { value: 'documentales', label: 'Documentales' },
    { value: 'noticias', label: 'Noticias' }
  ];

  // Tags predefinidos para audios
  private readonly audioTags: TagOption[] = [
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
    { value: 'podcast', label: 'Podcast' },
    { value: 'audiolibro', label: 'Audiolibro' },
    { value: 'instrumental', label: 'Instrumental' },
    { value: 'acustico', label: 'Acústico' }
  ];

  /**
   * Obtiene los tags disponibles según el tipo de contenido
   */
  get availableTags(): TagOption[] {
    if (this.activeContentType === 'video') return this.videoTags;
    if (this.activeContentType === 'audio') return this.audioTags;
    return [...this.videoTags, ...this.audioTags];
  }

  /**
   * Abre/cierra el panel de filtros
   */
  toggleFilterPanel(): void {
    this.showFilterPanel = !this.showFilterPanel;
    if (!this.showFilterPanel) {
      this.initialScreen = false;
      this.allowApplyFromInitial = true;
    }
  }

  /**
   * Selecciona o deselecciona un tag
   */
  toggleTag(tagValue: string): void {
    // si estamos en special/top-tags, usar la selección temporal
    if (this.activeContentType === 'special' && this.selectedSpecialMode === 'top-tags') {
      const cur = [...this.specialSelectedTags];
      const idx = cur.indexOf(tagValue);
      if (idx > -1) cur.splice(idx, 1);
      else cur.push(tagValue);
      this.specialSelectedTags = cur;
      return;
    }
    const current = [...this.selectedTags];
    const index = current.indexOf(tagValue);
    if (index > -1) current.splice(index, 1);
    else current.push(tagValue);
    this.setSelectedTags(current);
  }

  selectContentType(type: 'video' | 'audio'): void {
    if (this.contentType !== 'all') return;
    this.activeContentType = type;
    this.initialScreen = false;
    if (type === 'audio') this.selectedResolution = null;
  }

  // Abre el subpanel Especial
  openSpecial(): void {
    if (!this.allowSpecial) return;
    if (this.contentType !== 'all') return;
    this.activeContentType = 'special';
    this.selectedSpecialMode = 'none';
    this.topContentsResults = [];
    this.topTagsResults = [];
    this.specialError = null;
    this.specialSelectedTags = [];
  }

  selectSpecialMode(mode: 'top-contents' | 'top-tags' | 'top-rated'): void {
    this.selectedSpecialMode = mode;
    this.topContentsResults = [];
    this.topTagsResults = [];
    this.specialError = null;
    this.specialSelectedTags = [];
    if (mode === 'top-tags') this.fetchTopTags(5);
    else if (mode === 'top-contents') this.fetchTopContents(5);
    else if (mode === 'top-rated') this.fetchTopRatedContents(5); 
  }

  private fetchTopTags(limit = 5): void {
    this.loadingSpecial = true;
    this.http.get<any[]>(`/api/filtradoContenidosAvanzado/top-tags?limit=${limit}`).subscribe({
      next: (res) => {
        this.topTagsResults = res.map(r => ({ tag: r.tag, label: r.label || r.tag, views: r.views }));
        this.specialSelectedTags = [];
        this.finishLoadingSpecial();
      },
      error: (err) => {
        this.specialError = 'Error al cargar Top-Tags';
        this.finishLoadingSpecial();
      }
    });
  }

  private fetchTopContents(limit = 5): void {
    this.loadingSpecial = true;
    this.http.get<any[]>(`/api/filtradoContenidosAvanzado/top-contents?limit=${limit}`).subscribe({
      next: (res) => {
        this.topContentsResults = res;
        this.finishLoadingSpecial();
      },
      error: (err) => {
        this.specialError = 'Error al cargar Top-Contents';
        this.finishLoadingSpecial();
      }
    });
  }

  private fetchTopRatedContents(limit = 5): void {
  this.loadingSpecial = true;
  this.http.get<any[]>(`/api/filtradoContenidosAvanzado/top-rated-contents?limit=${limit}`).subscribe({
    next: (res) => {
      this.topContentsResults = res;
      this.finishLoadingSpecial();
    },
    error: (err) => {
      this.specialError = 'Error al cargar Top-Rated';
      this.finishLoadingSpecial();
    }
  });
  }

  private finishLoadingSpecial(): void {
    // Desactivar indicador y forzar detección de cambios de forma robusta
    this.loadingSpecial = false;
    this.cdr.detectChanges();
    // También forzar en microtask para evitar races con el DOM/overlay
    Promise.resolve().then(() => this.cdr.detectChanges());
  }

  // Aplicar los tags obtenidos del Top-Tags como filtros normales (usuario lo decide)
  applyTopTagsAsFilters(): void {
    const selectedFromUi = (this.specialSelectedTags && this.specialSelectedTags.length > 0)
      ? [...this.specialSelectedTags]
      : this.topTagsResults.map(t => t.tag);
    const tagsToApply = selectedFromUi;
    const payload: ContentFilterDTO = {
      contentType: this.contentType,
      tags: [...tagsToApply],
      suscripcion: this.selectedSuscripcion,
      edad: this.selectedEdad,
      resoluciones: [],
      specialMode: 'top-tags',
      specialPayload: { tags: tagsToApply, matchMode: 'AND' }
    };
    this.filtersChanged.emit(payload);
    this.showFilterPanel = false;
  }

  // Aplicar top-contents: emitimos un modo especial con la lista de contenidos (el receptor puede decidir cómo mostrarlo)
  applyTopContentsAsSpecial(): void {
    const payload: ContentFilterDTO = {
      contentType: this.contentType,
      tags: [],
      suscripcion: this.selectedSuscripcion,
      edad: this.selectedEdad,
      resoluciones: [],
      specialMode: 'top-contents',
      specialPayload: { contents: this.topContentsResults }
    };
    this.filtersChanged.emit(payload);
    this.showFilterPanel = false;
  }

  // Aplicar top-rated: emitimos un modo especial con la lista de contenidos (el receptor puede decidir cómo mostrarlo)
  applyTopRatedAsSpecial(): void {
  const payload: ContentFilterDTO = {
    contentType: this.contentType,
    tags: [],
    suscripcion: this.selectedSuscripcion,
    edad: this.selectedEdad,
    resoluciones: [],
    specialMode: 'top-rated',
    specialPayload: { contents: this.topContentsResults }
  };
  this.filtersChanged.emit(payload);
  this.showFilterPanel = false;
  }

  // Setter para suscripción que permite lógica adicional (p.ej. limpiar resolución 4K si no aplica)
  setSuscripcion(value: 'ANY' | 'VIP' | 'STANDARD'): void {
    this.selectedSuscripcion = value;
    // Si se selecciona 'STANDARD' y actualmente está seleccionado 4K (2160p), limpiarlo
    if (value === 'STANDARD' && this.selectedResolution === '2160p') {
      this.selectedResolution = null;
    }
  }

  /**
   * Verifica si un tag está seleccionado
   */
  isTagSelected(tagValue: string): boolean {
    if (this.activeContentType === 'special' && this.selectedSpecialMode === 'top-tags') return this.specialSelectedTags.includes(tagValue);
    return this.selectedTags.includes(tagValue);
  }

  /**
   * Aplica los filtros seleccionados
   */
  applyFilters(): void {
    this.filtersApplied.emit([...this.selectedTags]);
    const emittedContentType: 'all' | 'video' | 'audio' = (this.activeContentType === 'video' || this.activeContentType === 'audio') ? this.activeContentType : this.contentType;
    const payload: ContentFilterDTO = {
      contentType: emittedContentType,
      tags: [...this.selectedTags],
      suscripcion: this.selectedSuscripcion,
      edad: this.selectedEdad,
      resoluciones: this.selectedResolution ? [this.selectedResolution] : []
    };
    this.filtersChanged.emit(payload);
    this.showFilterPanel = false;
  }

  /**
   * Limpia todos los filtros seleccionados
   */
  clearFilters(): void {
    // Limpiar ambas colecciones para evitar que queden filtros de ambos sub-paneles
    this.selectedTagsAudio = [];
    this.selectedTagsVideo = [];
    // Si estamos en el subpanel Especial, también limpiar la selección temporal
    this.specialSelectedTags = [];
    // Resetear también el estado del subpanel 'Especial' para que vuelva a la vista sin selección
    this.selectedSpecialMode = 'none';
    this.topTagsResults = [];
    this.topContentsResults = [];
    this.specialError = null;
    this.loadingSpecial = false;
    this.selectedSuscripcion = 'ANY';
    this.selectedEdad = null;
    this.selectedResolution = null;
    // permitir aplicar desde la pantalla inicial para "limpiar rápido"
    this.allowApplyFromInitial = true;
    // Emitir cambios tras limpiar para que el receptor pueda recargar
    this.filtersApplied.emit([]);
    this.filtersChanged.emit({
      contentType: (this.activeContentType === 'video' || this.activeContentType === 'audio') ? this.activeContentType : this.contentType,
      tags: [],
      suscripcion: this.selectedSuscripcion,
      edad: this.selectedEdad,
      resoluciones: []
    });
    // Forzar detección de cambios para que la UI (especialmente el subpanel 'Especial') refleje la limpieza
    this.cdr.detectChanges();
    Promise.resolve().then(() => this.cdr.detectChanges());
  }

  /**
   * Obtiene el texto descriptivo de los tags seleccionados
   */
  getSelectedTagsText(): string {
    if (this.selectedTags.length === 0) return '';
    return this.selectedTags.map(tagValue => {
      const tagObj = this.availableTags.find(t => t.value === tagValue);
      return tagObj ? tagObj.label : tagValue;
    }).join(', ');
  }

  /**
   * Cuenta total de tags seleccionados
   */
  get selectedCount(): number {
    return this.selectedTags.length;
  }

  /**
   * Obtiene el icono según el tipo de contenido
   */
  get filterIcon(): string {
    switch (this.activeContentType) {
      case 'video': return '🎬';
      case 'audio': return '🎵';
      default: return '🔍';
    }
  }

  /**
   * Obtiene el texto del botón de filtro
   */
  get filterButtonText(): string {
    if (this.selectedCount > 0) {
      return `FILTRAR (${this.selectedCount})`;
    }
    return 'FILTRAR';
  }

  /**
   * Cierra el panel si se hace clic fuera
   */
  onBackdropClick(): void {
    this.showFilterPanel = false;
  }

  /**
   * Previene el cierre del panel al hacer clic dentro
   */
  onPanelClick(event: Event): void {
    event.stopPropagation();
  }
}