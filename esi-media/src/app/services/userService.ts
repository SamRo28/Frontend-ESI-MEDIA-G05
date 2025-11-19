import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {

    constructor(private client: HttpClient) {}

    /**
     * Login del usuario. El backend ahora devuelve el token en una cookie HttpOnly.
     * Solo recibimos el objeto usuario en el body de la respuesta.
     */
    login(email: string, password: string): Observable<any> {
        return this.client.post<any>(`${environment.apiUrl}/users/login`, { email, password });
    }

    loadQRCode(): Observable<any> {
        let email = sessionStorage.getItem('email');
        return this.client.post<any>(`${environment.apiUrl}/api/visualizador/activate2FA`, { email }).pipe(
            tap(data => {
                console.log('QR Code Data:', data);
            })
        );
    }

    send3AVerificationCode(email: string): Observable<any> {
        return this.client.post<any>(`${environment.apiUrl}/users/login3Auth`, { email });
    }

    /**
     * Logout del usuario. El backend invalida la cookie automáticamente.
     * Ya no es necesario enviar el token ni eliminarlo del localStorage.
     */
    logout(): Observable<any> {
        return this.client.post(`${environment.apiUrl}/users/logout`, {}, { responseType: 'text' });
    }

    /**
     * Verifica el código 3FA. El backend establece la cookie tras la verificación exitosa.
     */
    verify3ACode(id: string, code: string): Observable<any> {
        return this.client.post<any>(`${environment.apiUrl}/users/verify3AuthCode`, { id, code });
    }

    /**
     * Verifica el código 2FA. El backend establece la cookie tras la verificación exitosa.
     */
    verify2FACode(email: string, code: string): Observable<string> {
        return this.client.post(
            `${environment.apiUrl}/users/verify2FACode`,
            { email, code },
            { responseType: 'text' }
        );
    }

// Password Recovery 
  requestPasswordReset(email: string): Observable<any> {
    return this.client.post<any>(`${environment.apiUrl}/users/password-reset/request`, { email });
  }

  validateResetToken(token: string): Observable<any> {
    const params = new HttpParams().set('token', token);
    return this.client.get<any>(`${environment.apiUrl}/users/password-reset/validate`, { params });
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.client.post<any>(`${environment.apiUrl}/users/password-reset/confirm`, { token, newPassword });
  }

}