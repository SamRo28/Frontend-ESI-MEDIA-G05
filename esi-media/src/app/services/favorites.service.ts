import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { finalize, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ContenidoResumenDTO } from './multimedia.service';

@Injectable({
  providedIn: 'root'
})
export class FavoritesService {
  private readonly baseUrl = `${environment.apiUrl}/api/favoritos`;
  private readonly favoritesChanged$ = new Subject<void>();
  private readonly favoritesCache$ = new BehaviorSubject<ContenidoResumenDTO[] | null>(null);
  private pendingUpdate = false;

  readonly favoritesUpdates$ = this.favoritesChanged$.asObservable();

  constructor(private readonly http: HttpClient) {}

  list(): Observable<ContenidoResumenDTO[]> {
    return this.fetchFreshFavorites();
  }

  add(contentId: string): Observable<void> {
    this.pendingUpdate = true;
    const refresh$ = this.fetchFreshFavorites().pipe(finalize(() => this.pendingUpdate = false));
    return this.http.post<void>(`${this.baseUrl}/${contentId}`, {})
      .pipe(
        switchMap(() => refresh$),
        tap(() => this.favoritesChanged$.next()),
        map(() => undefined)
      );
  }

  remove(contentId: string): Observable<void> {
    this.pendingUpdate = true;
    const refresh$ = this.fetchFreshFavorites().pipe(finalize(() => this.pendingUpdate = false));
    return this.http.delete<void>(`${this.baseUrl}/${contentId}`)
      .pipe(
        switchMap(() => refresh$),
        tap(() => this.favoritesChanged$.next()),
        map(() => undefined)
      );
  }

  getCachedFavorites(): ContenidoResumenDTO[] | null {
    return this.favoritesCache$.value;
  }

  hasPendingUpdates(): boolean {
    return this.pendingUpdate;
  }

  private fetchFreshFavorites(): Observable<ContenidoResumenDTO[]> {
    return this.http.get<ContenidoResumenDTO[]>(this.baseUrl)
      .pipe(tap(list => this.favoritesCache$.next(list)));
  }
}
