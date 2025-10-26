import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable, timeout, catchError, throwError, switchMap } from 'rxjs';
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
    if (userData.rol === 'Gestor') {
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
        console.error('❌ Error creando Administrador:', error);
        return this.handleError(error);
      })
    );
  }

  private crearGestor(userData: any): Observable<any> {
    const url = `${this.apiUrl}/gestores/crear`;
    
    return this.http.post(url, userData).pipe(
      timeout(10000),
      catchError((error) => {
        console.error('❌ Error creando Gestor:', error);
        return this.handleError(error);
      })
    );
  }

  private handleError(error: any): Observable<never> {
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
    
    return this.http.put(url, updates).pipe(
      timeout(10000),
      catchError((error) => {
        console.error('❌ Error actualizando perfil:', error);
        return this.handleError(error);
      })
    );
  }

  /**
   * Elimina un usuario y su contraseña asociada.
   * Primero obtiene los datos del usuario para encontrar el ID de la contraseña,
   * luego elimina la contraseña y finalmente elimina el usuario.
   */
  deleteUser(userId: string): Observable<any> {
    // URLs para las peticiones
    const userUrl = `${this.apiUrl}/users/${userId}`;
    
    console.log('AdminService: Iniciando proceso de eliminación para usuario:', userId);
    
    // Paso 1: Primero obtenemos los datos del usuario para conseguir el ID de la contraseña
    return this.http.get<any>(`${this.apiUrl}/users/${userId}`).pipe(
      switchMap(usuario => {
        // Verificamos si el usuario tiene contraseña y obtenemos su ID
        if (usuario && usuario.contrasenia && usuario.contrasenia.id) {
          const passwordId = usuario.contrasenia.id;
          console.log('Encontrada contraseña con ID:', passwordId);
          
          // Paso 2: Eliminamos la contraseña primero
          return this.http.delete(`${this.apiUrl}/contrasenias/${passwordId}`).pipe(
            switchMap(() => {
              console.log('Contraseña eliminada correctamente, procediendo a eliminar el usuario');
              // Paso 3: Si la eliminación de la contraseña fue exitosa, eliminamos el usuario
              return this.http.delete(userUrl);
            }),
            catchError(error => {
              // Si hay error al eliminar la contraseña, intentamos eliminar el usuario de todas formas
              console.error('Error al eliminar la contraseña:', error);
              console.log('Intentando eliminar el usuario a pesar del error en la contraseña');
              return this.http.delete(userUrl);
            })
          );
        } else {
          // Si el usuario no tiene contraseña, solo lo eliminamos a él
          console.log('Usuario no tiene contraseña asociada o no se pudo encontrar su ID');
          return this.http.delete(userUrl);
        }
      }),
      
      // Establecemos un timeout para toda la operación
      timeout(10000),
      
      // Manejo de errores en la obtención de datos del usuario o eliminación del usuario
      catchError(error => {
        console.error('Error en el proceso de eliminación:', error);
        return this.handleError(error);
      })
    );
  }

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

  // Usar endpoint /users/{id}/profile para actualizar usuarios
  updateUser(id: string, userData: any, tipo: string): Observable<any> {
    const url = `${this.apiUrl}/users/${id}/profile`;
    
    // IMPORTANTE: NO usar headers de autorización para estos endpoints
    return this.http.put<any>(url, {userData, tipo});
      
  }

  // ====== MÉTODOS ESPECÍFICOS SIMPLIFICADOS ======
  
  getVisualizadorById(id: string): Observable<any> {
    console.log('🔗 Obteniendo visualizador (usando endpoint genérico):', id);
    return this.getUserById(id);
  }

  updateVisualizador(id: string, visualizador: VisualizadorGestionDTO): Observable<any> {

    return this.updateUser(id, visualizador, "Visualizador");
  }

  getGestorById(id: string): Observable<any> {
    console.log('🔗 Obteniendo gestor (usando endpoint genérico):', id);
    return this.getUserById(id);
  }

  updateGestor(id: string, gestor: GestorGestionDTO): Observable<any> {
    console.log('🔗 Actualizando gestor (usando endpoint genérico):', id, gestor);
    return this.updateUser(id, gestor, "GestordeContenido");
  }

  getAdministradorById(id: string): Observable<any> {
    console.log('🔗 Obteniendo administrador (usando endpoint genérico):', id);
    return this.getUserById(id);
  }

  updateAdministrador(id: string, administrador: AdministradorGestionDTO): Observable<any> {
    console.log('🔗 Actualizando administrador (usando endpoint genérico):', id, administrador);
    return this.updateUser(id, administrador, "Administrador");
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