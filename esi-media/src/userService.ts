import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {

    constructor(private client: HttpClient) {}

    login(email: string, password: string): Observable<any> {
        return this.client.post<any>(`http://localhost:8080/users/login`, { email, password })
        
    }

    loadQRCode(): Observable<any> {
        let email = sessionStorage.getItem('email') ;
        return this.client.post<any>(`http://localhost:8080/api/visualizador/activate2FA`, { email } ).pipe(
            tap(data => {
                console.log('QR Code Data:', data);
            })
        );
    }

    send3AVerificationCode(email: string): Observable<any> {
        return this.client.post<any>(`http://localhost:8080/users/login3Auth`, { email });
    }

    verify3ACode(id: string, code: string): Observable<any> {
        return this.client.post<any>(`http://localhost:8080/users/verify3AuthCode`, { id, code });
    }
    verify2FACode(email: string, code: string): Observable<any> {
        return this.client.post<any>(`http://localhost:8080/users/verify2FACode`, { email, code });
    }

    // Solicitar recuperación de contraseña (envía email con token)
    forgotPassword(email: string, frontendUrl: string): Observable<any> {
        return this.client.post<any>(`http://localhost:8080/auth/forgot-password`, { email, frontendUrl });
    }

    // Restablecer contraseña usando token
    resetPassword(token: string, newPassword: string): Observable<any> {
        return this.client.post<any>(`http://localhost:8080/auth/reset-password`, { token, newPassword });
    }

}