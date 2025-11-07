import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ContenidoResumenDTO {
  id: string;
  titulo: string;
  tipo: 'AUDIO' | 'VIDEO';
  caratula?: any;
  vip: boolean;
}

export interface ContenidoDetalleDTO {
  id: string;
  titulo: string;
  descripcion?: string;
  tipo: 'AUDIO' | 'VIDEO';
  caratula?: any;
  vip: boolean;
  referenciaReproduccion: string;
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

  constructor(private http: HttpClient) {}

  listar(page = 0, size = 12): Observable<PageResponse<ContenidoResumenDTO>> {
    return this.http.get<PageResponse<ContenidoResumenDTO>>(`${this.baseUrl}?page=${page}&size=${size}`);
  }

  detalle(id: string): Observable<ContenidoDetalleDTO> {
    return this.http.get<ContenidoDetalleDTO>(`${this.baseUrl}/${id}`);
  }

  descargarAudio(id: string): Observable<Blob> {
    // Ruta correcta en backend: /multimedia/audio/{id}
    return this.http.get(`${this.baseUrl}/audio/${id}`, { responseType: 'blob' });
  }
}
