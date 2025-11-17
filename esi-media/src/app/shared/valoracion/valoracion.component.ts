import { Component, Input, Output, EventEmitter, inject, OnInit, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ValoracionService } from '../../services/valoracion.service';

@Component({
  selector: 'app-valoracion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './valoracion.component.html',
  styleUrls: ['./valoracion.component.css']
})
export class ValoracionComponent {
  private valoracionSvc = inject(ValoracionService);
  private el = inject(ElementRef);

  @Input() average: number | null = null;
  @Input() ratingsCount: number = 0;
  // instancia Valoracion: { id, visualizadorId, contenidoId, valoracionFinal }
  @Input() valoracionInstance: any | null = null;
  @Input() contenidoId?: string;

  @Output() updated = new EventEmitter<void>();

  // estado local
  submitting = false;
  error: string | null = null;
  selectedValue: number | null = null;
  showRatingInput = false;

  ngOnInit(): void {
    try {
      const host = this.el?.nativeElement as HTMLElement | null;
      if (host && host.closest && host.closest('.col-lateral')) {
        return;
      }
    } catch {}
  }

  starPercent(): number {
    if (this.average == null) return 0;
    return Math.max(0, Math.min(100, (this.average / 5) * 100));
  }

  openRating(): void {
    this.error = null;
    // Si no tenemos instancia, crear o recuperar la existente vía backend
      if (!this.valoracionInstance) {
        if (!this.contenidoId) {
          this.error = 'Contenido no especificado';
          return;
        }
        const contenidoId = this.contenidoId as string;
        this.submitting = true;
        // Primero comprobamos si existe una instancia/permiso para valorar (backend crea la instancia al reproducir)
        this.valoracionSvc.showRating(contenidoId).subscribe({
          next: (dto) => {
            // dto === null puede indicar 204 (instancia existe pero sin rating)
            if (dto == null) {
              // Instancia disponible sin valoracion -> solicitar ID al backend
              this.valoracionSvc.createOrGet(contenidoId).subscribe({ next: (v) => {
                this.valoracionInstance = v;
                this.submitting = false;
                this.showRatingInput = true;
                if (this.selectedValue == null) this.selectedValue = 3.5;
              }, error: (err2) => {
                this.submitting = false;
                this.error = err2?.error?.mensaje || 'No se pudo preparar la valoración';
              } });
              return;
            }
            if (dto?.myRating != null) {
              // Ya valoró: mostramos su valoración (no permitir valorar de nuevo)
              this.valoracionInstance = { id: null, valoracionFinal: dto.myRating };
              this.submitting = false;
            } else {
              // Instancia existe pero sin valoración -> pedir ID
              this.valoracionSvc.createOrGet(contenidoId).subscribe({ next: (v) => {
                this.valoracionInstance = v;
                this.submitting = false;
                this.showRatingInput = true;
                if (this.selectedValue == null) this.selectedValue = 3.5;
              }, error: (err2) => {
                this.submitting = false;
                this.error = err2?.error?.mensaje || 'No se pudo preparar la valoración';
              } });
            }
          },
          error: (err) => {
            this.submitting = false;
            if (err?.status === 404) {
              // No existe instancia -> no ha reproducido aún
            try { window.alert(`Aun no has reproducido este contenido.`); } catch {
            this.error = `Aun no has reproducido este contenido.`;
            }
              this.error = 'Debes reproducir el contenido antes de poder valorar';
            } else {
              const status = err?.status ?? 'no-status';
              const bodyMsg = err?.error?.mensaje || err?.message || '';
              this.error = `Error ${status}: ${bodyMsg || 'No se pudo comprobar la valoración'}`;
            }
          }
        });
        return;
      }

    this.showRatingInput = true;
    if (this.selectedValue == null) this.selectedValue = 3.5;
  }

  cancelRating(): void {
    this.showRatingInput = false;
    this.selectedValue = null;
    this.error = null;
  }

  sendRating(): void {
    if (!this.valoracionInstance || !this.valoracionInstance.id) {
      this.error = 'No se encontró la instancia de valoración.';
      return;
    }
    if (this.selectedValue == null) {
      this.error = 'Selecciona una puntuación';
      return;
    }
    if (this.selectedValue < 1 || this.selectedValue > 5) {
      this.error = 'Valor fuera de rango';
      return;
    }
    this.submitting = true;
    this.error = null;
    this.valoracionSvc.valorarPorId(this.valoracionInstance.id, this.selectedValue).subscribe({
      next: () => {
        this.submitting = false;
        // Guardamos la puntuación localmente para actualizar la UI inmediatamente
        try {
          if (!this.valoracionInstance) this.valoracionInstance = {} as any;
          this.valoracionInstance.valoracionFinal = this.selectedValue;
        } catch {}
        this.showRatingInput = false;
        this.updated.emit();
      },
      error: (err) => {
        this.submitting = false;
        const status = err?.status ?? 'no-status';
        const bodyMsg = err?.error?.mensaje || err?.error || err?.message || err?.statusText || '';
        this.error = `Error ${status}: ${bodyMsg || 'Error al enviar valoración'}`;
      }
    });
  }

  // Mostrar la valoración del usuario si existe
  myRatingText(): string {
    const v = this.valoracionInstance?.valoracionFinal;
    if (v == null) return 'Sin valoración personal';
    return `${v}/5`;
  }

  showMyRating(): void {
    const v = this.valoracionInstance?.valoracionFinal;
    if (v == null) {
      try { window.alert(`Aun no has valorado este contenido.`); } catch {
        this.error = `Aun no has valorado este contenido.`;
      }
    } else {
      try { window.alert(`Mi valoración: ${v}/5`); } catch {
        this.error = `Mi valoración: ${v}/5`;
      }
    }
  }
}
