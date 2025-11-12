import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TagOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-content-filter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './content-filter.component.html',
  styleUrl: './content-filter.component.css'
})
export class ContentFilterComponent {
  @Input() contentType: 'all' | 'video' | 'audio' = 'all';
  @Output() filtersApplied = new EventEmitter<string[]>();

  selectedTags: string[] = [];
  showFilterPanel = false;

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
    if (this.contentType === 'video') {
      return this.videoTags;
    }
    if (this.contentType === 'audio') {
      return this.audioTags;
    }
    // Para 'all', combinar ambos arrays
    return [...this.videoTags, ...this.audioTags];
  }

  /**
   * Abre/cierra el panel de filtros
   */
  toggleFilterPanel(): void {
    this.showFilterPanel = !this.showFilterPanel;
  }

  /**
   * Selecciona o deselecciona un tag
   */
  toggleTag(tagValue: string): void {
    const index = this.selectedTags.indexOf(tagValue);
    if (index > -1) {
      this.selectedTags.splice(index, 1);
    } else {
      this.selectedTags.push(tagValue);
    }
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
    this.showFilterPanel = false;
  }

  /**
   * Limpia todos los filtros seleccionados
   */
  clearFilters(): void {
    this.selectedTags = [];
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
    switch (this.contentType) {
      case 'video':
        return '🎬';
      case 'audio':
        return '🎵';
      default:
        return '🔍';
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