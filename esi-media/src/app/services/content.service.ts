import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, delay, throwError } from 'rxjs';

export interface AudioUploadData {
  titulo: string;
  descripcion?: string;
  tags: string[];
  duracion: number;
  vip: boolean;
  edadVisualizacion: number;
  fechaDisponibleHasta?: Date;
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
  fechaDisponibleHasta?: Date;
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

@Injectable({
  providedIn: 'root'
})
export class ContentService {
  private baseUrl = 'http://localhost:8080/api/gestor';
  private mockToken = 'Bearer mock-token-for-development'; // Token temporal para desarrollo

  constructor(private http: HttpClient) {}

  /**
   * Sube un archivo de audio usando el endpoint /api/gestor/audio/subir
   */
  uploadAudio(audioData: AudioUploadData): Observable<UploadResponse> {
    const formData = new FormData();
    
    // Agregar datos del formulario
    formData.append('titulo', audioData.titulo);
    if (audioData.descripcion) {
      formData.append('descripcion', audioData.descripcion);
    }
    formData.append('tags', JSON.stringify(audioData.tags));
    formData.append('duracion', audioData.duracion.toString());
    formData.append('vip', audioData.vip.toString());
    formData.append('edadVisualizacion', audioData.edadVisualizacion.toString());
    if (audioData.fechaDisponibleHasta) {
      formData.append('fechaDisponibleHasta', audioData.fechaDisponibleHasta.toISOString());
    }
    formData.append('visible', audioData.visible.toString());
    formData.append('archivo', audioData.archivo);
    if (audioData.caratula) {
      formData.append('caratula', JSON.stringify(audioData.caratula));
    }

    const headers = new HttpHeaders({
      'Authorization': this.mockToken
    });

    return this.http.post<UploadResponse>(`${this.baseUrl}/audio/subir`, formData, { headers });
  }

  /**
   * Sube un video por URL usando el endpoint /api/gestor/video/subir
   */
  uploadVideo(videoData: VideoUploadData): Observable<UploadResponse> {
    const payload = {
      titulo: videoData.titulo,
      descripcion: videoData.descripcion,
      tags: videoData.tags,
      duracion: videoData.duracion,
      vip: videoData.vip,
      edadVisualizacion: videoData.edadVisualizacion,
      fechaDisponibleHasta: videoData.fechaDisponibleHasta?.toISOString(),
      visible: videoData.visible,
      url: videoData.url,
      resolucion: videoData.resolucion,
      caratula: videoData.caratula
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': this.mockToken
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