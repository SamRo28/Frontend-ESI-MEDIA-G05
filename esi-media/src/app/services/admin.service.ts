import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timeout, catchError, throwError } from 'rxjs';
import { map } from 'rxjs/operators';

// Interfaces para usuarios básicos
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

// DTOs para gestión de usuarios (coinciden con backend)
export interface VisualizadorGestionDTO {
  id?: string;
  nombre: string;
  apellidos: string;
  email: string;
  foto?: any; // Object en backend
  alias: string;
  bloqueado: boolean;
  fecharegistro?: Date;
  fechanac: Date;
  vip?: boolean;
}

export interface GestorGestionDTO {
  id?: string;
  nombre: string;
  apellidos: string;
  email: string;
  foto?: any; // Object en backend
  alias: string;
  campoespecializacion?: string; // Nombre correcto del backend
  descripcion?: string;
  tipocontenidovideooaudio?: string;
  bloqueado: boolean;
  fecharegistro?: Date;
}

export interface AdministradorGestionDTO {
  id?: string;
  nombre: string;
  apellidos: string;
  email: string;
  foto?: any; // Object en backend
  departamento: string;
  bloqueado: boolean;
  fecharegistro?: Date;
}

// Interfaces para respuestas paginadas
export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly apiUrl = 'http://localhost:8080';

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
      
      console.warn('⚠️ No se encontró token en sessionStorage.authToken');
      console.log('🔍 Tokens alternativos encontrados:', {
        'localStorage.authToken': localStorage.getItem('authToken'),
        'sessionStorage.token': sessionStorage.getItem('token'),
        'localStorage.token': localStorage.getItem('token')
      });
      
      if (!token) {
        console.error('❌ No hay token de autorización disponible');
        // Por ahora, continuar sin token para ver si algunos endpoints funcionan sin auth
        return {
          headers: {
            'Content-Type': 'application/json'
          }
        };
      }
    }
    
    console.log('✅ Token de autorización encontrado:', token ? token.substring(0, 20) + '...' : 'null');
    
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  }

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

  // ====== NUEVA ESTRATEGIA: Usar endpoints simples que YA FUNCIONAN ======
  
  // Obtener cualquier usuario por ID (usando endpoint existente)
  getUserById(id: string): Observable<any> {
    console.log('🔗 Obteniendo usuario por ID:', id);
    const url = `${this.apiUrl}/users/${id}`;
    console.log('🌐 URL:', url);
    return this.http.get<any>(url)
      .pipe(
        timeout(10000),
        catchError(this.handleError)
      );
  }

  // ✅ MÉTODO CORREGIDO: Usar endpoints simples que funcionaban antes
  updateUser(id: string, userData: any): Observable<any> {
    console.log('🔗 Actualizando usuario:', id, userData);
    console.log('🎯 VOLVIENDO a estrategia simple que funcionaba antes');
    
    // VOLVER A LA ESTRATEGIA ORIGINAL: usar /users/{id}/profile que funcionaba
    const url = `${this.apiUrl}/users/${id}/profile`;
    console.log('🌐 URL (endpoint simple SIN auth):', url);
    console.log('📦 Datos enviados:', userData);
    
    // IMPORTANTE: NO usar headers de autorización para estos endpoints
    return this.http.put<any>(url, userData)
      .pipe(
        timeout(10000),
        catchError((error) => {
          console.error('❌ Error en PUT /users/' + id + '/profile:', error);
          console.error('❌ Status:', error.status);
          console.error('❌ Respuesta del servidor:', error.error);
          
          // Si falla /profile, intentar sin /profile
          console.log('🔄 Intentando sin /profile...');
          const fallbackUrl = `${this.apiUrl}/users/${id}`;
          return this.http.put<any>(fallbackUrl, userData).pipe(
            timeout(10000),
            catchError(this.handleError)
          );
        })
      );
  }

  // ====== MÉTODOS ESPECÍFICOS SIMPLIFICADOS ======
  
  getVisualizadorById(id: string): Observable<any> {
    console.log('🔗 Obteniendo visualizador (usando endpoint genérico):', id);
    return this.getUserById(id);
  }

  updateVisualizador(id: string, visualizador: VisualizadorGestionDTO): Observable<any> {
    console.log('🔗 Actualizando visualizador (usando endpoint genérico):', id, visualizador);
    return this.updateUser(id, visualizador);
  }

  getGestorById(id: string): Observable<any> {
    console.log('🔗 Obteniendo gestor (usando endpoint genérico):', id);
    return this.getUserById(id);
  }

  updateGestor(id: string, gestor: GestorGestionDTO): Observable<any> {
    console.log('🔗 Actualizando gestor (usando endpoint genérico):', id, gestor);
    return this.updateUser(id, gestor);
  }

  getAdministradorById(id: string): Observable<any> {
    console.log('🔗 Obteniendo administrador (usando endpoint genérico):', id);
    return this.getUserById(id);
  }

  updateAdministrador(id: string, administrador: AdministradorGestionDTO): Observable<any> {
    console.log('🔗 Actualizando administrador (usando endpoint genérico):', id, administrador);
    return this.updateUser(id, administrador);
  }

  // ====== MÉTODOS PARA COMPATIBILIDAD CON USER-MANAGEMENT ======
  
  getAllVisualizadores(page: number = 0, size: number = 10): Observable<any> {
    console.log('🔗 Obteniendo todos los visualizadores (simulado con /users/listar)');
    // Simulamos paginación filtrando localmente
    return this.getUsuarios().pipe(
      map((users: Usuario[]) => {
        const visualizadores = users.filter(u => u.rol === 'Visualizador');
        const start = page * size;
        const end = start + size;
        return {
          content: visualizadores.slice(start, end),
          totalPages: Math.ceil(visualizadores.length / size),
          totalElements: visualizadores.length
        };
      })
    );
  }

  getAllGestores(page: number = 0, size: number = 10): Observable<any> {
    console.log('🔗 Obteniendo todos los gestores (simulado con /users/listar)');
    return this.getUsuarios().pipe(
      map((users: Usuario[]) => {
        const gestores = users.filter(u => u.rol === 'Gestor');
        const start = page * size;
        const end = start + size;
        return {
          content: gestores.slice(start, end),
          totalPages: Math.ceil(gestores.length / size),
          totalElements: gestores.length
        };
      })
    );
  }

  getAllAdministradores(page: number = 0, size: number = 10): Observable<any> {
    console.log('🔗 Obteniendo todos los administradores (simulado con /users/listar)');
    return this.getUsuarios().pipe(
      map((users: Usuario[]) => {
        const administradores = users.filter(u => u.rol === 'Administrador');
        const start = page * size;
        const end = start + size;
        return {
          content: administradores.slice(start, end),
          totalPages: Math.ceil(administradores.length / size),
          totalElements: administradores.length
        };
      })
    );
  }

  // Métodos de eliminación usando endpoint genérico
  deleteVisualizador(id: string): Observable<any> {
    console.log('🔗 Eliminando visualizador:', id);
    return this.deleteUser(id);
  }

  deleteGestor(id: string): Observable<any> {
    console.log('🔗 Eliminando gestor:', id);
    return this.deleteUser(id);
  }

  deleteAdministrador(id: string): Observable<any> {
    console.log('🔗 Eliminando administrador:', id);
    return this.deleteUser(id);
  }

  // ====== MÉTODO UNIFICADO PARA OBTENER TODOS LOS USUARIOS ======
  getAllUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.apiUrl}/usuarios/todos`)
      .pipe(
        timeout(10000),
        catchError(this.handleError)
      );
  }
}