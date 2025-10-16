import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {

    constructor(private client: HttpClient) {}

    login(email: string, password: string): Observable<any> {
        return this.client.post<string>(`http://localhost:8080/users/login`, { email, password }, { responseType: 'text' as 'json' })
        
    }

    loadQRCode(): Observable<any> {
        let email = localStorage.getItem('email') || 'sarodeba@gmail.com';
        return this.client.post<any>(`http://localhost:8080/api/visualizador/activate2FA`, { email } ).pipe(
            tap(data => {
                console.log('QR Code Data:', data);
            })
        );
    }

    send3AVerificationCode(email: string): Observable<any> {
        return this.client.post<any>(`http://localhost:8080/users/login3Auth`, { email });
    }

}