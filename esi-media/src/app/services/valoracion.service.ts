import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ValoracionDTO {
  id: string;
  visualizadorId: string;
  contenidoId: string;
  valoracionFinal: number | null;
}

export interface ShowRatingDTO {
  myRating: number | null;
}

export interface AverageRatingDTO {
  averageRating: number | null;
  ratingsCount: number;
}

@Injectable({ providedIn: 'root' })
export class ValoracionService {
  private readonly base = `${environment.apiUrl}/api/valoraciones`;

  constructor(private http: HttpClient) {}

  private authOptions(params?: Record<string, string | string[]>) : { headers?: HttpHeaders; params?: Record<string, string | string[]> } {
    const possibleKeys = ['token', 'access_token', 'authToken', 'Authorization'];
    let token: string | null = null;
    for (const k of possibleKeys) {
      const v = sessionStorage.getItem(k);
      if (v) { token = v; break; }
    }
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    const opts: { headers?: HttpHeaders; params?: Record<string, string | string[]> } = {};
    if (headers) { opts.headers = headers; }
    if (params) { opts.params = params; }
    return opts;
  }

  createOrGet(contenidoId: string): Observable<ValoracionDTO> {
    const opts = this.authOptions();
    return this.http.post<ValoracionDTO>(this.base, { contenidoId }, opts);
  }

  valorarPorId(id: string, valoracion: number): Observable<void> {
    const opts = this.authOptions();
    return this.http.post<void>(`${this.base}/${id}/valorar`, { valoracion }, opts);
  }

  showRating(contenidoId: string): Observable<ShowRatingDTO> {
    const opts = this.authOptions({ contenidoId });
    return this.http.get<ShowRatingDTO>(`${this.base}/show`, opts);
  }

  average(contenidoId: string): Observable<AverageRatingDTO> {
    const opts = this.authOptions({ contenidoId });
    return this.http.get<AverageRatingDTO>(`${this.base}/average`, opts);
  }

  myRating(contenidoId: string): Observable<number> {
    const opts = this.authOptions({ contenidoId });
    return this.http.get<number>(`${this.base}/my`, opts);
  }

}
