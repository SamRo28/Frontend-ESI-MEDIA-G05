import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Lista } from '../model/lista';

/**
 * Interfaz para la respuesta del backend al crear/editar listas
 */
export interface ListaResponse {
  success: boolean;
  mensaje: string;
  lista?: any;
}

/**
 * Interfaz para la respuesta al obtener múltiples listas
 */
export interface ListasResponse {
  success: boolean;
  mensaje: string;
  listas?: any[];
  total?: number;
}

/**
 * Interfaz para respuestas de operaciones de contenido
 */
export interface ContenidoResponse {
  success: boolean;
  mensaje: string;
  lista?: any;
  totalContenidos?: number;
}

/**
 * Servicio para gestión de listas/playlists
 * 
 * AUTENTICACIÓN:
 * - El auth.interceptor.ts añade automáticamente el header Authorization con el token
 * - No es necesario manejar tokens manualmente en este servicio
 * 
 * RUTAS:
 * - Todas las rutas apuntan a /api/listas en el backend
 * - El backend valida permisos y retorna 401/403 si es necesario
 */
@Injectable({
  providedIn: 'root'
})
export class ListaService {
  private readonly baseUrl = 'http://localhost:8080/api/listas';

  constructor(private readonly http: HttpClient) {}

  /**
   * Obtiene todas las listas del usuario autenticado
   * GET /api/listas/mias
   * 
   * @returns Observable con la respuesta que contiene las listas del usuario
   */
  getMisListas(): Observable<ListasResponse> {
    return this.http.get<ListasResponse>(`${this.baseUrl}/mias`);
  }

  /**
   * Crea una nueva lista
   * POST /api/listas
   * 
   * @param lista Datos de la lista a crear (nombre, descripcion, visible, tags)
   * @returns Observable con la respuesta que contiene la lista creada
   */
  crearLista(lista: any): Observable<ListaResponse> {
    return this.http.post<ListaResponse>(this.baseUrl, lista);
  }

  /**
   * Edita una lista existente
   * PUT /api/listas/{id}
   * 
   * @param id ID de la lista a editar
   * @param lista Datos actualizados de la lista
   * @returns Observable con la respuesta que contiene la lista actualizada
   */
  editarLista(id: string, lista: any): Observable<ListaResponse> {
    return this.http.put<ListaResponse>(`${this.baseUrl}/${id}`, lista);
  }

  /**
   * Elimina una lista
   * DELETE /api/listas/{id}
   * 
   * @param id ID de la lista a eliminar
   * @returns Observable con la respuesta de confirmación
   */
  eliminarLista(id: string): Observable<{ success: boolean; mensaje: string }> {
    return this.http.delete<{ success: boolean; mensaje: string }>(`${this.baseUrl}/${id}`);
  }

  /**
   * Añade un contenido a una lista
   * POST /api/listas/{idLista}/contenidos/{idContenido}
   * 
   * @param idLista ID de la lista
   * @param idContenido ID del contenido a añadir
   * @returns Observable con la respuesta que contiene la lista actualizada
   */
  addContenido(idLista: string, idContenido: string): Observable<ContenidoResponse> {
    return this.http.post<ContenidoResponse>(
      `${this.baseUrl}/${idLista}/contenidos/${idContenido}`,
      {} // Body vacío, los IDs van en la URL
    );
  }

  /**
   * Quita un contenido de una lista
   * DELETE /api/listas/{idLista}/contenidos/{idContenido}
   * 
   * @param idLista ID de la lista
   * @param idContenido ID del contenido a quitar
   * @returns Observable con la respuesta que contiene la lista actualizada
   */
  removeContenido(idLista: string, idContenido: string): Observable<ContenidoResponse> {
    return this.http.delete<ContenidoResponse>(
      `${this.baseUrl}/${idLista}/contenidos/${idContenido}`
    );
  }
}
