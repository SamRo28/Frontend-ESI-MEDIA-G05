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
  pagina = 0;
  tamano = 12;
  cargando = false;
  errores: string | null = null;
  contenido: ContenidoResumenDTO[] = [];
  totalPaginas: number | null = null;
  totalElementos: number | null = null;

  filtroTipo: 'AUDIO' | 'VIDEO' | null = null;

  constructor(private multimedia: MultimediaService, private route: ActivatedRoute, private router: Router) {}

  ngOnChanges(changes: SimpleChanges): void {
    // Detectar cambios en tagFilters (compatibilidad: solo tags expuestas por el componente de filtro)
    if (changes['tagFilters'] && !changes['tagFilters'].firstChange) {
      const newTags: string[] = changes['tagFilters'].currentValue || [];
      const prevTags: string[] = changes['tagFilters'].previousValue || [];
      console.log('🔄 Cambio en tagFilters detectado:', { previous: prevTags, current: newTags });
      // Si se han limpiado los tags, regenerar la página actual (limpiar cache para obtener todo)
      if (newTags.length === 0 && prevTags.length > 0) {
        this.multimedia.clearCache();
        this.cargar(this.pagina);
      } else {
        // Aplicación de nuevos filtros: volver a la primera página
        this.cargar(0);
      }
    }
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
    this.multimedia.listar(pagina, this.tamano, this.filtroTipo ?? undefined).subscribe({
      next: (resp: PageResponse<ContenidoResumenDTO>) => {
        const items = resp.content || [];

        // Log informativo para depuración: verificar si el backend envía tags en los resúmenes
        const itemsWithTagsCount = items.filter(i => Array.isArray((i as any).tags) && (i as any).tags.length > 0).length;
        const sample = items.slice(0, 10).map(i => ({ id: i.id, titulo: i.titulo, tipo: i.tipo, tags: (i as any).tags }));
        console.info('📥 Contenidos recibidos (multimedia.listar):', { pagina: pagina, received: items.length, withTags: itemsWithTagsCount, sample });

        // Determinar qué campos requiere el filtrado actual (solo tags por ahora, compatibilidad)
        const needTags = Array.isArray(this.tagFilters) && this.tagFilters.length > 0;
        const needEdad = false;
        const needRes = false;

        const itemsWithoutRequired = items.filter(i => {
          if (needTags && !Array.isArray((i as any).tags)) return true;
          return false;
        });

        const proceed = (resolvedItems: ContenidoResumenDTO[]) => {
          // Aplicar filtro de tipo si corresponde
          let contenidoFiltrado = this.filtroTipo ? resolvedItems.filter(i => i.tipo === this.filtroTipo) : resolvedItems;
          // Aplicar filtrado por tags: lógica AND (todos los seleccionados)
          contenidoFiltrado = this.applyFilteringWithTags(contenidoFiltrado);

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
          console.info(`🔎 Enriqueciendo items (filtros requieren campos): ${itemsWithoutRequired.length} llamadas a detalle`);
          forkJoin(calls).subscribe({
            next: (details: any[]) => {
              for (const d of details) {
                const match = items.find(i => i.id === d.id);
                if (match) {
                  (match as any).tags = Array.isArray(d.tags) ? d.tags : (match as any).tags || [];
                  if (typeof d.edadvisualizacion === 'number') (match as any).edadvisualizacion = d.edadvisualizacion;
                  if (typeof d.resolucion === 'string') (match as any).resolucion = d.resolucion;
                }
              }
              console.info(`🔁 Detalles recibidos: ${details.length}`);
              proceed(items);
            },
            error: () => {
              console.info('⚠️ Error al obtener detalles para enriquecer filtros, procediendo con los resúmenes');
              proceed(items);
            }
          });
        } else {
          proceed(items);
        }
      },
      error: (err) => {
        console.error('Error cargando contenidos', err);
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
   * Filtrado simple por tags (AND): devuelve items que contienen todos los tags seleccionados.
   * Mantiene compatibilidad con la API anterior que solo expone `tagFilters`.
   */
  private applyFilteringWithTags(items: ContenidoResumenDTO[]): ContenidoResumenDTO[] {
    if (!Array.isArray(this.tagFilters) || this.tagFilters.length === 0) return items;
    const selected = this.tagFilters;
    return items.filter(item => {
      const tags = (item as any).tags;
      if (!Array.isArray(tags)) return false;
      return selected.every((t: string) => tags.includes(t));
    });
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
