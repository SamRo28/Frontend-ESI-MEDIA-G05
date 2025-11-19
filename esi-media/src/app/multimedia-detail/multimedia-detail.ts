import { Component, OnDestroy, OnInit, inject, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { CommonModule, NgIf, NgFor, isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MultimediaService, ContenidoDetalleDTO } from '../services/multimedia.service';
import { UserService } from '../services/userService';
import { ListaService, ListasResponse } from '../services/lista.service';
// Forzar uso explícito del entorno de producción (apiUrl desplegado)
import { environment } from '../../environments/environment.production';
import { ValoracionService } from '../services/valoracion.service';
import { ValoracionComponent } from '../shared/valoracion/valoracion.component';
import { finalize } from 'rxjs/operators';
import { FavoritesService } from '../services/favorites.service';

interface Notificacion {
  mensaje: string;
  tipo: 'success' | 'error' | 'info';
}

@Component({
  selector: 'app-multimedia-detail',
  standalone: true,
  // Añadimos NgIf y NgFor explícitamente para entornos que requieren import directo de las directivas estructurales
  imports: [CommonModule, NgIf, NgFor, RouterLink, RouterLinkActive, ValoracionComponent],
  templateUrl: './multimedia-detail.html',
  styleUrls: ['./multimedia-detail.css']
})
export class MultimediaDetailComponent implements OnInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  id!: string;
  cargando = false;
  error: string | null = null;
  detalle: ContenidoDetalleDTO | null = null;
  audioUrl: string | null = null; // ya no se usa para reproducción directa, se mantiene por compatibilidad
  audioCargando = false; // obsoleto con reproducción directa
  audioError: string | null = null;
  // Estado avanzado de reproductor de vídeo
  playerReady = false; // true cuando iframe YouTube carga o <video> tiene metadata/canplay
  buffering = false;   // true cuando el vídeo entra en estado de espera tras haber estado listo
  private detalleTimeout: any | null = null;
  // Cache estable para evitar recarga continua del iframe YouTube
  isYoutube = false;
  youtubeSafeUrl: SafeResourceUrl | null = null;
  private youtubeVideoId: string | null = null;
  // Ya no necesitamos token, las cookies lo gestionan automáticamente
  // Datos para el header unificado
  showUserMenu = false;
  userName: string = 'Usuario';
  userInitial: string = 'U';
  isGestor: boolean = false;

  // Propiedades para las listas privadas
  listasPrivadas: any[] = [];
  mostrarDropdownListas = false;
  cargandoListas = false;
  notificacion: Notificacion | null = null;

  // Valoraciones
  averageRating: number | null = null;
  ratingsCount: number = 0;
  // Indica si existe una instancia Valoracion para este usuario+contenido
  ratingInstanceExists: boolean = false;
  // Si creamos o recuperamos la instancia, la guardamos aquí
  valoracionInstance: any | null = null;
  favoritoLoading = false;
  isFavoritoDetalle = false;

  constructor(
    private route: ActivatedRoute,
    private multimedia: MultimediaService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private listaService: ListaService,
    private router: Router,
    private valoracionSvc: ValoracionService,
    private favoritesService: FavoritesService,
    private userService: UserService
  ) {}

  // Utilidades de uso interno para reducir complejidad
  private schedule(fn: () => void): void { setTimeout(fn, 0); }
  private clearDetalleTimeoutSafely(): void {
    if (this.detalleTimeout) { clearTimeout(this.detalleTimeout); this.detalleTimeout = null; }
  }
  private isYoutubeUrl(url: string): boolean {
    return /youtube\.com\/watch\?v=|youtu\.be\//i.test(url);
  }
  private extractYoutubeId(url: string): string | null {
    const watchMatch = url.match(/[?&]v=([^&#]+)/);
    const shortMatch = url.match(/youtu\.be\/([^?&#]+)/);
    return (watchMatch && watchMatch[1]) || (shortMatch && shortMatch[1]) || null;
  }

  ngOnInit(): void {
    // Evitar peticiones en SSR
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    // Ya no necesitamos capturar el token manualmente
    // El navegador enviará automáticamente la cookie HttpOnly
    
    // Cargar listas privadas del usuario
    this.cargarListasPrivadas();

    // Suscribirse a cambios de parámetro para soportar navegación a otros ids reutilizando el componente
    this.route.paramMap.subscribe(pm => {
      const nuevoId = pm.get('id');
      if (nuevoId && nuevoId !== this.id) {
        this.id = nuevoId;
        this.cargar();
      } else if (!this.detalle) {
        // Primera carga
        this.id = nuevoId || this.id;
        this.cargar();
      }
    });

    // Cargar datos de usuario para el header
    this.loadUserData();
  }

  onValoracionUpdated(): void {
    // Refrescar promedio y estado local tras una valoración
    if (!this.id) return;
    this.valoracionSvc.average(this.id).subscribe({ next: (avg) => {
      this.averageRating = avg?.averageRating ?? null;
      this.ratingsCount = avg?.ratingsCount ?? 0;
      this.cdr.markForCheck();
    }, error: () => {} });
  }

  ngOnDestroy(): void {
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
    }
    if (this.detalleTimeout) {
      clearTimeout(this.detalleTimeout);
      this.detalleTimeout = null;
    }
  }

  cargar(): void {
    this.cargando = true;
    this.error = null;
    console.log('[MultimediaDetail] Iniciando carga detalle id=', this.id);
    this.clearDetalleTimeoutSafely();
    // Fallback de seguridad: si en 8s no llega respuesta, apagamos loader y mostramos error genérico
    this.detalleTimeout = setTimeout(() => {
      if (this.cargando) {
          
        this.cargando = false;
        if (!this.detalle && !this.error) {
          this.error = 'Tiempo de espera agotado al cargar el contenido';
        }
      }
    }, 8000);
    this.multimedia.detalle(this.id).subscribe({
        next: (d) => {
          this.detalle = d;
          this.revisarFavorito();
          // Para VIDEO: dejamos de mostrar loader general (datos recibidos) pero activamos skeleton hasta ready
        if (d.tipo === 'VIDEO') {
          this.cargando = false;
          this.playerReady = false;
          this.buffering = false;
          
          this.cdr.markForCheck();
          const url = d.referenciaReproduccion || '';
          this.isYoutube = this.isYoutubeUrl(url);
          const id = this.isYoutube ? this.extractYoutubeId(url) : null;
          this.youtubeVideoId = id;
          this.youtubeSafeUrl = id ? this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${id}`) : null;
        }
        // Para AUDIO mantenemos cargando sólo hasta el botón (descarga diferida), así que apagamos también
        if (d.tipo === 'AUDIO') {
          this.cargando = false;
          
          this.cdr.markForCheck();
        }
        this.clearDetalleTimeoutSafely();
        // Tras cargar detalle, obtener promedio y estado de mi valoración (si existe)
        try {
          // Average (siempre público)
          
          this.valoracionSvc.average(this.id).subscribe({ next: (avg) => {
            this.averageRating = avg?.averageRating ?? null;
            this.ratingsCount = avg?.ratingsCount ?? 0;
            this.cdr.markForCheck();
          }, error: () => {} });

          // Show: requiere auth y nos indicará si existe instancia y si ya valoró
          
          this.valoracionSvc.showRating(this.id).subscribe({
            next: (dto) => {
              // Si devuelve 200 con dto.myRating != null => existe y tengo rating
              this.ratingInstanceExists = true;
              // Keep my rating only if not null
              if (dto?.myRating != null) {
                // Crear placeholder instance minimal (id unknown until createOrGet)
                this.valoracionInstance = { id: null, valoracionFinal: dto.myRating };
              }
              this.cdr.markForCheck();
            },
            error: (err) => {
              if (err?.status === 204) {
                // Existe instancia pero no valoró aún
                this.ratingInstanceExists = true;
              } else if (err?.status === 404) {
                this.ratingInstanceExists = false;
              }
              this.cdr.markForCheck();
            }
          });
        } catch (e) {
          console.error('[MultimediaDetail] error loading valoracion data', e);
          // ignorar errores de carga de valoraciones
        }
      },
      error: (err) => {
        console.error('Error cargando detalle', err);
        this.error = (err?.error?.mensaje) || 'No se pudo cargar el detalle';
        this.cargando = false;
        this.cdr.markForCheck();
        this.clearDetalleTimeoutSafely();
      }
    });
  }

  // --- Botón Reproducir ---
  playDisabled = false;

  onReproducir(): void {
    if (!this.detalle || this.playDisabled) return;
    // Bloquear inmediatamente para evitar dobles clics mientras esperamos respuesta
    this.playDisabled = true;
    const id = this.detalle.id;
    // 1) Registrar reproducción en backend
    this.multimedia.reproducir(id).subscribe({
      next: (res) => {
        // Actualizar contador en UI y bloquear botón
        if (this.detalle) {
          (this.detalle as any).nvisualizaciones = res?.nvisualizaciones ?? (this.detalle as any).nvisualizaciones;
        }
        // Forzar refresco de la vista para reflejar el nuevo contador
        this.cdr.markForCheck();
        // Crear o recuperar instancia Valoracion (idempotente) — no bloqueante para reproducir
        try {
          
          this.valoracionSvc.createOrGet(id).subscribe({ next: (v) => {
            
            this.valoracionInstance = v;
            this.ratingInstanceExists = true;
            // actualizar average
            this.valoracionSvc.average(id).subscribe({ next: (avg) => {
              this.averageRating = avg?.averageRating ?? null;
              this.ratingsCount = avg?.ratingsCount ?? 0;
              this.cdr.markForCheck();
            }, error: () => {} });
            this.cdr.markForCheck();
          }, error: (err) => { console.error('[MultimediaDetail] createOrGet error', err); } });
        } catch (e) { console.error('[MultimediaDetail] createOrGet thrown', e); }
        // 2) Iniciar reproducción según tipo
        setTimeout(() => this.iniciarPlayback(), 0);
      },
      error: (err) => {
        console.error('[MultimediaDetail] Error registrando reproducción', err);
        this.mostrarNotificacion('No se pudo registrar la reproducción', 'error');
        // Rehabilitar el botón para permitir reintentar si falló la petición
        this.playDisabled = false;
      }
    });
  }

  private iniciarPlayback(): void {
    if (!this.detalle) return;
    
    const playbackHandlers = {
      'AUDIO': () => this.iniciarPlaybackAudio(),
      'VIDEO': () => this.iniciarPlaybackVideo()
    };

    const handler = playbackHandlers[this.detalle.tipo as keyof typeof playbackHandlers];
    if (handler) {
      handler();
    }
  }

  private iniciarPlaybackAudio(): void {
    const audioElement = document.querySelector('audio');
    if (audioElement) {
      this.reproducirElemento(audioElement as HTMLAudioElement);
    }
  }

  private iniciarPlaybackVideo(): void {
    if (this.shouldPlayYoutubeVideo()) {
      this.iniciarPlaybackYoutube();
    } else {
      this.iniciarPlaybackVideoNativo();
    }
  }

  private shouldPlayYoutubeVideo(): boolean {
    return this.isYoutube && !!this.youtubeVideoId;
  }

  private iniciarPlaybackYoutube(): void {
    const url = `https://www.youtube.com/embed/${this.youtubeVideoId}?autoplay=1`;
    this.youtubeSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.cdr.markForCheck();
  }

  private iniciarPlaybackVideoNativo(): void {
    const videoElement = document.querySelector('video');
    if (videoElement) {
      this.reproducirElemento(videoElement as HTMLVideoElement);
    }
  }

  private reproducirElemento(element: HTMLAudioElement | HTMLVideoElement): void {
    element.play()?.catch(() => {
      // Silenciar errores de reproducción
    });
  }

  descargarAudio(): void {
    // Mantenido por compatibilidad; ya no se usa al reproducir directo con <audio src>
    this.audioError = null;
  }

  // --- Helpers VIDEO ---
  esYoutube(): boolean { return this.isYoutube; }

  reintentarAudio(): void {
    if (this.detalle?.tipo === 'AUDIO') {
      this.descargarAudio();
    }
  }

  audioSrc(): string {
    if (!this.detalle || this.detalle.tipo !== 'AUDIO') return '';
    let base = this.detalle.referenciaReproduccion || '';
    // Normalizar a dominio de backend en despliegue, evitando localhost
    try {
      if (/^https?:\/\//i.test(base)) {
        const u = new URL(base);
        // Reescribir siempre el origen al del backend configurado
        base = `${environment.apiUrl.replace(/\/+$/,'')}${u.pathname}${u.search || ''}${u.hash || ''}`;
      } else if (/^\//.test(base)) {
        // Ruta relativa -> anteponer dominio backend
        base = `${environment.apiUrl.replace(/\/+$/,'')}${base}`;
      }
    } catch {
      // Fallback simple si URL constructor falla: asegurar prefijo del backend cuando parece relativo
      if (!/^https?:\/\//i.test(base)) {
        base = `${environment.apiUrl.replace(/\/+$/,'')}/${base.replace(/^\/+/, '')}`;
      }
    }
    // Evitar duplicar protocolo si accidentalmente ya contiene http://http://
    base = base.replace(/^(https?:\/\/)+(https?:\/\/)/i, '$1');
    // Ya no añadimos el token como parámetro de query, el navegador envía la cookie
    return base;
  }

  onAudioError(ev: Event): void {
    console.error('[MultimediaDetail] Error evento <audio>', ev);
    this.audioError = 'No se pudo cargar el audio (recurso no encontrado o sin permiso)';
  }

  onAudioLoaded(ev: Event): void {
    
  }

  caratulaUrl(): string | null {
    const c = this.detalle?.caratula as any;
    if (!c) return null;
    if (typeof c === 'string') return c;
    if (typeof c === 'object') {
      for (const k of ['url','src','data']) {
        if (typeof (c as any)[k] === 'string') return (c as any)[k];
      }
    }
    return null;
  }

  tags(): string[] {
    const anyDetalle: any = this.detalle;
    const raw = anyDetalle?.tags;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter(t => typeof t === 'string');
    return [];
  }

  duracion(): number | null {
    const anyDetalle: any = this.detalle;
    const d = anyDetalle?.duracion;
    return (typeof d === 'number' && d >= 0) ? d : null;
  }

  // --- Eventos del reproductor de VIDEO ---
  onIframeLoaded(): void {
    console.log('[MultimediaDetail] iframe load');
    this.schedule(() => { this.playerReady = true; this.buffering = false; this.cdr.markForCheck(); });
  }

  // Formatea Date|string ISO a fecha corta local
  formatFecha(d?: string | Date | null): string {
    if (!d) return '';
    try {
      const date = (d instanceof Date) ? d : new Date(d);
      return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit' }).format(date);
    } catch {
      return '' + d;
    }
  }
  onVideoLoaded(): void {
    // loadedmetadata: ya tenemos duración, podemos mostrar el player
    console.log('[MultimediaDetail] video loadedmetadata');
    this.schedule(() => { this.playerReady = true; this.cdr.markForCheck(); });
  }
  onVideoCanPlay(): void {
    console.log('[MultimediaDetail] video canplay');
    this.schedule(() => { this.playerReady = true; this.buffering = false; this.cdr.markForCheck(); });
  }
  onVideoWaiting(): void {
    console.log('[MultimediaDetail] video waiting');
    this.schedule(() => { if (this.playerReady) { this.buffering = true; this.cdr.markForCheck(); } });
  }
  onVideoPlaying(): void {
    console.log('[MultimediaDetail] video playing');
    this.schedule(() => { this.buffering = false; this.cdr.markForCheck(); });
  }

  // --- Métodos para manejo de listas privadas ---
  
  /**
   * Carga las listas privadas del usuario autenticado
   */
  cargarListasPrivadas(): void {
    // Verificar que el usuario esté autenticado
    const userClass = sessionStorage.getItem('currentUserClass');
    if (!userClass) {
      return;
    }

    this.cargandoListas = true;
    
    
    this.listaService.getListasPropiasUsuario().subscribe({
      next: (response: ListasResponse) => {
        if (response.success && response.listas) {
          // Filtrar solo listas privadas (no visibles)
          this.listasPrivadas = response.listas.filter(lista => !lista.visible);
          
        } else {
          
          this.listasPrivadas = [];
        }
        this.cargandoListas = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('[MultimediaDetail] Error cargando listas privadas:', error);
        this.listasPrivadas = [];
        this.cargandoListas = false;
        this.mostrarNotificacion('Error al cargar las listas privadas', 'error');
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Alterna la visibilidad del desplegable de listas
   */
  toggleDropdownListas(): void {
    this.mostrarDropdownListas = !this.mostrarDropdownListas;
    // Cerrar dropdown al hacer clic fuera
    if (this.mostrarDropdownListas) {
      setTimeout(() => {
        document.addEventListener('click', this.cerrarDropdownAlClickFuera.bind(this), { once: true });
      }, 0);
    }
  }

  /**
   * Cierra el dropdown cuando se hace clic fuera
   */
  private cerrarDropdownAlClickFuera(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-listas')) {
      this.mostrarDropdownListas = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Añade el contenido actual a una lista específica
   */
  incluirALista(lista: any): void {
    if (!this.detalle?.id) {
      this.mostrarNotificacion('Error: No se pudo identificar el contenido', 'error');
      return;
    }

    

    this.listaService.addContenido(lista.id, this.detalle.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.mostrarNotificacion(`Contenido añadido a "${lista.nombre}"`, 'success');
          // Actualizar contador de elementos en la lista localmente
          if (lista.contenidosIds) {
            lista.contenidosIds.push(this.detalle!.id);
          } else {
            lista.contenidosIds = [this.detalle!.id];
          }
        } else {
          this.mostrarNotificacion(response.mensaje || 'Error al añadir a la lista', 'error');
        }
        this.mostrarDropdownListas = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('[MultimediaDetail] Error añadiendo a lista:', error);
        const mensaje = error?.error?.mensaje || 'Error al añadir el contenido a la lista';
        this.mostrarNotificacion(mensaje, 'error');
        this.mostrarDropdownListas = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Navega a la página de crear nueva lista
   */
  crearNuevaLista(): void {
    // Redirigir a la página de crear lista con el ID del contenido actual como parámetro
    if (this.detalle?.id) {
      this.router.navigate(['/dashboard/listas/crear'], { 
        queryParams: { contenidoId: this.detalle.id } 
      });
    } else {
      this.router.navigate(['/dashboard/listas/crear']);
    }
    this.mostrarDropdownListas = false;
  }

  /**
   * Muestra una notificación al usuario
   */
  mostrarNotificacion(mensaje: string, tipo: 'success' | 'error' | 'info'): void {
    this.notificacion = { mensaje, tipo };
    // Auto-cerrar notificación después de 4 segundos
    setTimeout(() => {
      if (this.notificacion?.mensaje === mensaje) {
        this.notificacion = null;
        this.cdr.markForCheck();
      }
    }, 4000);
  }

  /**
   * Cierra la notificación manualmente
   */
  cerrarNotificacion(): void {
    this.notificacion = null;
  }

  private revisarFavorito(): void {
    if (!this.detalle) {
      this.isFavoritoDetalle = false;
      return;
    }
    this.favoritoLoading = true;
    this.favoritesService.list()
      .pipe(finalize(() => this.favoritoLoading = false))
      .subscribe({
        next: lista => {
          this.isFavoritoDetalle = Array.isArray(lista) && lista.some(item => item.id === this.detalle?.id);
          this.cdr.markForCheck();
        },
        error: () => {
          this.isFavoritoDetalle = false;
          this.cdr.markForCheck();
        }
      });
  }

  toggleFavoritoDetalle(): void {
    if (!this.detalle) {
      return;
    }
    this.favoritoLoading = true;
    const action$ = this.isFavoritoDetalle
      ? this.favoritesService.remove(this.detalle.id)
      : this.favoritesService.add(this.detalle.id);

    action$
      .pipe(finalize(() => this.favoritoLoading = false))
      .subscribe({
        next: () => {
          this.isFavoritoDetalle = !this.isFavoritoDetalle;
          const mensaje = this.isFavoritoDetalle ? 'Contenido añadido a favoritos' : 'Contenido eliminado de favoritos';
          this.mostrarNotificacion(mensaje, 'success');
        },
        error: () => {
          this.mostrarNotificacion('No se pudo actualizar favoritos', 'error');
        }
      });
  }

  /**
   * Maneja eventos de teclado para los items de lista
   */
  onListaKeyDown(event: KeyboardEvent, lista: any): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.incluirALista(lista);
    }
  }

  /**
   * Maneja eventos de teclado para el botón de nueva lista
   */
  onNuevaListaKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.crearNuevaLista();
    }
  }
  // ---- Textos de apoyo para mostrar siempre los campos ----
  edadTexto(): string {
    // Preferimos la propiedad camelCase del backend, con fallback al nombre antiguo
    const anyDet: any = this.detalle as any;
    const e: any = (anyDet?.edadVisualizacion);
    if (typeof e === 'number' && e > 0) return `${e}`;
    return 'Para todos los públicos';
  }

  visualizacionesTexto(): string {
    const n: any = (this.detalle as any)?.nvisualizaciones;
    const num = (typeof n === 'number' && n >= 0) ? n : 0;
    try { return num.toLocaleString(); } catch { return String(num); }
  }

  duracionTexto(): string {
    const s = this.duracion();
    if (s === null) return 'No indicada';
    const total = Math.round(s);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const sec = total % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
    return `${m}:${sec.toString().padStart(2,'0')}`;
  }

  fechaDisponibleTexto(): string {
    const anyDet: any = this.detalle as any;
    const d: any = (anyDet?.fechaDisponibleHasta ?? anyDet?.fechadisponiblehasta);
    if (!d) return 'Sin fecha de caducidad';
    return this.formatFecha(d);
  }

  // === Header (usuario y navegación) ===
  loadUserData(): void {
    try {
      const userStr = sessionStorage.getItem('user');
      if (userStr) {
        const u = JSON.parse(userStr);
        this.userName = u?.nombre || u?.username || 'Usuario';
        this.userInitial = String(this.userName || 'U').charAt(0).toUpperCase();
      }
      const cls = sessionStorage.getItem('currentUserClass');
      this.isGestor = cls === 'Gestor';
    } catch {
      this.userName = 'Usuario';
      this.userInitial = 'U';
      this.isGestor = false;
    }
  }

  getAvatarClasses(): string {
    return this.isGestor ? 'user-avatar gestor' : 'user-avatar visualizador';
  }

  toggleUserMenu(): void { this.showUserMenu = !this.showUserMenu; }
  onUserProfileKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); this.toggleUserMenu(); }
    if (event.key === 'Escape' && this.showUserMenu) { event.preventDefault(); this.showUserMenu = false; }
  }

  irAListasPublicas(): void {
    this.router.navigate(['/dashboard'], { queryParams: { listas: 'publicas' } });
  }
  irAMisListasPrivadas(): void {
    this.router.navigate(['/dashboard'], { queryParams: { listas: 'privadas' } });
  }

  logout(): void {
    // Llamar al servicio de logout
    this.userService.logout().subscribe({
      next: () => {
        try {
          // Ya no necesitamos eliminar el token, el backend invalida la cookie
          sessionStorage.removeItem('user');
          sessionStorage.removeItem('currentUserClass');
          sessionStorage.removeItem('email');
        } catch {}
        this.multimedia.clearCache();
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Error al cerrar sesión:', err);
        alert('Error al cerrar sesión');
      }
    });
  }
}
