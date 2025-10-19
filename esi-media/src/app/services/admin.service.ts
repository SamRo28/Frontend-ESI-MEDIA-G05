import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timeout, catchError, throwError, switchMap } from 'rxjs';

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

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = 'http://localhost:8080';

  constructor(private http: HttpClient) {}

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
}