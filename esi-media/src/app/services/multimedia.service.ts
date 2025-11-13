import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay, take } from 'rxjs/operators';

export interface ContenidoResumenDTO {
  id: string;
  titulo: string;
  tipo: 'AUDIO' | 'VIDEO';
  caratula?: any;
  vip: boolean;
  tags?: string[];
  edadVisualizacion?: number;
  resolucion?: string;
}

export interface ContenidoDetalleDTO {
  id: string;
  titulo: string;
  descripcion?: string;
  tipo: 'AUDIO' | 'VIDEO';
  caratula?: any;
  vip: boolean;
  duracion?: number; // en segundos
  // Nuevos campos para enriquecer el detalle
  fechaDisponibleHasta?: string | Date;
  edadVisualizacion?: number;
  nvisualizaciones?: number;
  tags?: string[];
  referenciaReproduccion: string;
  resolucion?: string; // Campo que faltaba para videos
}

export interface PageResponse<T> {
  content: T[];
  // Los siguientes campos pueden variar según PageImpl, los dejamos opcionales
  totalElements?: number;
  totalPages?: number;
  size?: number;
  number?: number; // página actual
}

@Injectable({ providedIn: 'root' })
export class MultimediaService {
  private readonly baseUrl = 'http://localhost:8080/multimedia';
  private pageCache = new Map<string, Observable<PageResponse<ContenidoResumenDTO>>>();

  constructor(private http: HttpClient) {}

  listar(page = 0, size = 12, tipo?: 'AUDIO' | 'VIDEO'): Observable<PageResponse<ContenidoResumenDTO>> {
    const key = `p=${page}&s=${size}&t=${tipo ?? 'ALL'}`;
    const cached = this.pageCache.get(key);
    if (cached) return cached;
    const url = `${this.baseUrl}?page=${page}&size=${size}` + (tipo ? `&tipo=${tipo}` : '');
    const obs = this.http
      .get<PageResponse<ContenidoResumenDTO>>(url)
      .pipe(shareReplay(1));
    this.pageCache.set(key, obs);
    return obs;
  }

  detalle(id: string): Observable<ContenidoDetalleDTO> {
    return this.http.get<ContenidoDetalleDTO>(`${this.baseUrl}/${id}`);
  }

  reproducir(id: string): Observable<{ nvisualizaciones: number }> {
    return this.http.post<{ nvisualizaciones: number }>(`${this.baseUrl}/${id}/reproducir`, {});
  }

  descargarAudio(id: string): Observable<Blob> {
    // Ruta correcta en backend: /multimedia/audio/{id}
    return this.http.get(`${this.baseUrl}/audio/${id}`, { responseType: 'blob' });
  }

  prefetch(page = 0, size = 12, tipo?: 'AUDIO' | 'VIDEO'): void {
    // Dispara la carga y se completa al primer valor; si ya está en caché no hace red
    this.listar(page, size, tipo).pipe(take(1)).subscribe({ next: () => {}, error: () => {} });
  }

  clearCache(): void {
    this.pageCache.clear();
  }
}
