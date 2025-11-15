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
  fechaCreacion: string;
  resolucion?: string | null;
  creadorNombre?: string | null;
  creadorApellidos?: string | null;
}

// Listas de tags predefinidas según el tipo de contenido
const AUDIO_TAGS: string[] = [
  'pop', 'jazz', 'reggaeton', 'blues', 'audiolibro', 'rock', 'clasica',
  'indie', 'metal', 'instrumental', 'rap/hip-hop', 'electronica', 'folk',
  'podcast', 'acustico'
];

const VIDEO_TAGS: string[] = [
  'cocina', 'musica', 'entretenimiento', 'arte y diseño', 'comedia',
  'programacion', 'educativo', 'deportes', 'viajes', 'documentales',
  'videojuegos', 'tutorial tecnologia', 'salud y fitness', 'noticias'
];


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

  // --- INICIO: Propiedades para edición restauradas ---
  editMode = false;
  saving = false;
  saveSuccess = '';
  saveError = '';
  editForm = {
    titulo: '',
    descripcion: '',
    tags: [] as string[], // Cambiado para manejar un array de tags
    vip: false,
    estado: true,
    edadVisualizacion: 0,
    fechaDisponibleHasta: ''
  };
  // --- FIN: Propiedades para edición restauradas ---
  deletingId: string | null = null;
  deleteError = '';
  allTags: string[] = []; // Para almacenar todos los tags de la plataforma

  // --- INICIO: Propiedades para la edición de la carátula ---
  newCoverFile: File | null = null;
  newCoverPreview: string | null = null;

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

  // Ahora acepta un parámetro opcional para controlar el modo de edición
  verDetalle(contenido: ContenidoResumenGestor, startInEditMode: boolean = false): void {
    console.log(`[GestorContenidos] Abriendo detalle para ${contenido.id}. Modo edición: ${startInEditMode}`);

    this.mostrarDetalle = true;
    this.detalleLoading = true;
    this.detalleError = '';
    this.editMode = startInEditMode; // Establece el modo de edición
    this.detalleSeleccionado = null;
    this.cdr.detectChanges();

    // Para obtener el detalle reutilizamos el endpoint general de multimedia,
    // que ya construye la referencia de reproducción y aplica validaciones.
    this.http
      .get<ContenidoDetalleGestor>(`${environment.apiUrl}/multimedia/${contenido.id}`)
      .subscribe({
        next: (detalle) => {
          console.log('[GestorContenidos] detalle OK', detalle);
          this.detalleSeleccionado = detalle;
          this.initEditFormFromDetalle(detalle); // Prepara el formulario de edición
          this.detalleLoading = false;
          // Si estamos en modo edición, cargamos todos los tags
          if (startInEditMode) {
            this.cargarTodosLosTags();
          }
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
    this.editMode = false; // Resetea el modo edición al cerrar
    this.saveError = '';
    this.saveSuccess = '';
    this.newCoverFile = null;
    this.newCoverPreview = null;
    this.cdr.detectChanges();
  }

  // --- INICIO: Métodos de edición restaurados y ajustados ---

  // Este método llama a verDetalle con el modo edición activado.
  editarDesdeLista(contenido: ContenidoResumenGestor): void {
    console.log('[GestorContenidos] editarDesdeLista click', contenido);
    this.verDetalle(contenido, true); // Llama a verDetalle en modo edición
  }

  private initEditFormFromDetalle(det: ContenidoDetalleGestor): void {
    this.editForm = {
      titulo: det.titulo,
      descripcion: det.descripcion,
      tags: det.tags ? [...det.tags] : [],
      vip: det.vip,
      estado: det.estado,
      edadVisualizacion: det.edadVisualizacion,
      fechaDisponibleHasta: det.fechaDisponibleHasta
        ? det.fechaDisponibleHasta.substring(0, 10)
        : ''
    };
  }

  private cargarTodosLosTags(): void {
    if (!this.detalleSeleccionado) {
      return;
    }

    // Seleccionamos la lista de tags predefinida según el tipo de contenido
    const predefinedTags = this.detalleSeleccionado.tipo === 'AUDIO' ? AUDIO_TAGS : VIDEO_TAGS;

    // Unimos los tags predefinidos con los que ya tiene el contenido (por si hay alguno antiguo)
    // y eliminamos duplicados para tener una lista única.
    const tagSet = new Set([...predefinedTags, ...this.editForm.tags]);
    this.allTags = Array.from(tagSet).sort();
    this.cdr.detectChanges();
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

    const payload: any = {
      titulo: this.editForm.titulo.trim(),
      descripcion: this.editForm.descripcion?.trim() ?? '',
      tags: this.editForm.tags, // Usamos directamente el array de tags
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
          this.saveSuccess = 'Contenido actualizado correctamente.';
          this.saving = false;
          this.cargarContenidos(); // Recargamos la lista para ver los cambios
          this.cerrarDetalle(); // Cerramos el modal tras guardar
        },
        error: (error) => {
          console.error('[GestorContenidos] error al actualizar contenido', error);
          this.saveError = 'No se han podido guardar los cambios. Inténtalo de nuevo más tarde.';
          this.saving = false;
          this.cdr.detectChanges();
        }
      });
  }

  // Gestiona la selección/deselección de tags
  onTagChange(tag: string, isChecked: boolean): void {
    if (isChecked) {
      this.editForm.tags.push(tag);
    } else {
      const index = this.editForm.tags.indexOf(tag);
      if (index > -1) {
        this.editForm.tags.splice(index, 1);
      }
    }
  }

  // Gestiona la selección de un nuevo archivo de carátula
  onCoverFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.newCoverFile = file;

      // Crear una URL para la vista previa
      const reader = new FileReader();
      reader.onload = () => {
        this.newCoverPreview = reader.result as string;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
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
