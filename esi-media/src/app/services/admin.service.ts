import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError, timeout } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Usuario {
  id?: string;
  nombre: string;
  apellidos: string;
  email: string;
  foto?: string;
  departamento: string;
  rol: 'Administrador' | 'Gestor' | 'Visualizador';
  bloqueado: boolean;
  apodo?: string;
}

export interface PerfilDetalle {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  foto?: any;
  bloqueado: boolean;
  rol: string;
  fechaRegistro?: Date;
  // Campos específicos de Administrador
  departamento?: string;
  // Campos específicos de Gestor
  alias?: string;
  descripcion?: string;
  especialidad?: string;
  tipoContenido?: string;
  // Campos específicos de Visualizador
  fechaNacimiento?: Date;
  vip?: boolean;
  edad?: number;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  // Obtener headers con token de autorización
  private getAuthHeaders(): any {
    let token = sessionStorage.getItem('authToken');
    
    if (!token) {
      // Intentar obtener token de otras fuentes posibles
      token = localStorage.getItem('authToken') || 
              sessionStorage.getItem('token') || 
              localStorage.getItem('token') ||
              sessionStorage.getItem('userToken') ||
              localStorage.getItem('userToken');
      
      if (!token) {
        // Por ahora, continuar sin token para ver si algunos endpoints funcionan sin auth
        return {
          headers: {
            'Content-Type': 'application/json'
          }
        };
      }
    }
    
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  }

  getUsuarios(): Observable<Usuario[]> {
    return this.http.post<Usuario[]>(`${this.apiUrl}/users/listar`, {}).pipe(
      catchError(this.handleError)
    );
  }

  crearUsuario(userData: any): Observable<any> {
    // Decidir qué endpoint usar según el rol
    if (userData?.rol === 'Gestor') {
      return this.crearGestor(userData);
    } else {
      return this.crearAdministrador(userData);
    }
  }

  private crearAdministrador(userData: any): Observable<any> {
    const url = `${this.apiUrl}/administradores/crear-simple`;
    
    return this.http.post(url, userData).pipe(
      timeout(10000),
      catchError((error) => {
        console.error('Error creando Administrador:', error);
        return this.handleError(error);
      })
    );
  }

  private crearGestor(userData: any): Observable<any> {
    const url = `${this.apiUrl}/gestores/crear`;
    
    return this.http.post(url, userData).pipe(
      timeout(10000),
      catchError((error) => {
        console.error('Error creando Gestor:', error);
        return this.handleError(error);
      })
    );
  }

  private handleError(error: any): Observable<never> {
    if (error.name === 'TimeoutError') {
      return throwError(() => ({
        // Mensaje genérico para timeouts en cualquier endpoint
        message: 'La conexión tardó demasiado tiempo. Verifica que el backend esté ejecutándose y vuelve a intentarlo.',
        status: 'timeout'
      }));
    }
    return throwError(() => error);
  }

  updateProfile(userId: string, updates: any): Observable<any> {
    const url = `${this.apiUrl}/users/${userId}/profile`;
    
    return this.http.put(url, updates).pipe(
      timeout(10000),
      catchError((error) => {
        console.error('Error actualizando perfil:', error);
        return this.handleError(error);
      })
    );
  }

  deleteUser(userId: string): Observable<any> {
    const url = `${this.apiUrl}/users/${userId}`;
    // Usamos directamente el endpoint del backend que ya maneja la eliminación de contraseña
    return this.http.delete(url).pipe(
      timeout(5000),
      catchError((error) => {
        console.error('Error en el proceso de eliminación:', error);
        return this.handleError(error);
      })
    );
  }

  /**
   * Obtiene el perfil detallado de un usuario
   */
  obtenerPerfil(usuarioId: string, adminId?: string): Observable<PerfilDetalle> {
    const url = `${this.apiUrl}/perfiles/${usuarioId}`;
    const options = adminId ? { headers: { 'Admin-ID': adminId } } : {};
    return this.http.get<PerfilDetalle>(url, options).pipe(
      // Aumentamos timeout para evitar errores por lentitud del backend en entornos locales
      timeout(15000),
      catchError((error) => {
        console.error('Error obteniendo perfil:', error);
        return this.handleError(error);
      })
    );
  }

  /** Bloquea un usuario */
  bloquearUsuario(usuarioId: string, adminId: string): Observable<any> {
    const url = `${this.apiUrl}/usuarios/${usuarioId}/bloquear`;
    const headers = { 'Admin-ID': adminId };
    return this.http.put(url, {}, { headers }).pipe(
      timeout(5000),
      catchError((error) => {
        console.error('Error bloqueando usuario:', error);
        return this.handleError(error);
      })
    );
  }
  // ✅ MÉTODO CORREGIDO: Usar endpoints simples que funcionaban antes
  // Obtener cualquier usuario por ID (usando endpoint existente)
  getUserById(id: string): Observable<any> {
    const url = `${this.apiUrl}/users/${id}`;
    return this.http.get<any>(url)
      .pipe(
        timeout(10000),
        catchError(this.handleError)
      );
  }

  // Usar endpoint /users/{id}/profile para actualizar usuarios
  updateUser(id: string, userData: any, tipo: string): Observable<any> {
    const url = `${this.apiUrl}/users/${id}/profile`;
    
    // El backend espera el formato {userData, tipo}
    const payload = { userData, tipo };
    
    // IMPORTANTE: NO usar headers de autorización para estos endpoints
    return this.http.put<any>(url, payload).pipe(
      catchError(this.handleError)
    );
  }

  /** Desbloquea un usuario */
  desbloquearUsuario(usuarioId: string, adminId: string): Observable<any> {
    const url = `${this.apiUrl}/usuarios/${usuarioId}/desbloquear`;
    const headers = { 'Admin-ID': adminId };
    return this.http.put(url, {}, { headers }).pipe(
      timeout(5000),
      catchError((error) => {
        console.error('Error desbloqueando usuario:', error);
        return this.handleError(error);
      })
    );
  }

  // =================== CONTENIDOS (solo lectura por administradores) ===================
  getContenidos(adminId: string): Observable<ContenidoResumen[]> {
    const url = `${this.apiUrl}/contenidos/listar`;
    const headers = { 'Admin-ID': adminId };
    return this.http.get<ContenidoResumen[]>(url, { headers }).pipe(
      // Aumentamos el timeout para evitar timeouts rápidos en entornos lentos
      timeout(15000),
      map((arr: any) => {
        if (!Array.isArray(arr)) return arr;
        return arr.map((it: any) => {
          const g = it?.gestor ?? {};
          const nombreDerivado = it?.gestorNombre
            ?? (g?.nombre || g?.apellidos ? `${g?.nombre ?? ''} ${g?.apellidos ?? ''}`.trim() : undefined)
            ?? g?.alias
            ?? it?.alias
            ?? it?.gestorNombreCompleto;
          return { ...it, gestorNombre: nombreDerivado ?? it?.gestorNombre ?? '-' } as ContenidoResumen;
        });
      }),
      catchError((error) => this.handleError(error))
    );
  }
  updateVisualizador(id: string, visualizador: VisualizadorGestionDTO): Observable<any> {

    return this.updateUser(id, visualizador, "Visualizador");
  }

  getContenidoDetalle(id: string, adminId: string): Observable<ContenidoDetalle> {
    const url = `${this.apiUrl}/contenidos/${id}`;
    const headers = { 'Admin-ID': adminId };
    return this.http.get<ContenidoDetalle>(url, { headers }).pipe(
      timeout(5000),
      catchError((error) => this.handleError(error))
    );
  }

  getAdministradorById(id: string): Observable<any> {
    return this.getUserById(id);
  }


  getGestorById(id: string): Observable<any> {
    return this.getUserById(id);
  }

   getVisualizadorById(id: string): Observable<any> {
    return this.getUserById(id);
  }


  // =================== Gestión de usuarios (compatibilidad con user-management) ===================
  getAllVisualizadores(page = 0, size = 10): Observable<Paginado<VisualizadorGestionDTO>> {
    return this.http.get<Paginado<VisualizadorGestionDTO>>(`${this.apiUrl}/visualizadores`, { params: { page, size } as any });
  }
  updateGestor(id: string, gestor: GestorGestionDTO): Observable<any> {
    return this.updateUser(id, gestor, "GestordeContenido");
  }

  // Actualizar administrador (compatibilidad con user-management)
  updateAdministrador(id: string, admin: AdministradorGestionDTO): Observable<any> {
    return this.updateUser(id, admin, "Administrador");
  }


  getAllGestores(page = 0, size = 10): Observable<Paginado<GestorGestionDTO>> {
    return this.http.get<Paginado<GestorGestionDTO>>(`${this.apiUrl}/gestores`, { params: { page, size } as any });
  }

  getAllAdministradores(page = 0, size = 10): Observable<Paginado<AdministradorGestionDTO>> {
    return this.http.get<Paginado<AdministradorGestionDTO>>(`${this.apiUrl}/administradores`, { params: { page, size } as any });
  }


  deleteVisualizador(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/visualizadores/${id}`);
  }

  deleteGestor(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/gestores/${id}`);
  }

  deleteAdministrador(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/administradores/${id}`);
  }
}

export interface ContenidoResumen {
  id: string;
  titulo: string;
  tipo: 'Audio' | 'Video';
  gestorNombre?: string;
}

export interface ContenidoDetalle extends ContenidoResumen {
  url?: string;
  descripcion?: string;
  duracion?: number;
  resolucion?: string; // solo Video
  estado?: boolean;
  fechaEstado?: Date;
  fechaDisponibleHasta?: Date;
  vip?: boolean;
  edadMinima?: number;
}

// Tipos de gestión usados por user-management
export interface VisualizadorGestionDTO {
  id: string; nombre: string; apellidos: string; email: string; vip?: boolean; bloqueado?: boolean;
}
export interface GestorGestionDTO {
  id: string; nombre: string; apellidos: string; email: string; alias?: string; especialidad?: string; bloqueado?: boolean;
}
export interface AdministradorGestionDTO {
  id: string; nombre: string; apellidos: string; email: string; departamento?: string; bloqueado?: boolean;
}

export interface Paginado<T> {
  content: T[];
  totalPages: number;
  totalElements?: number;
}
