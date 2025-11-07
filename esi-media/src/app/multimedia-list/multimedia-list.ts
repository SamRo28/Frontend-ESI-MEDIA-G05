import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MultimediaService, ContenidoResumenDTO, PageResponse } from '../services/multimedia.service';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-multimedia-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './multimedia-list.html',
  styleUrl: './multimedia-list.css'
})
export class MultimediaListComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);
  pagina = 0;
  tamano = 12;
  cargando = false;
  errores: string | null = null;
  contenido: ContenidoResumenDTO[] = [];
  totalPaginas: number | null = null;
  totalElementos: number | null = null;

  constructor(private multimedia: MultimediaService) {}

  ngOnInit(): void {
    // Evitar peticiones en SSR
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.cargar();
  }

  cargar(pagina: number = this.pagina): void {
    this.cargando = true;
    this.errores = null;
    this.multimedia.listar(pagina, this.tamano).subscribe({
      next: (resp: PageResponse<ContenidoResumenDTO>) => {
        this.contenido = resp.content || [];
        this.totalPaginas = typeof resp.totalPages === 'number' ? resp.totalPages : null;
        this.totalElementos = typeof resp.totalElements === 'number' ? resp.totalElements : null;
        this.pagina = pagina;
        this.cargando = false;
        // Prefetch de la siguiente página para navegación fluida
        this.prefetchSiguiente();
      },
      error: (err) => {
        console.error('Error cargando contenidos', err);
        this.errores = (err?.error?.mensaje) || 'No se pudo cargar el contenido';
        this.cargando = false;
      }
    });
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
      if (siguiente < this.totalPaginas) this.multimedia.prefetch(siguiente, this.tamano);
      return;
    }
    // Si no conocemos totalPaginas, usa heurística: prefetch si llenamos la página
    if (this.contenido.length >= this.tamano) {
      this.multimedia.prefetch(siguiente, this.tamano);
    }
  }
}
