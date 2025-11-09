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
 * - Las rutas se determinan según el rol del usuario desde sessionStorage:
 *   - Gestor: /api/listas/gestor
 *   - Visualizador: /api/listas/usuario
 * - El userId se incluye en el cuerpo de las peticiones POST y PUT
 * - El backend valida permisos y retorna 401/403 si es necesario
 */
@Injectable({
  providedIn: 'root'
})
export class ListaService {
  private readonly baseUrl = 'http://localhost:8080/listas';

  constructor(private readonly http: HttpClient) {}

  /**
   * Obtiene la URL base correcta según el rol del usuario
   * @returns URL base para las peticiones según el rol
   */
  private getEndpointBase(): string {
    const currentUserClass = sessionStorage.getItem('currentUserClass');
    if (currentUserClass === 'Gestor') {
      return `${this.baseUrl}/gestor`;
    } else {
      return `${this.baseUrl}/usuario`;
    }
  }

  /**
   * Obtiene las listas según el rol del usuario:
   * - Visualizador: Solo sus propias listas
   * - Gestor: Todas las listas (públicas y privadas de gestores)
   * 
   * @returns Observable con la respuesta que contiene las listas
   */
  getMisListas(): Observable<ListasResponse> {
    const currentUserClass = sessionStorage.getItem('currentUserClass');
    const endpointBase = this.getEndpointBase();
    
    if (currentUserClass === 'Gestor') {
      // Los gestores ven todas las listas
      return this.http.get<ListasResponse>(`${endpointBase}/todas`);
    } else {
      // Los visualizadores solo ven sus propias listas
      return this.http.get<ListasResponse>(`${endpointBase}/mias`);
    }
  }

  /**
   * Obtiene solo las listas propias del usuario autenticado
   * GET /api/listas/gestor/mias o /api/listas/usuario/mias
   * 
   * @returns Observable con la respuesta que contiene las listas del usuario
   */
  getListasPropiasUsuario(): Observable<ListasResponse> {
    const endpointBase = this.getEndpointBase();
    return this.http.get<ListasResponse>(`${endpointBase}/mias`);
  }

  /**
   * Crea una nueva lista
   * POST /listas/gestor o /listas/usuario
   * 
   * @param lista Datos de la lista a crear (nombre, descripcion, visible, tags, userId)
   * @returns Observable con la respuesta que contiene la lista creada
   */
  crearLista(lista: any): Observable<ListaResponse> {
    const endpointBase = this.getEndpointBase();
    return this.http.post<ListaResponse>(endpointBase, lista);
  }

  /**
   * Edita una lista existente
   * PUT /api/listas/gestor/{id} o /api/listas/usuario/{id}
   * 
   * @param id ID de la lista a editar
   * @param lista Datos actualizados de la lista (debe incluir userId)
   * @returns Observable con la respuesta que contiene la lista actualizada
   */
  editarLista(id: string, lista: any): Observable<ListaResponse> {
    const endpointBase = this.getEndpointBase();
    return this.http.put<ListaResponse>(`${endpointBase}/${id}`, lista);
  }

  /**
   * Elimina una lista
   * DELETE /api/listas/gestor/{id} o /api/listas/usuario/{id}
   * 
   * @param id ID de la lista a eliminar
   * @returns Observable con la respuesta de confirmación
   */
  eliminarLista(id: string): Observable<{ success: boolean; mensaje: string }> {
    const endpointBase = this.getEndpointBase();
    return this.http.delete<{ success: boolean; mensaje: string }>(`${endpointBase}/${id}`);
  }

  /**
   * Añade un contenido a una lista
   * POST /api/listas/gestor/{idLista}/contenidos/{idContenido} o /api/listas/usuario/{idLista}/contenidos/{idContenido}
   * 
   * @param idLista ID de la lista
   * @param idContenido ID del contenido a añadir
   * @returns Observable con la respuesta que contiene la lista actualizada
   */
  addContenido(idLista: string, idContenido: string): Observable<ContenidoResponse> {
    const endpointBase = this.getEndpointBase();
    return this.http.post<ContenidoResponse>(
      `${endpointBase}/${idLista}/contenidos/${idContenido}`,
      {} // Body vacío, los IDs van en la URL
    );
  }

  /**
   * Quita un contenido de una lista
   * DELETE /api/listas/gestor/{idLista}/contenidos/{idContenido} o /api/listas/usuario/{idLista}/contenidos/{idContenido}
   * 
   * @param idLista ID de la lista
   * @param idContenido ID del contenido a quitar
   * @returns Observable con la respuesta que contiene la lista actualizada
   */
  removeContenido(idLista: string, idContenido: string): Observable<ContenidoResponse> {
    const endpointBase = this.getEndpointBase();
    return this.http.delete<ContenidoResponse>(
      `${endpointBase}/${idLista}/contenidos/${idContenido}`
    );
  }

  /**
   * Obtiene las listas de un usuario específico
   * GET /listas/usuario/mias
   * 
   * @param userId ID del usuario (usado para validación pero el endpoint usa el token)
   * @returns Observable con la respuesta que contiene las listas del usuario
   */
  obtenerListasUsuario(userId: string): Observable<ListasResponse> {
    const token = sessionStorage.getItem('currentUserToken');
    const headers = { Authorization: `Bearer ${token}` };
    
    return this.http.get<ListasResponse>(
      `${this.baseUrl}/usuario/mias`,
      { headers }
    );
  }

  /**
   * Obtiene las listas para gestores
   * GET /listas/gestor/mias
   * 
   * @returns Observable con la respuesta que contiene las listas del gestor
   */
  obtenerListasGestor(): Observable<ListasResponse> {
    const token = sessionStorage.getItem('currentUserToken');
    const headers = { Authorization: `Bearer ${token}` };
    
    return this.http.get<ListasResponse>(
      `${this.baseUrl}/gestor/mias`,
      { headers }
    );
  }
}
