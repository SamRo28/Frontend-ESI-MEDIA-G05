import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface ApiFieldError { field?: string; message: string }
export interface ApiErrorResponse { 
  exitoso?: boolean;
  mensaje?: string;
  errores?: string[] | ApiFieldError[];
}

export interface VisualizadorRegistro {
  nombre: string;
  apellidos: string;
  email: string;
  alias?: string;
  fecha_nac: string;
  contrasenia: string;
  confirmacion_contrasenia: string;
  vip: boolean;
  foto?: string | null;
}

export interface RegistroResponse {
  exitoso: boolean;
  mensaje: string;
  visualizador?: any;
  token?: string;
}

export interface EstadoActivacionResponse {
  activated: boolean;
  token?: string;
}

@Injectable({ providedIn: 'root' })
export class VisualizadorService {
  // URL base del API (configurable según entorno)
  private apiUrl = `${environment.apiUrl}/api/visualizador`;

  constructor(private http: HttpClient) {}

  register(datos: VisualizadorRegistro): Observable<RegistroResponse> {
    return this.http.post<RegistroResponse>(`${this.apiUrl}/registro`, datos).pipe(
      catchError((err: HttpErrorResponse) => {
        console.log('Error desde el servidor:', err);
        console.log('Error status:', err.status);
        console.log('Error body:', err.error);
        console.log('Error completo JSON:', JSON.stringify(err.error));
        
        // Extraer el cuerpo de la respuesta de error
        const body: ApiErrorResponse = err?.error || {};
        
        // Verificar errores específicos como email duplicado
        if (err?.status === 400) {
          console.log('Respuesta de error 400:', body);
          
          // Comprobar todas las posibles variantes de mensaje de email duplicado
          const mensajeCompleto = JSON.stringify(body).toLowerCase();
          if (
            mensajeCompleto.includes('email ya registrado') || 
            mensajeCompleto.includes('email ya existe') ||
            mensajeCompleto.includes('correo ya existe') ||
            mensajeCompleto.includes('correo duplicado') ||
            mensajeCompleto.includes('email duplicado') ||
            mensajeCompleto.includes('el email ya está registrado') ||
            mensajeCompleto.includes('unicidad: el email ya está registrado')
          ) {
            return throwError(() => ({ 
              errors: [
                { field: 'email', message: 'Este correo ya está registrado en el sistema' }
              ] 
            }));
          }
        }
        
        // Verificar si tenemos una lista de errores específicos del servidor
        if (Array.isArray(body.errores) && body.errores.length > 0) {
          // Convertir al formato que espera nuestro componente
          const erroresFormateados = body.errores.map((error: any) => {
            // Si ya es un objeto con field y message, usarlo directamente
            if (typeof error === 'object' && error.field && error.message) {
              return error;
            }
            // Si es un string, asumimos que es un mensaje general
            return { field: 'general', message: error };
          });
          return throwError(() => ({ errors: erroresFormateados }));
        }
        
        // Si hay un mensaje general
        if (body && body.mensaje) {
          return throwError(() => ({ errors: [{ field: 'general', message: body.mensaje }] }));
        }
        
        // Error de conexión o no manejado
        return throwError(() => ({ errors: [{ field: 'general', message: 'Error de conexión con el servidor' }] }));
      })
    );
  }

  activarCuenta(token: string): Observable<RegistroResponse> {
    return this.http.post<RegistroResponse>(`${this.apiUrl}/activar`, { token });
  }

  estadoActivacion(email: string): Observable<EstadoActivacionResponse> {
    return this.http.get<EstadoActivacionResponse>(`${this.apiUrl}/estado-activacion`, { params: { email } });
  }
}
