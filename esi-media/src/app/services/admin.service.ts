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

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = 'http://localhost:8080/api';

  constructor(private http: HttpClient) {}

  getUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.apiUrl}/usuarios/listar`);
  }

  crearUsuario(userData: any): Observable<any> {
    console.log('🔗 AdminService: Enviando petición POST');
    console.log('📦 Datos:', userData);

    const url = `${this.apiUrl}/administradores/crear-simple`;
    console.log('🌐 URL:', url);
    
    return this.http.post(url, userData).pipe(
      timeout(10000), // Aumentar timeout ya que sabemos que el servidor responde
      catchError((error) => {
        console.error('❌ Error en AdminService:', error);
        console.error('❌ Tipo de error:', error.name);
        console.error('❌ Status:', error.status);
        
        if (error.name === 'TimeoutError') {
          return throwError(() => ({
            message: 'La conexión tardó demasiado tiempo. El usuario puede haberse creado exitosamente.',
            status: 'timeout'
          }));
        }
        return throwError(() => error);
      })
    );
  }
}