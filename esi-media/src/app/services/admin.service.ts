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
    console.log('🔗 AdminService: Detectando tipo de usuario...');
    console.log('📦 Datos:', userData);
    console.log('👤 Rol detectado:', userData.rol);

    // Decidir qué endpoint usar según el rol
    if (userData.rol === 'Gestor') {
      return this.crearGestor(userData);
    } else {
      return this.crearAdministrador(userData);
    }
  }

  private crearAdministrador(userData: any): Observable<any> {
    console.log('🔗 AdminService: Creando Administrador');
    const url = `${this.apiUrl}/administradores/crear-simple`;
    console.log('🌐 URL Administrador:', url);
    
    return this.http.post(url, userData).pipe(
      timeout(10000),
      catchError((error) => {
        console.error('❌ Error creando Administrador:', error);
        return this.handleError(error);
      })
    );
  }

  private crearGestor(userData: any): Observable<any> {
    console.log('🔗 AdminService: Creando Gestor de Contenido');
    const url = `${this.apiUrl}/gestores/crear`;
    console.log('🌐 URL Gestor:', url);
    
    return this.http.post(url, userData).pipe(
      timeout(10000),
      catchError((error) => {
        console.error('❌ Error creando Gestor:', error);
        return this.handleError(error);
      })
    );
  }

  private handleError(error: any): Observable<never> {
    console.error('❌ Tipo de error:', error.name);
    console.error('❌ Status:', error.status);
    
    if (error.name === 'TimeoutError') {
      return throwError(() => ({
        message: 'La conexión tardó demasiado tiempo. El usuario puede haberse creado exitosamente.',
        status: 'timeout'
      }));
    }
    return throwError(() => error);
  }

  updateProfile(userId: string, updates: any): Observable<any> {
    const url = `${this.apiUrl}/users/${userId}/profile`;
    console.log('🔄 AdminService: Actualizando perfil en:', url);
    console.log('📦 Datos:', updates);
    
    return this.http.put(url, updates).pipe(
      timeout(10000),
      catchError((error) => {
        console.error('❌ Error actualizando perfil:', error);
        return this.handleError(error);
      })
    );
  }

  deleteUser(userId: string): Observable<any> {
    const url = `${this.apiUrl}/users/${userId}`;
    console.log('AdminService: Eliminando usuario:', userId);
    
    // Usamos directamente el endpoint del backend que ya maneja la eliminación de contraseña
    return this.http.delete(url).pipe(
      timeout(5000), // Reducir el timeout a 5 segundos es suficiente
      catchError((error) => {
        console.error('Error en el proceso de eliminación:', error);
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
    console.log('🔍 AdminService: Obteniendo perfil de usuario:', usuarioId);
    if (adminId) {
      console.log('👤 Administrador consultante:', adminId);
    } else {
      console.log('⚠️ AdminService: Admin-ID no disponible; se realizará la petición sin encabezado');
    }

    const options = adminId ? { headers: { 'Admin-ID': adminId } } : {};

    return this.http.get<PerfilDetalle>(url, options).pipe(
      timeout(5000),
      catchError((error) => {
        console.error('❌ Error obteniendo perfil:', error);
        return this.handleError(error);
      })
    );
  }

  /**
   * Bloquea un usuario impidiendo su acceso al sistema
   * @param usuarioId ID del usuario a bloquear
   * @param adminId ID del administrador que realiza la acción
   */
  bloquearUsuario(usuarioId: string, adminId: string): Observable<any> {
    const url = `${this.apiUrl}/usuarios/${usuarioId}/bloquear`;
    console.log('🔒 AdminService: Bloqueando usuario:', usuarioId);
    
    const headers = { 'Admin-ID': adminId };
    
    return this.http.put(url, {}, { headers }).pipe(
      timeout(5000),
      catchError((error) => {
        console.error('❌ Error bloqueando usuario:', error);
        return this.handleError(error);
      })
    );
  }

  /**
   * Desbloquea un usuario restaurando su acceso al sistema
   * @param usuarioId ID del usuario a desbloquear
   * @param adminId ID del administrador que realiza la acción
   */
  desbloquearUsuario(usuarioId: string, adminId: string): Observable<any> {
    const url = `${this.apiUrl}/usuarios/${usuarioId}/desbloquear`;
    console.log('🔓 AdminService: Desbloqueando usuario:', usuarioId);
    
    const headers = { 'Admin-ID': adminId };
    
    return this.http.put(url, {}, { headers }).pipe(
      timeout(5000),
      catchError((error) => {
        console.error('❌ Error desbloqueando usuario:', error);
        return this.handleError(error);
      })
    );
  }
}