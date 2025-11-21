import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

  constructor(private readonly http: HttpClient) {}

  createOrGet(contenidoId: string): Observable<ValoracionDTO> {
    return this.http.post<ValoracionDTO>(this.base, { contenidoId });
  }

  valorarPorId(id: string, valoracion: number): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/valorar`, { valoracion });
  }

  showRating(contenidoId: string): Observable<ShowRatingDTO> {
    return this.http.get<ShowRatingDTO>(`${this.base}/show`, { params: { contenidoId } });
  }

  average(contenidoId: string): Observable<AverageRatingDTO> {
    return this.http.get<AverageRatingDTO>(`${this.base}/average`, { params: { contenidoId } });
  }

  myRating(contenidoId: string): Observable<number> {
    return this.http.get<number>(`${this.base}/my`, { params: { contenidoId } });
  }

}
