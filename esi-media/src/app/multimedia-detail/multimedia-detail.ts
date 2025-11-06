import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MultimediaService, ContenidoDetalleDTO } from '../services/multimedia.service';

@Component({
  selector: 'app-multimedia-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './multimedia-detail.html',
  styleUrl: './multimedia-detail.css'
})
export class MultimediaDetailComponent implements OnInit, OnDestroy {
  id!: string;
  cargando = false;
  error: string | null = null;
  detalle: ContenidoDetalleDTO | null = null;
  audioUrl: string | null = null;

  constructor(private route: ActivatedRoute, private multimedia: MultimediaService) {}

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id')!;
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
          // Descargar el blob y crear URL temporal
          this.multimedia.descargarAudio(this.id).subscribe({
            next: (blob) => {
              this.audioUrl = URL.createObjectURL(blob);
              this.cargando = false;
            },
            error: (err) => {
              console.error('Error descargando audio', err);
              this.error = (err?.error?.mensaje) || 'No se pudo descargar el audio';
              this.cargando = false;
            }
          });
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
}
