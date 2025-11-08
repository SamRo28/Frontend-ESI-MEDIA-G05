import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';


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
    
    let tagIndex = 0;
    for (const tag of audioData.tags) {
      formData.append(`tags[${tagIndex}]`, tag);
      tagIndex++;
    }
    
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
}