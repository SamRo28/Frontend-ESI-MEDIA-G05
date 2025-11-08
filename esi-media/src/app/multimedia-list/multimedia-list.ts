import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
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
export class MultimediaListComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);
  pagina = 0;
  tamano = 12;
  cargando = false;
  errores: string | null = null;
  contenido: ContenidoResumenDTO[] = [];
  totalPaginas: number | null = null;
  totalElementos: number | null = null;

  filtroTipo: 'AUDIO' | 'VIDEO' | null = null;

  constructor(private multimedia: MultimediaService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    // Evitar peticiones en SSR
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    // Filtro por ruta dedicada si no hay query param
    const url = this.router.url || '';
    if (url.includes('/multimedia/videos')) this.filtroTipo = 'VIDEO';
    else if (url.includes('/multimedia/audios')) this.filtroTipo = 'AUDIO';
    this.route.queryParamMap.subscribe(params => {
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
        this.contenido = this.filtroTipo ? items.filter(i => i.tipo === this.filtroTipo) : items;
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
