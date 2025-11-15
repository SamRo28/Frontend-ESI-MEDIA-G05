import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

interface ContenidoResumenGestor {
  id: string;
  titulo: string;
  tipo: 'AUDIO' | 'VIDEO';
  vip: boolean;
  resolucion?: string | null;
}

interface ContenidoDetalleGestor {
  id: string;
  titulo: string;
  descripcion: string;
  tipo: 'AUDIO' | 'VIDEO';
  caratula?: any;
  vip: boolean;
  duracion: number;
  estado: boolean;
  fechaDisponibleHasta?: string | null;
  edadVisualizacion: number;
  nvisualizaciones: number;
  tags: string[];
  referenciaReproduccion: string;
  resolucion?: string | null;
}

@Component({
  selector: 'app-gestor-contenidos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './gestor-contenidos.component.html',
  styleUrl: './gestor-contenidos.component.css'
})
export class GestorContenidosComponent implements OnInit {
  loading = false;
  errorMessage = '';
  contenidos: ContenidoResumenGestor[] = [];

  // Estado para el modal de detalle
  mostrarDetalle = false;
  detalleLoading = false;
  detalleError = '';
  detalleSeleccionado: ContenidoDetalleGestor | null = null;

  // Estado de edición dentro del modal
  editMode = false;
  saving = false;
  saveSuccess = '';
  saveError = '';
  deletingId: string | null = null;
  deleteError = '';

  editForm = {
    titulo: '',
    descripcion: '',
    tagsText: '',
    vip: false,
    estado: true,
    edadVisualizacion: 0,
    fechaDisponibleHasta: ''
  };

  constructor(
    private readonly http: HttpClient,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('[GestorContenidos] ngOnInit');
    this.cargarContenidos();
  }

  cargarContenidos(): void {
    console.log('[GestorContenidos] cargarContenidos: inicio');
    this.loading = true;
    this.errorMessage = '';

    const params = new URLSearchParams({
      page: '0',
      size: '50'
    });

    this.http
      .get<{ content: ContenidoResumenGestor[] }>(`${environment.apiUrl}/gestor/contenidos?${params.toString()}`)
      .subscribe({
        next: (response) => {
          console.log('[GestorContenidos] respuesta OK', response);
          this.contenidos = response.content || [];
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('[GestorContenidos] error HTTP', error);
          this.errorMessage = 'No se han podido cargar los contenidos en este momento.';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  verDetalle(contenido: ContenidoResumenGestor): void {
    console.log('[GestorContenidos] verDetalle click', contenido);

    this.mostrarDetalle = true;
    this.detalleLoading = true;
    this.detalleError = '';
    this.detalleSeleccionado = null;
    this.cdr.detectChanges();

    this.http
      .get<ContenidoDetalleGestor>(`${environment.apiUrl}/gestor/contenidos/${contenido.id}`)
      .subscribe({
        next: (detalle) => {
          console.log('[GestorContenidos] detalle OK', detalle);
          this.detalleSeleccionado = detalle;
          this.detalleLoading = false;
          this.initEditFormFromDetalle(detalle);
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('[GestorContenidos] error detalle', error);
          this.detalleError = 'No se ha podido cargar el detalle del contenido.';
          this.detalleLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  cerrarDetalle(): void {
    this.mostrarDetalle = false;
    this.detalleSeleccionado = null;
    this.detalleError = '';
    this.detalleLoading = false;
    this.editMode = false;
    this.saveError = '';
    this.saveSuccess = '';
    this.cdr.detectChanges();
  }

  toggleEditMode(): void {
    console.log('[GestorContenidos] toggleEditMode', this.editMode);
    this.editMode = !this.editMode;
    this.saveError = '';
    this.saveSuccess = '';
    this.cdr.detectChanges();
  }

  private initEditFormFromDetalle(det: ContenidoDetalleGestor): void {
    this.editForm = {
      titulo: det.titulo,
      descripcion: det.descripcion,
      tagsText: det.tags ? det.tags.join(', ') : '',
      vip: det.vip,
      estado: det.estado,
      edadVisualizacion: det.edadVisualizacion,
      fechaDisponibleHasta: det.fechaDisponibleHasta
        ? det.fechaDisponibleHasta.substring(0, 10)
        : ''
    };
  }

  guardarCambios(): void {
    if (!this.detalleSeleccionado || this.saving) {
      return;
    }

    const confirmar = confirm('¿Deseas guardar los cambios del contenido?');
    if (!confirmar) {
      return;
    }

    this.saving = true;
    this.saveError = '';
    this.saveSuccess = '';

    const tags = this.editForm.tagsText
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const payload: any = {
      titulo: this.editForm.titulo.trim(),
      descripcion: this.editForm.descripcion?.trim() ?? '',
      tags,
      vip: this.editForm.vip,
      estado: this.editForm.estado,
      edadVisualizacion: this.editForm.edadVisualizacion,
      fechaDisponibleHasta: this.editForm.fechaDisponibleHasta
        ? new Date(this.editForm.fechaDisponibleHasta)
        : null,
      caratula: this.detalleSeleccionado.caratula ?? null
    };

    this.http
      .put<ContenidoDetalleGestor>(
        `${environment.apiUrl}/gestor/contenidos/${this.detalleSeleccionado.id}`,
        payload
      )
      .subscribe({
        next: (actualizado) => {
          console.log('[GestorContenidos] contenido actualizado', actualizado);
          this.detalleSeleccionado = actualizado;
          this.initEditFormFromDetalle(actualizado);

          // Actualizar resumen en la lista principal
          this.contenidos = this.contenidos.map(c =>
            c.id === actualizado.id
              ? {
                  id: actualizado.id,
                  titulo: actualizado.titulo,
                  tipo: actualizado.tipo,
                  vip: actualizado.vip,
                  resolucion: actualizado.resolucion ?? null
                }
              : c
          );

          this.saveSuccess = 'Contenido actualizado correctamente.';
          this.saving = false;
          this.editMode = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('[GestorContenidos] error al actualizar contenido', error);
          this.saveError = 'No se han podido guardar los cambios. Inténtalo de nuevo más tarde.';
          this.saving = false;
          this.cdr.detectChanges();
        }
      });
  }

  editarDesdeLista(contenido: ContenidoResumenGestor): void {
    console.log('[GestorContenidos] editarDesdeLista click', contenido);
    this.saveError = '';
    this.saveSuccess = '';
    this.editMode = true;
    this.verDetalle(contenido);
  }

  eliminarDesdeLista(contenido: ContenidoResumenGestor): void {
    console.log('[GestorContenidos] eliminarDesdeLista click', contenido);

    const confirmar = confirm('¿Seguro que deseas eliminar este contenido? Esta acción no se puede deshacer.');
    if (!confirmar) {
      return;
    }

    this.deletingId = contenido.id;
    this.deleteError = '';
    this.cdr.detectChanges();

    this.http
      .delete<void>(`${environment.apiUrl}/gestor/contenidos/${contenido.id}`)
      .subscribe({
        next: () => {
          this.contenidos = this.contenidos.filter(c => c.id !== contenido.id);

          if (this.detalleSeleccionado && this.detalleSeleccionado.id === contenido.id) {
            this.cerrarDetalle();
          }

          this.deletingId = null;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('[GestorContenidos] error al eliminar contenido', error);
          this.deleteError = 'No se ha podido eliminar el contenido. Comprueba que tienes permisos.';
          this.deletingId = null;
          this.cdr.detectChanges();
        }
      });
  }
}

