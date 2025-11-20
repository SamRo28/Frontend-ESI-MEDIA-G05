import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Lista } from '../model/lista';
import { environment } from '../../environments/environment';

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
  private readonly baseUrl = `${environment.apiUrl}/listas`;

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
    // Ya no necesitamos añadir headers manualmente, el interceptor gestiona withCredentials
    return this.http.get<ListasResponse>(
      `${this.baseUrl}/usuario/mias`
    );
  }

  /**
   * Obtiene las listas para gestores
   * GET /listas/gestor/mias
   * 
   * @returns Observable con la respuesta que contiene las listas del gestor
   */
  obtenerListasGestor(): Observable<ListasResponse> {
    // Ya no necesitamos añadir headers manualmente, el interceptor gestiona withCredentials
    return this.http.get<ListasResponse>(
      `${this.baseUrl}/gestor/mias`
    );
  }

  /**
   * Obtiene una lista específica por su ID
   * GET /api/listas/gestor/{id} o /api/listas/usuario/{id}
   * 
   * @param id ID de la lista
   * @returns Observable con la respuesta que contiene la lista
   */
  obtenerListaPorId(id: string): Observable<ListaResponse> {
    const endpointBase = this.getEndpointBase();
    return this.http.get<ListaResponse>(`${endpointBase}/${id}`);
  }

  /**
   * Obtiene una lista pública específica por su ID (para visualizadores)
   * GET /api/listas/usuario/publica/{id}
   * 
   * @param id ID de la lista
   * @returns Observable con la respuesta que contiene la lista
   */
  obtenerListaPublicaPorId(id: string): Observable<ListaResponse> {
    return this.http.get<ListaResponse>(`${this.baseUrl}/usuario/publica/${id}`);
  }

  /**
   * Obtiene los contenidos de una lista pública de gestor
   * GET /api/listas/usuario/publica/{id}/contenidos
   * 
   * @param id ID de la lista
   * @returns Observable con la respuesta que contiene los contenidos de la lista pública
   */
  obtenerContenidosListaPublica(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/usuario/publica/${id}/contenidos`);
  }

  /**
   * Obtiene los contenidos de una lista específica
   * GET /api/listas/gestor/{id}/contenidos o /api/listas/usuario/{id}/contenidos
   * 
   * @param id ID de la lista
   * @returns Observable con la respuesta que contiene los contenidos de la lista
   */
  obtenerContenidosLista(id: string): Observable<any> {
    const endpointBase = this.getEndpointBase();
    return this.http.get<any>(`${endpointBase}/${id}/contenidos`);
  }

  /**
   * Obtiene todas las listas públicas de gestores
   * Disponible solo para visualizadores
   * GET /listas/usuario/publicas
   * 
   * @returns Observable con la respuesta que contiene las listas públicas
   */
  obtenerListasPublicas(): Observable<ListasResponse> {
    return this.http.get<ListasResponse>(`${this.baseUrl}/usuario/publicas`);
  }

  /**
   * Verifica si el usuario actual puede eliminar una lista
   * Solo el creador de la lista puede eliminarla
   * 
   * @param lista La lista a verificar
   * @returns true si puede eliminar, false en caso contrario
   */
  puedeEliminarLista(lista: any): boolean {
    const userStr = sessionStorage.getItem('user');
    if (!userStr) return false;
    
    try {
      const user = JSON.parse(userStr);
      return lista.creadorId === user.id;
    } catch (error) {
      console.error('Error verificando permisos:', error);
      return false;
    }
  }

  /**
   * Verifica si el usuario actual puede editar una lista
   * El creador siempre puede editar su lista
   * Los gestores de contenido pueden editar listas públicas
   * 
   * @param lista La lista a verificar
   * @returns true si puede editar, false en caso contrario
   */
  puedeEditarLista(lista: any): boolean {
    // Si es el propietario, siempre puede editar
    if (this.puedeEliminarLista(lista)) {
      return true;
    }

    // Los gestores de contenido pueden editar listas públicas
    const currentUserClass = sessionStorage.getItem('currentUserClass');
    if (currentUserClass === 'GestordeContenido' && lista.visible === true) {
      return true;
    }

    return false;
  }

  /**
   * Valida los datos de una lista antes de crear/editar
   * 
   * @param datosLista Datos de la lista a validar
   * @returns Objeto con validación y mensaje de error si hay
   */
  validarDatosLista(datosLista: any): { esValida: boolean; mensaje?: string } {
    // Validar nombre
    if (!datosLista.nombre || datosLista.nombre.trim().length < 3) {
      return { esValida: false, mensaje: 'El nombre debe tener al menos 3 caracteres' };
    }

    // Validar descripción
    if (!datosLista.descripcion || datosLista.descripcion.trim().length < 10) {
      return { esValida: false, mensaje: 'La descripción debe tener al menos 10 caracteres' };
    }

    // Validar contenidos
    if (!datosLista.contenidosIds || datosLista.contenidosIds.length === 0) {
      return { esValida: false, mensaje: 'La lista debe tener al menos un contenido' };
    }

    // Validar especialización para gestores
    const currentUserClass = sessionStorage.getItem('currentUserClass');
    if (currentUserClass === 'Gestor' && (!datosLista.especializacionGestor || datosLista.especializacionGestor.trim().length === 0)) {
      return { esValida: false, mensaje: 'La especialización del gestor es requerida' };
    }

    // Validar sin duplicados en contenidos
    const contenidosUnicos = new Set(datosLista.contenidosIds);
    if (contenidosUnicos.size !== datosLista.contenidosIds.length) {
      return { esValida: false, mensaje: 'No se pueden repetir contenidos en la lista' };
    }

    return { esValida: true };
  }

  /**
   * Obtiene información del usuario actual
   */
  private obtenerUsuarioActual(): any {
    try {
      const userStr = sessionStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error obteniendo usuario actual:', error);
      return null;
    }
  }

  /**
   * Verifica si es necesario validar nombres únicos
   * Solo para listas públicas de gestores
   */
  requiereNombreUnico(datosLista: any): boolean {
    const currentUserClass = sessionStorage.getItem('currentUserClass');
    return currentUserClass === 'Gestor' && datosLista.visible === true;
  }
}
