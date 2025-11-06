import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MultimediaService, ContenidoResumenDTO, PageResponse } from '../services/multimedia.service';

@Component({
  selector: 'app-multimedia-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './multimedia-list.html',
  styleUrl: './multimedia-list.css'
})
export class MultimediaListComponent implements OnInit {
  pagina = 0;
  tamano = 12;
  cargando = false;
  errores: string | null = null;
  contenido: ContenidoResumenDTO[] = [];
  totalPaginas = 0;

  constructor(private multimedia: MultimediaService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(pagina: number = this.pagina): void {
    this.cargando = true;
    this.errores = null;
    this.multimedia.listar(pagina, this.tamano).subscribe({
      next: (resp: PageResponse<ContenidoResumenDTO>) => {
        this.contenido = resp.content || [];
        this.totalPaginas = resp.totalPages ?? (this.contenido.length < this.tamano ? pagina + 1 : pagina + 2);
        this.pagina = pagina;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error cargando contenidos', err);
        this.errores = (err?.error?.mensaje) || 'No se pudo cargar el contenido';
        this.cargando = false;
      }
    });
  }

  anterior(): void {
    if (this.pagina > 0) {
      this.cargar(this.pagina - 1);
    }
  }

  siguiente(): void {
    this.cargar(this.pagina + 1);
  }
}
