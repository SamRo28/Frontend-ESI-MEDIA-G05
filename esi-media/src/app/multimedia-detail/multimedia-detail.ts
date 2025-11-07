import { Component, OnDestroy, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { MultimediaService, ContenidoDetalleDTO } from '../services/multimedia.service';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-multimedia-detail',
  standalone: true,
  // Añadimos NgIf y NgFor explícitamente para entornos que requieren import directo de las directivas estructurales
  imports: [CommonModule, NgIf, NgFor],
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
  // Token para uso en query (evitar sessionStorage directo en plantilla)
  token: string = '';

  constructor(
    private route: ActivatedRoute,
    private multimedia: MultimediaService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Evitar peticiones en SSR
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    // Capturamos token una sola vez (evita acceso global en plantilla)
    try {
      this.token = sessionStorage.getItem('token') || '';
    } catch (e) {
      this.token = '';
    }
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
    if (this.detalleTimeout) {
      clearTimeout(this.detalleTimeout);
    }
    // Fallback de seguridad: si en 8s no llega respuesta, apagamos loader y mostramos error genérico
    this.detalleTimeout = setTimeout(() => {
      if (this.cargando) {
        console.warn('[MultimediaDetail] Timeout de detalle, apagando loader');
        this.cargando = false;
        if (!this.detalle && !this.error) {
          this.error = 'Tiempo de espera agotado al cargar el contenido';
        }
      }
    }, 8000);
    this.multimedia.detalle(this.id).subscribe({
      next: (d) => {
        this.detalle = d;
        // Para VIDEO: dejamos de mostrar loader general (datos recibidos) pero activamos skeleton hasta ready
        if (d.tipo === 'VIDEO') {
          this.cargando = false;
          this.playerReady = false;
          this.buffering = false;
          console.log('[MultimediaDetail] Detalle VIDEO recibido, loader off, esperando eventos del reproductor');
          this.cdr.markForCheck();
          const url = d.referenciaReproduccion || '';
          this.isYoutube = /youtube\.com\/watch\?v=|youtu\.be\//i.test(url);
          if (this.isYoutube) {
            const watchMatch = url.match(/[?&]v=([^&#]+)/);
            const shortMatch = url.match(/youtu\.be\/([^?&#]+)/);
            const id = (watchMatch && watchMatch[1]) || (shortMatch && shortMatch[1]) || null;
            this.youtubeSafeUrl = id ? this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${id}`) : null;
          } else {
            this.youtubeSafeUrl = null;
          }
        }
        // Para AUDIO mantenemos cargando sólo hasta el botón (descarga diferida), así que apagamos también
        if (d.tipo === 'AUDIO') {
          this.cargando = false;
          console.log('[MultimediaDetail] Detalle AUDIO recibido, loader off');
          this.cdr.markForCheck();
        }
        if (this.detalleTimeout) { clearTimeout(this.detalleTimeout); this.detalleTimeout = null; }
      },
      error: (err) => {
        console.error('Error cargando detalle', err);
        this.error = (err?.error?.mensaje) || 'No se pudo cargar el detalle';
        this.cargando = false;
        this.cdr.markForCheck();
        if (this.detalleTimeout) { clearTimeout(this.detalleTimeout); this.detalleTimeout = null; }
      }
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
    // Si viene como ruta relativa (empieza por '/'), anteponer dominio backend
    if (/^\//.test(base)) {
      base = 'http://localhost:8080' + base;
    }
    // Evitar duplicar protocolo si accidentalmente ya contiene http://http://
    base = base.replace(/^(https?:\/\/)+(https?:\/\/)/i, '$1');
    const sep = base.includes('?') ? '&' : '?';
    const tokenParam = this.token ? 'auth=' + encodeURIComponent(this.token) : '';
    return tokenParam ? (base + sep + tokenParam) : base;
  }

  onAudioError(ev: Event): void {
    console.error('[MultimediaDetail] Error evento <audio>', ev);
    this.audioError = 'No se pudo cargar el audio (recurso no encontrado o sin permiso)';
  }

  onAudioLoaded(ev: Event): void {
    console.log('[MultimediaDetail] Audio metadata cargada');
  }

  caratulaUrl(): string | null {
    const c = this.detalle?.caratula as any;
    if (!c) return null;
    if (typeof c === 'string') return c;
    if (typeof c === 'object') {
      if (typeof c.url === 'string') return c.url;
      if (typeof c.src === 'string') return c.src;
      if (typeof c.data === 'string') return c.data;
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
    setTimeout(() => {
      this.playerReady = true;
      this.buffering = false;
      this.cdr.markForCheck();
    }, 0);
  }
  onVideoLoaded(): void {
    // loadedmetadata: ya tenemos duración, podemos mostrar el player
    console.log('[MultimediaDetail] video loadedmetadata');
    setTimeout(() => {
      this.playerReady = true;
      this.cdr.markForCheck();
    }, 0);
  }
  onVideoCanPlay(): void {
    console.log('[MultimediaDetail] video canplay');
    setTimeout(() => {
      this.playerReady = true;
      this.buffering = false;
      this.cdr.markForCheck();
    }, 0);
  }
  onVideoWaiting(): void {
    console.log('[MultimediaDetail] video waiting');
    setTimeout(() => {
      if (this.playerReady) {
        this.buffering = true;
        this.cdr.markForCheck();
      }
    }, 0);
  }
  onVideoPlaying(): void {
    console.log('[MultimediaDetail] video playing');
    setTimeout(() => {
      this.buffering = false;
      this.cdr.markForCheck();
    }, 0);
  }
}
