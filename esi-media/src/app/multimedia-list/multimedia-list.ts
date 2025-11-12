import { Component, OnInit, OnChanges, SimpleChanges, inject, ChangeDetectorRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MultimediaService, ContenidoResumenDTO, PageResponse } from '../services/multimedia.service';
import { ActivatedRoute, Router } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

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
    // Detectar cambios en tagFilters y recargar contenido si es necesario
    if (changes['tagFilters'] && !changes['tagFilters'].firstChange) {
      console.log('🔄 Cambio en tagFilters detectado:', changes['tagFilters'].currentValue);
      // Si hay contenido cargado, reaplicar filtros
      if (this.contenido.length > 0) {
        // Forzar recarga para aplicar nuevos filtros
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
        // Ya delegamos filtrado al backend; si por alguna razón vinieran mezclados, aplicamos filtro defensivo
        let contenidoFiltrado = this.filtroTipo ? items.filter(i => i.tipo === this.filtroTipo) : items;
        
        // Aplicar filtrado por tags client-side
        contenidoFiltrado = this.applyTagFiltering(contenidoFiltrado);
        
        this.contenido = contenidoFiltrado;
        this.totalPaginas = typeof resp.totalPages === 'number' ? resp.totalPages : null;
        this.totalElementos = typeof resp.totalElements === 'number' ? resp.totalElements : null;
        // Con filtrado en backend mantenemos los totales; solo los anulamos si el backend no los envía
        this.pagina = pagina;
        this.cargando = false;
        // Prefetch de la siguiente página para navegación fluida
        this.prefetchSiguiente();
        // Zoneless: asegurar refresco de vista
        this.cdr.markForCheck();
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
   * Aplica filtrado por tags client-side al contenido
   */
  private applyTagFiltering(items: ContenidoResumenDTO[]): ContenidoResumenDTO[] {
    // Si no hay filtros de tags, devolver todos los items
    if (!this.tagFilters || this.tagFilters.length === 0) {
      return items;
    }

    // Filtrar items que contengan al menos uno de los tags seleccionados
    return items.filter(item => {
      // Verificar si el item tiene tags
      const tags = item.tags;
      if (!tags || !Array.isArray(tags)) {
        return false;
      }

      // Verificar si alguno de los tags del filtro está en los tags del item
      return this.tagFilters.some(filterTag =>
        tags.includes(filterTag)
      );
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
