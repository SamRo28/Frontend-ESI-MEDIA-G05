import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from './environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {

    constructor(private client: HttpClient) {}

    login(email: string, password: string): Observable<any> {
        return this.client.post<any>(`${environment.apiUrl}/users/login`, { email, password })
        
    }

    loadQRCode(): Observable<any> {
        let email = sessionStorage.getItem('email') ;
        return this.client.post<any>(`${environment.apiUrl}/api/visualizador/activate2FA`, { email } ).pipe(
            tap(data => {
                console.log('QR Code Data:', data);
            })
        );
    }

    send3AVerificationCode(email: string): Observable<any> {
        return this.client.post<any>(`${environment.apiUrl}/users/login3Auth`, { email });
    }

    logout() {
        let token = sessionStorage.getItem("token");
        return this.client.post(`${environment.apiUrl}/users/logout`, { token},{ responseType: 'text' } );
    }

    verify3ACode(id: string, code: string): Observable<any> {
        return this.client.post<any>(`${environment.apiUrl}/users/verify3AuthCode`, { id, code });
    }

    verify2FACode(email: string, code: string) {
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