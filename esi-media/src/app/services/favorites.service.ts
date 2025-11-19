import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ContenidoResumenDTO } from './multimedia.service';

@Injectable({
  providedIn: 'root'
})
export class FavoritesService {
  private readonly baseUrl = `${environment.apiUrl}/api/favoritos`;

  constructor(private readonly http: HttpClient) {}

  list(): Observable<ContenidoResumenDTO[]> {
    return this.http.get<ContenidoResumenDTO[]>(this.baseUrl);
  }

  add(contentId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${contentId}`, {});
  }

  remove(contentId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${contentId}`);
  }
}
