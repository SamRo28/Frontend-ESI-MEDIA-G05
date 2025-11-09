import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';


export interface AudioUploadData {
  titulo: string;
  descripcion?: string;
  tags: string[];
  duracion: number;
  vip: boolean;
  edadVisualizacion: number;
  fechaDisponibleHasta?: Date | null;
  visible: boolean;
  archivo: File;
  caratula?: any;
}

export interface VideoUploadData {
  titulo: string;
  descripcion?: string;
  tags: string[];
  duracion: number;
  vip: boolean;
  edadVisualizacion: number;
  fechaDisponibleHasta?: Date | null;
  visible: boolean;
  url: string;
  resolucion: string;
  caratula?: any;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  audioId?: string;
  videoId?: string;
  titulo?: string;
  url?: string;
}

export interface ContenidoSearchResult {
  id: string;
  titulo: string;
  tipo: 'Video' | 'Audio';
  descripcion?: string;
  duracion?: number;
  resolucion?: string;
}

export interface SearchContentResponse {
  success: boolean;
  mensaje: string;
  contenidos: ContenidoSearchResult[];
  total: number;
  query: string;
}

// Interface para manejo de errores del backend
export interface BackendError {
  success: false;
  message: string;
  errors?: { [key: string]: string };
}

@Injectable({
  providedIn: 'root'
})
export class ContentService {
  private readonly baseUrl = 'http://localhost:8080/gestor';

  constructor(private readonly http: HttpClient) {}

  /**
   * Sube un archivo de audio usando el endpoint /gestor/audio/subir
   */
  uploadAudio(audioData: AudioUploadData): Observable<UploadResponse> {
    const formData = new FormData();
    
    // Agregar datos del formulario
    formData.append('titulo', audioData.titulo);
    if (audioData.descripcion) {
      formData.append('descripcion', audioData.descripcion);
    }
    
    audioData.tags.forEach((tag, index) => {
      formData.append(`tags[${index}]`, tag);
    });
    
    formData.append('duracion', audioData.duracion.toString());
    formData.append('vip', audioData.vip.toString());
    formData.append('edadVisualizacion', audioData.edadVisualizacion.toString());
    
    if (audioData.fechaDisponibleHasta) {
      formData.append('fechaDisponibleHasta', audioData.fechaDisponibleHasta.toISOString());
    }
    
    formData.append('visible', audioData.visible.toString());
    formData.append('archivo', audioData.archivo);
    if (audioData.caratula) {
      formData.append('caratula', audioData.caratula);
    }

    // El interceptor authInterceptor se encarga automáticamente del header Authorization
    const headers = new HttpHeaders();
    return this.http.post<UploadResponse>(`${this.baseUrl}/audio/subir`, formData, { headers });
  }

  /**
   * Sube un video por URL usando el endpoint /gestor/video/subir
   */
  uploadVideo(videoData: VideoUploadData): Observable<UploadResponse> {
    const payload = {
      titulo: videoData.titulo,
      descripcion: videoData.descripcion || null,
      tags: videoData.tags,
      duracion: videoData.duracion,
      vip: videoData.vip,
      edadVisualizacion: videoData.edadVisualizacion,
      fechaDisponibleHasta: videoData.fechaDisponibleHasta 
        ? videoData.fechaDisponibleHasta.toISOString()
        : null,
      visible: videoData.visible,
      url: videoData.url,
      resolucion: videoData.resolucion,
      caratula: videoData.caratula || null
    };

    // El interceptor authInterceptor se encarga automáticamente del header Authorization
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    return this.http.post<UploadResponse>(`${this.baseUrl}/video/subir`, payload, { headers });
  }

  /**
   * Verifica el estado del servicio de audio
   */
  checkAudioStatus(): Observable<any> {
    return this.http.get(`${this.baseUrl}/audio/estado`);
  }

  /**
   * Verifica el estado del servicio de video
   */
  checkVideoStatus(): Observable<any> {
    return this.http.get(`${this.baseUrl}/video/estado`);
  }


  /**
   * Busca contenidos por nombre usando el backend real
   * Utiliza el endpoint /contenidos/buscar
   */
  buscarContenidos(query: string, limit: number = 10): Observable<SearchContentResponse> {
    if (!query || query.trim().length < 2) {
      return of({
        success: false,
        mensaje: 'El query debe tener al menos 2 caracteres',
        contenidos: [],
        total: 0,
        query: query
      });
    }

    const params = new URLSearchParams({
      query: query.trim(),
      limit: limit.toString()
    });

    console.log('Realizando búsqueda en backend:', query.trim());

    // El interceptor se encarga del Authorization header automáticamente
    return this.http.get<SearchContentResponse>(`http://localhost:8080/contenidos/buscar?${params}`).pipe(
      catchError(error => {
        console.error('Error en búsqueda de contenidos:', error);
        
        let mensajeError = 'Error al buscar contenidos';
        if (error.status === 401) {
          mensajeError = 'No tienes permisos para buscar contenidos';
        } else if (error.status === 0) {
          mensajeError = 'No se puede conectar al servidor';
        } else if (error.status >= 500) {
          mensajeError = 'Error interno del servidor';
        }

        return of({
          success: false,
          mensaje: mensajeError,
          contenidos: [],
          total: 0,
          query: query.trim()
        });
      })
    );
  }

  /**
   * Método legacy mantenido para compatibilidad
   */
  buscarPorNombre(nombre: string): Observable<any> {
    return this.buscarContenidos(nombre, 10);
  }
}