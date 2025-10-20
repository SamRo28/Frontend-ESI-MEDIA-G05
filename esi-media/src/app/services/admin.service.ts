import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timeout, catchError, throwError } from 'rxjs';

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
  // Campos especÃ­ficos de Administrador
  departamento?: string;
  // Campos especÃ­ficos de Gestor
  alias?: string;
  descripcion?: string;
  especialidad?: string;
  tipoContenido?: string;
  // Campos especÃ­ficos de Visualizador
  fechaNacimiento?: Date;
  vip?: boolean;
  edad?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly apiUrl = 'http://localhost:8080';

  constructor(private readonly http: HttpClient) {}

  getUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.apiUrl}/users/listar`);
  }

  crearUsuario(userData: any): Observable<any> {
    console.log('ðŸ”— AdminService: Detectando tipo de usuario...');
    console.log('ðŸ“¦ Datos:', userData);
    console.log('ðŸ‘¤ Rol detectado:', userData.rol);

    // Decidir quÃ© endpoint usar segÃºn el rol
    if (userData.rol === 'Gestor') {
      return this.crearGestor(userData);
    } else {
      return this.crearAdministrador(userData);
    }
  }

  private crearAdministrador(userData: any): Observable<any> {
    console.log('ðŸ”— AdminService: Creando Administrador');
    const url = `${this.apiUrl}/administradores/crear-simple`;
    console.log('ðŸŒ URL Administrador:', url);
    
    return this.http.post(url, userData).pipe(
      timeout(10000),
      catchError((error) => {
        console.error('âŒ Error creando Administrador:', error);
        return this.handleError(error);
      })
    );
  }

  private crearGestor(userData: any): Observable<any> {
    console.log('ðŸ”— AdminService: Creando Gestor de Contenido');
    const url = `${this.apiUrl}/gestores/crear`;
    console.log('ðŸŒ URL Gestor:', url);
    
    return this.http.post(url, userData).pipe(
      timeout(10000),
      catchError((error) => {
        console.error('âŒ Error creando Gestor:', error);
        return this.handleError(error);
      })
    );
  }

  private handleError(error: any): Observable<never> {
    console.error('âŒ Tipo de error:', error.name);
    console.error('âŒ Status:', error.status);
    
    if (error.name === 'TimeoutError') {
      return throwError(() => ({
        message: 'La conexiÃ³n tardÃ³ demasiado tiempo. El usuario puede haberse creado exitosamente.',
        status: 'timeout'
      }));
    }
    return throwError(() => error);
  }

  updateProfile(userId: string, updates: any): Observable<any> {
    const url = `${this.apiUrl}/users/${userId}/profile`;
    console.log('ðŸ”„ AdminService: Actualizando perfil en:', url);
    console.log('ðŸ“¦ Datos:', updates);
    
    return this.http.put(url, updates).pipe(
      timeout(10000),
      catchError((error) => {
        console.error('âŒ Error actualizando perfil:', error);
        return this.handleError(error);
      })
    );
  }

  deleteUser(userId: string): Observable<any> {
    const url = `${this.apiUrl}/users/${userId}`;
    console.log('AdminService: Eliminando usuario:', userId);
    
    // Usamos directamente el endpoint del backend que ya maneja la eliminaciÃ³n de contraseÃ±a
    return this.http.delete(url).pipe(
      timeout(5000), // Reducir el timeout a 5 segundos es suficiente
      catchError((error) => {
        console.error('Error en el proceso de eliminaciÃ³n:', error);
        return this.handleError(error);
      })
    );
  }

  /**
   * Obtiene el perfil detallado de un usuario
   * @param usuarioId ID del usuario a consultar
   * @param adminId ID del administrador que realiza la consulta
   */
  obtenerPerfil(usuarioId: string, adminId?: string): Observable<PerfilDetalle> {
    const url = `${this.apiUrl}/perfiles/${usuarioId}`;
    console.log('ðŸ” AdminService: Obteniendo perfil de usuario:', usuarioId);
    if (adminId) {
      console.log('ðŸ‘¤ Administrador consultante:', adminId);
    } else {
      console.log('âš ï¸ AdminService: Admin-ID no disponible; se realizarÃ¡ la peticiÃ³n sin encabezado');
    }

    const options = adminId ? { headers: { 'Admin-ID': adminId } } : {};

    return this.http.get<PerfilDetalle>(url, options).pipe(
      timeout(5000),
      catchError((error) => {
        console.error('âŒ Error obteniendo perfil:', error);
        return this.handleError(error);
      })
    );
  }

  /**
   * Bloquea un usuario impidiendo su acceso al sistema
   * @param usuarioId ID del usuario a bloquear
   * @param adminId ID del administrador que realiza la acciÃ³n
   */
  bloquearUsuario(usuarioId: string, adminId: string): Observable<any> {
    const url = `${this.apiUrl}/usuarios/${usuarioId}/bloquear`;
    console.log('ðŸ”’ AdminService: Bloqueando usuario:', usuarioId);
    
    const headers = { 'Admin-ID': adminId };
    
    return this.http.put(url, {}, { headers }).pipe(
      timeout(5000),
      catchError((error) => {
        console.error('âŒ Error bloqueando usuario:', error);
        return this.handleError(error);
      })
    );
  }

  /**
   * Desbloquea un usuario restaurando su acceso al sistema
   * @param usuarioId ID del usuario a desbloquear
   * @param adminId ID del administrador que realiza la acciÃ³n
   */
  desbloquearUsuario(usuarioId: string, adminId: string): Observable<any> {
    const url = `${this.apiUrl}/usuarios/${usuarioId}/desbloquear`;
    console.log('ðŸ”“ AdminService: Desbloqueando usuario:', usuarioId);
    
    const headers = { 'Admin-ID': adminId };
    
    return this.http.put(url, {}, { headers }).pipe(
      timeout(5000),
      catchError((error) => {
        console.error('âŒ Error desbloqueando usuario:', error);
        return this.handleError(error);
      })
    );
  }

  // =================== CONTENIDOS (solo lectura por administradores) ===================
  getContenidos(adminId: string): Observable<ContenidoResumen[]> {
    const url = `${this.apiUrl}/contenidos/listar`;
    const headers = { 'Admin-ID': adminId };
    return this.http.get<ContenidoResumen[]>(url, { headers }).pipe(
      timeout(5000),
      catchError((error) => this.handleError(error))
    );
  }

  getContenidoDetalle(id: string, adminId: string): Observable<ContenidoDetalle> {
    const url = `${this.apiUrl}/contenidos/${id}`;
    const headers = { 'Admin-ID': adminId };
    return this.http.get<ContenidoDetalle>(url, { headers }).pipe(
      timeout(5000),
      catchError((error) => this.handleError(error))
    );
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

