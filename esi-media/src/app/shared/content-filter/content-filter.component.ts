import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TagOption { value: string; label: string; }

export interface ContentFilterDTO {
  contentType: 'all' | 'video' | 'audio';
  tags: string[];
  suscripcion: 'ANY' | 'VIP' | 'STANDARD';
  edad: 'TP' | '18' | null;
  resoluciones: string[];
}

@Component({
  selector: 'app-content-filter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './content-filter.component.html',
  styleUrl: './content-filter.component.css'
})
export class ContentFilterComponent {
  // Implement lifecycle to react to input changes
  ngOnInit(): void {
    // Inicializar activeContentType según el input; si no viene forzado, por defecto a 'video'
    this.lockedContentType = this.contentType !== 'all';
    this.activeContentType = this.lockedContentType ? this.contentType : (this.activeContentType === 'all' ? 'video' : this.activeContentType);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['contentType']) {
      this.lockedContentType = this.contentType !== 'all';
      if (this.lockedContentType) {
        // Si el padre fuerza el tipo, usarlo y evitar cambios locales
        this.activeContentType = this.contentType;
      } else {
        // Si no viene forzado y no hay selección local, default a video
        if (this.activeContentType === 'all') this.activeContentType = 'video';
      }
    }
  }
  @Input() contentType: 'all' | 'video' | 'audio' = 'all';
  // Compatibilidad: emitimos por defecto un string[] con los tags seleccionados
  @Output() filtersApplied = new EventEmitter<string[]>();
  // Nuevo: emitimos el objeto completo de filtros para quien quiera usarlo
  @Output() filtersChanged = new EventEmitter<ContentFilterDTO>();

  // UI state
  // Mantener un tipo activo localmente; si el input `contentType` viene forzado (no 'all'), lo bloqueamos
  activeContentType: 'all' | 'video' | 'audio' = 'all';
  lockedContentType = false;
  // Tags separados por sub-panel para evitar mezclar selecciones de vídeo y audio
  selectedTagsVideo: string[] = [];
  selectedTagsAudio: string[] = [];
  showFilterPanel = false;
  // Mostrar directamente las lanes/controles avanzados para que sea interactuable
  initialScreen = false; // first tab is advanced lanes by default
  allowApplyFromInitial = true;

  // filtros adicionales (internos, por ahora no se emiten fuera)
  selectedSuscripcion: 'ANY' | 'VIP' | 'STANDARD' = 'ANY';
  selectedEdad: 'TP' | '18' | null = null;
  selectedResolutions: string[] = [];
  
  toggleResolution(res: string): void {
    const idx = this.selectedResolutions.indexOf(res);
    if (idx > -1) this.selectedResolutions.splice(idx, 1);
    else this.selectedResolutions.push(res);
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
    // No forzar la pantalla inicial: dejar que el usuario vea las lanes por defecto
    // Resetear allowApplyFromInitial cuando cerramos el panel
    if (!this.showFilterPanel) {
      this.initialScreen = false;
      this.allowApplyFromInitial = true;
    }
  }

  /**
   * Selecciona o deselecciona un tag
   */
  toggleTag(tagValue: string): void {
    const current = [...this.selectedTags];
    const index = current.indexOf(tagValue);
    if (index > -1) current.splice(index, 1);
    else current.push(tagValue);
    this.setSelectedTags(current);
  }

  selectContentType(type: 'video' | 'audio'): void {
    // Si el padre forzó contentType (no 'all'), no permitimos cambiar
    if (this.contentType !== 'all') return;
    this.activeContentType = type;
    this.initialScreen = false;
  }

  /**
   * Verifica si un tag está seleccionado
   */
  isTagSelected(tagValue: string): boolean {
    return this.selectedTags.includes(tagValue);
  }

  /**
   * Aplica los filtros seleccionados
   */
  applyFilters(): void {
    this.filtersApplied.emit([...this.selectedTags]);
    const payload: ContentFilterDTO = {
      contentType: this.activeContentType === 'all' ? this.contentType : this.activeContentType,
      tags: [...this.selectedTags],
      suscripcion: this.selectedSuscripcion,
      edad: this.selectedEdad,
      resoluciones: [...this.selectedResolutions]
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
    this.selectedSuscripcion = 'ANY';
    this.selectedEdad = null;
    this.selectedResolutions = [];
    // permitir aplicar desde la pantalla inicial para "limpiar rápido"
    this.allowApplyFromInitial = true;
    // Emitir cambios tras limpiar para que el receptor pueda recargar
    this.filtersApplied.emit([]);
    this.filtersChanged.emit({
      contentType: this.activeContentType === 'all' ? this.contentType : this.activeContentType,
      tags: [],
      suscripcion: this.selectedSuscripcion,
      edad: this.selectedEdad,
      resoluciones: []
    });
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