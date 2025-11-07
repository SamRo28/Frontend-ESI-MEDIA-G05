import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MultimediaService, ContenidoDetalleDTO } from '../services/multimedia.service';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-multimedia-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './multimedia-detail.html',
  styleUrl: './multimedia-detail.css'
})
export class MultimediaDetailComponent implements OnInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  id!: string;
  cargando = false;
  error: string | null = null;
  detalle: ContenidoDetalleDTO | null = null;
  audioUrl: string | null = null;
  audioCargando = false;
  audioError: string | null = null;

  constructor(private route: ActivatedRoute, private multimedia: MultimediaService) {}

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id')!;
    // Evitar peticiones en SSR
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.cargar();
  }

  ngOnDestroy(): void {
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
    }
  }

  cargar(): void {
    this.cargando = true;
    this.error = null;
    this.multimedia.detalle(this.id).subscribe({
      next: (d) => {
        this.detalle = d;
        if (d.tipo === 'AUDIO') {
          this.descargarAudio();
        } else {
          this.cargando = false;
        }
      },
      error: (err) => {
        console.error('Error cargando detalle', err);
        this.error = (err?.error?.mensaje) || 'No se pudo cargar el detalle';
        this.cargando = false;
      }
    });
  }

  descargarAudio(): void {
    this.audioCargando = true;
    this.audioError = null;
    this.multimedia.descargarAudio(this.id).subscribe({
      next: (blob) => {
        this.audioUrl = URL.createObjectURL(blob);
        this.audioCargando = false;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error descargando audio', err);
        this.audioError = (err?.error?.mensaje) || 'No se pudo descargar el audio';
        this.audioCargando = false;
        this.cargando = false;
      }
    });
  }

  reintentarAudio(): void {
    if (this.detalle?.tipo === 'AUDIO') {
      this.descargarAudio();
    }
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
}
