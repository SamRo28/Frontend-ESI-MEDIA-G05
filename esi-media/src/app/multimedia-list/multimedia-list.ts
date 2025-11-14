import { Component, OnInit, OnChanges, SimpleChanges, inject, ChangeDetectorRef, Input, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive, ActivatedRoute, Router } from '@angular/router';
import { MultimediaService, ContenidoResumenDTO, PageResponse } from '../services/multimedia.service';
import { forkJoin } from 'rxjs';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-multimedia-list',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './multimedia-list.html',
  styleUrl: './multimedia-list.css'
})
export class MultimediaListComponent implements OnInit, OnChanges {
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);
  @Input() showHeader: boolean = true;
  @Input() showTitle: boolean = true;
  @Input() tipoForzado: 'AUDIO' | 'VIDEO' | null = null;
  @Input() tagFilters: string[] = [];
  // Aceptar objeto completo de filtros aparte de los tags (suscripcion, edad, resoluciones)
  @Input() filtersObject: any = null;
  pagina = 0;
  tamano = 12;
  cargando = false;
  errores: string | null = null;
  contenido: ContenidoResumenDTO[] = [];
  totalPaginas: number | null = null;
  totalElementos: number | null = null;

  // Para soportar forzar tipo VIDEO cuando se selecciona resolución
  filtroTipo: 'AUDIO' | 'VIDEO' | null = null;
  private originalFiltroTipo: 'AUDIO' | 'VIDEO' | null = null;
  private forcedByResolution = false;

  constructor(private multimedia: MultimediaService, private route: ActivatedRoute, private router: Router) {}

  ngOnChanges(changes: SimpleChanges): void {
    // Detectar cambios en tagFilters o filtersObject (incluye la primera emisión)
    const tagChange = !!changes['tagFilters'];
    const objChange = !!changes['filtersObject'];

    if (!(tagChange || objChange)) return;

    // Si viene un modo especial 'top-contents', manejar y salir temprano
    if (this.handleSpecialModeEarlyReturn()) return;

    // Forzar tipo por resolución si aplica
    this.handleResolutionForcing();

    // Si se han limpiado todos los filtros, limpiar cache y recargar página actual
    const noFilters = this.isFiltersEmpty();
    if (noFilters) {
      this.multimedia.clearCache();
      this.cargar(this.pagina);
    } else {
      // Aplicar filtros: ir a página 0
      this.cargar(0);
    }
  }

  private handleSpecialModeEarlyReturn(): boolean {
    if (this.filtersObject?.specialMode === 'top-contents') {
      const contents = this.filtersObject?.specialPayload?.contents ?? [];
      // Intentamos mapear a ContenidoResumenDTO si vienen campos necesarios
      this.contenido = Array.isArray(contents) ? contents as ContenidoResumenDTO[] : [];
      this.pagina = 0;
      this.totalPaginas = this.contenido.length > 0 ? 1 : 0;
      this.totalElementos = this.contenido.length;
      this.cargando = false;
      this.cdr.markForCheck();
      return true;
    }
    return false;
  }

  private handleResolutionForcing(): void {
    const resCount = this.filtersObject?.resoluciones?.length || 0;
    if (resCount > 0 && !this.forcedByResolution) {
      // guardar el tipo previo y forzar VIDEO
      this.originalFiltroTipo = this.originalFiltroTipo ?? this.filtroTipo;
      this.filtroTipo = 'VIDEO';
      this.forcedByResolution = true;
    }
    // Si se han limpiado las resoluciones y nosotros forzamos el tipo, restaurar
    if (resCount === 0 && this.forcedByResolution) {
      this.filtroTipo = this.originalFiltroTipo;
      this.forcedByResolution = false;
    }
  }

  private isFiltersEmpty(): boolean {
    const tagsEmpty = !Array.isArray(this.tagFilters) || this.tagFilters.length === 0;
    if (!this.filtersObject) return tagsEmpty;
    
    const objEmpty = (!Array.isArray(this.filtersObject.tags) || this.filtersObject.tags.length === 0) &&
                     (!this.filtersObject.suscripcion || this.filtersObject.suscripcion === 'ANY') &&
                     (!this.filtersObject.edad) &&
                     (!Array.isArray(this.filtersObject.resoluciones) || this.filtersObject.resoluciones.length === 0);
    return tagsEmpty && objEmpty;
  }

  ngOnInit(): void {
    // Evitar peticiones en SSR
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    // Filtro inicial: preferir tipo forzado por el contenedor (p.ej. dashboard)
    if (this.tipoForzado === 'VIDEO' || this.tipoForzado === 'AUDIO') {
      this.filtroTipo = this.tipoForzado;
    } else {
      // Filtro por ruta dedicada si no hay query param
      const url = this.router.url || '';
      if (url.includes('/dashboard/videos') || url.includes('/multimedia/videos')) this.filtroTipo = 'VIDEO';
      else if (url.includes('/dashboard/audios') || url.includes('/multimedia/audios')) this.filtroTipo = 'AUDIO';
    }
    // Guardar el filtro inicial para poder restaurarlo si el usuario aplica filtro por resolución
    this.originalFiltroTipo = this.filtroTipo;

    this.route.queryParamMap.subscribe(params => {
      // Si hay tipoForzado, ignoramos el query param para mantener consistencia de la vista
      if (this.tipoForzado === 'VIDEO' || this.tipoForzado === 'AUDIO') {
        if (this.contenido.length === 0) this.cargar();
        return;
      }
      const requested = params.get('tipo');
      // Solo actualizamos filtro si el query param es explícito; si no existe, mantenemos el de la ruta dedicada
      if (requested === 'AUDIO' || requested === 'VIDEO') {
        if (requested !== this.filtroTipo) {
          this.filtroTipo = requested;
          this.pagina = 0;
          this.cargar();
          return;
        }
      } else if (this.contenido.length === 0) {
        // Primera carga cuando no hay query param (rutas /videos o /audios ya ajustaron filtroTipo arriba)
        this.cargar();
      }
    });
  }

  cargar(pagina: number = this.pagina): void {
    this.cargando = true;
    this.errores = null;
    // Zoneless: asegurar refresco de vista
    this.cdr.markForCheck();
    // Forzar evaluación inmediata de change detection (intento de mitigar problemas de sincronización)
    this.cdr.detectChanges();
    this.multimedia.listar(pagina, this.tamano, this.filtroTipo ?? undefined).subscribe({
      next: (resp: PageResponse<ContenidoResumenDTO>) => {
        const items = resp.content || [];

        // Determinar qué campos requiere el filtrado actual
        const needTags = Array.isArray(this.tagFilters) && this.tagFilters.length > 0 ||
             (this.filtersObject && Array.isArray(this.filtersObject.tags) && this.filtersObject.tags.length > 0);
        const needEdad = !!(this.filtersObject?.edad);
        const needRes = !!(this.filtersObject?.resoluciones?.length);

        const itemsWithoutRequired = items.filter(i => {
          if (needTags && !Array.isArray((i as any).tags)) return true;
          if (needEdad && typeof (i as any).edadvisualizacion !== 'number') return true;
          if (needRes && typeof (i as any).resolucion !== 'string') return true;
          return false;
        });

        const proceed = (resolvedItems: ContenidoResumenDTO[]) => {

          // Aplicar filtro de tipo si corresponde
          let contenidoFiltrado = this.filtroTipo ? resolvedItems.filter(i => i.tipo === this.filtroTipo) : resolvedItems;
          // Aplicar filtrado combinado (tags + suscripción + edad + resolución)
          contenidoFiltrado = this.applyFilteringCombined(contenidoFiltrado);

          this.contenido = contenidoFiltrado;
          this.totalPaginas = typeof resp.totalPages === 'number' ? resp.totalPages : null;
          this.totalElementos = typeof resp.totalElements === 'number' ? resp.totalElements : null;
          this.pagina = pagina;
          this.cargando = false;
          this.prefetchSiguiente();
          this.cdr.markForCheck();
        };

        if (itemsWithoutRequired.length > 0) {
          const calls = itemsWithoutRequired.map(it => this.multimedia.detalle(it.id).pipe(take(1)));
          forkJoin(calls).subscribe({
            next: (details: any[]) => {
              this.applyDetailsToItems(details, items);
              proceed(items);
            },
            error: (err) => {
              proceed(items);
            }
          });
        } else {
          proceed(items);
        }
      },
      error: (err) => {
        this.errores = (err?.error?.mensaje) || 'No se pudo cargar el contenido';
        this.cargando = false;
        // Zoneless: asegurar refresco de vista
        this.cdr.markForCheck();
      }
    });
  }

  get titulo(): string {
    if (this.filtroTipo === 'VIDEO') return 'Videos';
    if (this.filtroTipo === 'AUDIO') return 'Audios';
    return 'Multimedia';
  }

  anterior(): void {
    if (this.pagina > 0) {
      this.cargar(this.pagina - 1);
    }
  }

  siguiente(): void {
    if (!this.esUltimaPagina()) {
      this.cargar(this.pagina + 1);
    }
  }

  esUltimaPagina(): boolean {
    if (this.totalPaginas != null) {
      return this.pagina >= this.totalPaginas - 1;
    }
    // Fallback heurístico si el backend no envía totalPages
    return this.contenido.length < this.tamano;
  }

  caratulaUrl(item: ContenidoResumenDTO): string | null {
    const c: any = (item as any).caratula;
    if (!c) return null;
    if (typeof c === 'string') return c; // puede ser data URL o URL absoluta
    if (typeof c === 'object') {
      if (typeof c.url === 'string') return c.url;
      if (typeof c.src === 'string') return c.src;
      if (typeof c.data === 'string') return c.data; // base64 ya preparado
    }
    return null;
  }

  trackById(index: number, item: ContenidoResumenDTO): string { return item.id; }

  /**
   * Filtrado combinado: tags (con lógica AND), suscripción, edad y resolución.
   * Usa filtersObject si está disponible, sino cae a tagFilters para compatibilidad.
   */
  private applyFilteringCombined(items: ContenidoResumenDTO[]): ContenidoResumenDTO[] {
    const fObj = this.filtersObject;
    
    // Extraer tags de manera más legible
    let tags: string[] = [];
    if (fObj && Array.isArray(fObj.tags)) {
      tags = fObj.tags;
    } else if (Array.isArray(this.tagFilters)) {
      tags = this.tagFilters;
    }
    
    const filters = {
      tags: tags,
      suscripcion: fObj ? (fObj.suscripcion || 'ANY') : 'ANY',
      edad: fObj ? fObj.edad : null,
      resoluciones: fObj && Array.isArray(fObj.resoluciones) ? fObj.resoluciones : [],
      // specialMode / specialPayload (si vienen)
      specialMode: fObj ? fObj.specialMode : undefined,
      specialPayload: fObj ? fObj.specialPayload : undefined
    };

    // Si no hay filtros activos, devolver todos los items
    const noFilters = filters.tags.length === 0 && filters.suscripcion === 'ANY' && 
                      !filters.edad && filters.resoluciones.length === 0;
    if (noFilters) return items;
    
    return items.filter(item => this.matchesAllFilters(item, filters));
  }

  private matchesAllFilters(item: ContenidoResumenDTO, filters: any): boolean {
    // Si es un modo especial top-tags, aplicar solo la comprobación de tags (OR)
    if (filters?.specialMode === 'top-tags') {
      return this.matchesTags(item, filters.tags, filters);
    }
    return this.matchesTags(item, filters.tags, filters) &&
           this.matchesSuscripcion(item, filters.suscripcion) &&
           this.matchesEdad(item, filters.edad) &&
           this.matchesResolucion(item, filters.resoluciones);
  }

  private matchesTags(item: ContenidoResumenDTO, tags: string[], filters?: any): boolean {
    if (!Array.isArray(tags) || tags.length === 0) return true;

    const itemTags = (item as any).tags;
    if (!Array.isArray(itemTags)) return false;


    return tags.every((tag: string) => itemTags.includes(tag));
  }

  private matchesSuscripcion(item: ContenidoResumenDTO, suscripcion: string): boolean {
    if (suscripcion === 'ANY') return true;
    if (suscripcion === 'VIP') return item.vip === true;
    if (suscripcion === 'STANDARD') return item.vip === false;
    return true;
  }

  private matchesEdad(item: ContenidoResumenDTO, edad: string | null): boolean {
    if (!edad) return true;
    
    const itemEdad = (item as any).edadvisualizacion;
    if (typeof itemEdad !== 'number') {
      return false; // Si no tiene edad válida, no pasa filtro de edad
    }
    
    if (edad === 'TP') {
      return itemEdad === 0; // TP significa 0
    }
    if (edad === '18') {
      return itemEdad >= 18; // +18 significa 18
    }
    
    return true;
  }

  private matchesResolucion(item: ContenidoResumenDTO, resoluciones: string[]): boolean {
    if (resoluciones.length === 0) return true;
    
    // Solo aplicar filtro de resolución a videos
    if (item.tipo !== 'VIDEO') {
      return true; // Los audios pasan automáticamente este filtro
    }
    
    const itemResolucion = (item as any).resolucion;
    if (typeof itemResolucion !== 'string') {
      return false; // Si es video pero no tiene resolución, no pasa el filtro
    }
    
    return resoluciones.includes(itemResolucion);
  }

  private applyDetailsToItems(details: any[], items: ContenidoResumenDTO[]): void {
    for (const d of details) {
      const match = items.find(i => i.id === d.id);
      if (!match) continue;

      // Aplicar tags, edad y resolución
      const tagsFromDetail = this.extractTagsFromDetail(d);
      (match as any).tags = tagsFromDetail ?? (match as any).tags ?? [];

      const edadFromDetail = this.extractEdadFromDetail(d);
      if (typeof edadFromDetail === 'number') (match as any).edadvisualizacion = edadFromDetail;

      const resolFromDetail = this.extractResolucionFromDetail(d);
      if (resolFromDetail) {
        (match as any).resolucion = resolFromDetail;
      }
    }
  }

  private extractTagsFromDetail(d: any): string[] | undefined {
    if (Array.isArray(d.tags)) return d.tags;
    if (Array.isArray(d.tag_list)) return d.tag_list;
    if (Array.isArray(d.tags_list)) return d.tags_list;
    return undefined;
  }

  private extractEdadFromDetail(d: any): number | undefined {
    if (typeof d.edadvisualizacion === 'number') return d.edadvisualizacion;
    if (typeof d.edad === 'number') return d.edad;
    if (typeof d.edadVisualizacion === 'number') return d.edadVisualizacion;
    return undefined;
  }

  private extractResolucionFromDetail(d: any): string | undefined {
    if (typeof d.resolucion === 'string') return d.resolucion;
    if (typeof d.resolution === 'string') return d.resolution;
    if (typeof d.resolucion_video === 'string') return d.resolucion_video;
    return undefined;
  }

  private prefetchSiguiente(): void {
  const siguiente = this.pagina + 1;
    // Si conocemos totalPaginas, solo prefetch si hay siguiente
    if (this.totalPaginas != null) {
      if (siguiente < this.totalPaginas) this.multimedia.prefetch(siguiente, this.tamano, this.filtroTipo ?? undefined);
      return;
    }
    // Si no conocemos totalPaginas, usa heurística: prefetch si llenamos la página
    if (this.contenido.length >= this.tamano) {
      this.multimedia.prefetch(siguiente, this.tamano, this.filtroTipo ?? undefined);
    }
  }
}
