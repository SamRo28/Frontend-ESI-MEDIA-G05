import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { forkJoin, of } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
import { ValoracionService } from '../services/valoracion.service';
import { ContentFilterComponent } from '../shared/content-filter/content-filter.component';

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
  imports: [CommonModule, FormsModule, RouterLink, ContentFilterComponent],
  templateUrl: './gestor-contenidos.component.html',
  styleUrl: './gestor-contenidos.component.css'
})
export class GestorContenidosComponent implements OnInit {
  loading = false;
  readonly vipToggleId = `vip-toggle-${Math.random().toString(36).slice(2, 7)}`;
  readonly estadoToggleId = `estado-toggle-${Math.random().toString(36).slice(2, 7)}`;
  errorMessage = '';
  contenidos: ContenidoResumenGestor[] = [];
  // Indicador para evitar flicker: mientras se aplican filtros (enriquecimiento/consulta de detalle), mostrar overlay
  applyingFilters = false;

  // Estado para el modal de detalle
  mostrarDetalle = false;
  detalleLoading = false;
  detalleError = '';
  detalleSeleccionado: ContenidoDetalleGestor | null = null;

  // Estadísticas modal
  mostrarEstadisticas = false;
  estadisticasLoading = false;
  estadisticasError = '';
  estadisticasData: { id?: string; title?: string; caratula?: string | null; nvisualizaciones?: number; averageRating?: number | null; ratingsCount?: number; daysRemaining?: number | string } | null = null;

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
  showDeleteConfirmation = false;
  deletingContent: ContenidoResumenGestor | null = null;
  showSaveConfirmation = false;
  gestorTipoContenido: 'AUDIO' | 'VIDEO' | null = null;

  // Filtros desde el componente compartido
  currentTagFilters: string[] = [];
  currentFiltersObject: any = null;

  constructor(
    private readonly http: HttpClient,
    private readonly cdr: ChangeDetectorRef,
    private readonly valoracionSvc: ValoracionService
  ) {}

  ngOnInit(): void {
    console.log('[GestorContenidos] ngOnInit');
    // Cargar primero la info del gestor (tipo de contenido) para que el componente de filtros
    // reciba el `contentType` correcto desde el primer render.
    this.cargarInfoGestor();
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

    // Intentar obtener token localmente como fallback en caso de fallo (si el interceptor no lo está adjuntando)
    const token = this.getStoredToken();
    if (!token) console.warn('[GestorContenidos] No se encontró token en sessionStorage/localStorage (fallback)');

    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    this.http
      .get<{ content: ContenidoResumenGestor[] }>(`${environment.apiUrl}/gestor/contenidos?${params.toString()}`, { headers })
      .subscribe({
        next: (response) => {
          console.log('[GestorContenidos] respuesta OK', response);
          const raw = response.content || [];

          // Normalizar cada item para asegurar campos usados por el filtrado
          const normalized = raw.map((it: any) => this.normalizeContenidoResumen(it));
          console.debug('[GestorContenidos] primer item normalizado:', normalized[0]);

          // Si se indica un modo especial que sustituye la lista, devolverlo inmediatamente
          if (this.handleSpecialModeEarlyReturn()) {
            this.loading = false;
            this.cdr.detectChanges();
            return;
          }

          // Si no hay filtros activos, asignar la lista normalizada directamente
          if (this.isFiltersEmpty()) {
            this.contenidos = normalized as ContenidoResumenGestor[];
            this.loading = false;
            this.cdr.detectChanges();
            return;
          }

          // Si hay filtros, evitar asignar la lista completa hasta aplicar filtrado/enriquecimiento
          this.applyingFilters = true;
          this.cdr.detectChanges();

          // Determinar si necesitamos detalles para aplicar los filtros correctamente
          const f = this.currentFiltersObject;
          const needTags = Array.isArray(f?.tags) && f.tags.length > 0;
          const needEdad = true; // siempre requerimos edad para coherencia
          const needRes = Array.isArray(f?.resoluciones) && f.resoluciones.length > 0;

          const itemsWithoutRequired = normalized.filter((it: any) => {
            if (needTags && !Array.isArray(it.tags)) return true;
            if (needEdad && typeof (it as any).edadVisualizacion !== 'number') return true;
            if (needRes && typeof (it as any).resolucion !== 'string') return true;
            return false;
          });

          if (itemsWithoutRequired.length > 0) {
            const tokenForDetails = this.getStoredToken();
            const headersForDetails = tokenForDetails ? new HttpHeaders({ Authorization: `Bearer ${tokenForDetails}` }) : undefined;
            const calls = itemsWithoutRequired.map(i => this.http.get<any>(`${environment.apiUrl}/multimedia/${i.id}`, { headers: headersForDetails }).pipe(timeout(10000), catchError(err => of(null))));
            forkJoin(calls).subscribe({
              next: (details) => {
                // aplicar detalles sobre la copia normalizada
                this.applyDetailsToItems(details, normalized as any);
                // aplicar filtros y asignar el resultado visible
                this.contenidos = this.applyFilteringCombined(normalized as any) as ContenidoResumenGestor[];
                this.applyingFilters = false;
                this.loading = false;
                this.cdr.detectChanges();
              },
              error: (err) => {
                // Si fallan las peticiones de detalle, aplicar filtrado con lo que tenemos
                this.contenidos = this.applyFilteringCombined(normalized as any) as ContenidoResumenGestor[];
                this.applyingFilters = false;
                this.loading = false;
                this.cdr.detectChanges();
              }
            });
          } else {
            // No se necesitan detalles: filtrar directamente y asignar
            this.contenidos = this.applyFilteringCombined(normalized as any) as ContenidoResumenGestor[];
            this.applyingFilters = false;
            this.loading = false;
            this.cdr.detectChanges();
          }
        },
        error: (error) => {
          console.error('[GestorContenidos] error HTTP', error);
          this.errorMessage = 'No se han podido cargar los contenidos en este momento.';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  /**
   * Intenta leer el token del sessionStorage o de localStorage como fallback.
   */
  private getStoredToken(): string | null {
    try {
      const s = sessionStorage.getItem('token');
      if (s) return s;
    } catch (e) {
      // ignore
    }
    try {
      const l1 = localStorage.getItem('authToken') || localStorage.getItem('userToken') || localStorage.getItem('currentUserToken');
      if (l1) return l1;
    } catch (e) {
      // ignore
    }
    return null;
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
      .get<ContenidoDetalleGestor>(`${environment.apiUrl}/multimedia/${contenido.id}`, { headers: this.getStoredToken() ? new HttpHeaders({ Authorization: `Bearer ${this.getStoredToken()}` }) : undefined })
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
    this.showDeleteConfirmation = false;
    this.deletingContent = null;
    this.showSaveConfirmation = false;
    this.cdr.detectChanges();
  }

  private cargarInfoGestor(): void {
    try {
      const userJson = sessionStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        const tipo = user.tipocontenidovideooaudio?.toUpperCase();
        if (tipo === 'AUDIO' || tipo === 'VIDEO') {
          this.gestorTipoContenido = tipo;
        }
      }
    } catch (e) {
      console.error('Error al cargar la información del gestor desde sessionStorage', e);
    }
  }

  // --- INICIO: Métodos de edición restaurados y ajustados ---

  // Este método llama a verDetalle con el modo edición activado.
  editarDesdeLista(contenido: ContenidoResumenGestor): void {
    console.log('[GestorContenidos] editarDesdeLista click', contenido);

    // Validación de permisos por tipo de contenido
    if (this.gestorTipoContenido && this.gestorTipoContenido !== contenido.tipo) {
      this.errorMessage = 'No tienes permisos para editar este tipo de contenido.';
      // Ocultar el mensaje después de 5 segundos
      setTimeout(() => {
        this.errorMessage = '';
        this.cdr.detectChanges();
      }, 5000);
      return;
    }

    this.verDetalle(contenido, true);
  }

  /**
   * Abrir modal de estadísticas para un contenido concreto.
   * Obtiene detalle (para nvisualizaciones y fechaDisponibleHasta) y promedio de valoraciones.
   */
  verEstadisticas(contenido: ContenidoResumenGestor): void {
    this.mostrarEstadisticas = true;
    this.estadisticasLoading = true;
    this.estadisticasError = '';
    this.estadisticasData = null;
    this.cdr.detectChanges();

    const detalle$ = this.http.get<any>(`${environment.apiUrl}/multimedia/${contenido.id}`, { headers: this.getStoredToken() ? new HttpHeaders({ Authorization: `Bearer ${this.getStoredToken()}` }) : undefined }).pipe(
      timeout(15000),
      catchError(err => {
        console.error('[GestorContenidos] detalle error', err);
        return of(null);
      })
    );

    const avg$ = this.valoracionSvc.average(contenido.id).pipe(
      timeout(15000),
      catchError(err => {
        console.error('[GestorContenidos] average error', err);
        return of(null);
      })
    );

    forkJoin([detalle$, avg$]).subscribe({
      next: ([detalle, avg]) => {
        const nvisualizaciones = typeof detalle?.nvisualizaciones === 'number' ? detalle.nvisualizaciones : (detalle?.nvisualizaciones ?? undefined);
        const fechaHasta = detalle?.fechaDisponibleHasta ?? detalle?.fechadisponiblehasta ?? null;

        let daysRemaining: number | string = '-';
        if (fechaHasta) {
          const now = new Date();
          const until = new Date(fechaHasta);
          const diffMs = until.getTime() - now.getTime();
          daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          if (daysRemaining < 0) daysRemaining = 0;
        }

        this.estadisticasData = {
          id: detalle?.id,
          title: detalle?.titulo,
          caratula: detalle?.caratula ?? null,
          nvisualizaciones: nvisualizaciones,
          averageRating: avg?.averageRating ?? null,
          ratingsCount: avg?.ratingsCount ?? 0,
          daysRemaining: fechaHasta ? daysRemaining : '-'
        };

        this.estadisticasLoading = false;
       this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[GestorContenidos] forkJoin error al cargar estadísticas', err);
        this.estadisticasError = 'No se han podido cargar las estadísticas.';
        this.estadisticasLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  abrirDetalleDesdeEstadisticas(): void {
    if (!this.estadisticasData?.id) return;
    // Cerramos el modal de estadísticas y abrimos el detalle reutilizando verDetalle
    const resumen = {
      id: this.estadisticasData.id,
      titulo: this.estadisticasData.title ?? '',
      tipo: 'VIDEO' as 'VIDEO' | 'AUDIO',
      vip: false
    } as ContenidoResumenGestor;

    this.cerrarEstadisticas();
    this.verDetalle(resumen, false);
  }

  /**
   * Devuelve la clase para la pill de días según el valor recibido (colores).
   * Acepta number | string | undefined | null y evita comparaciones directas en la plantilla.
   */
  daysClass(days: number | string | undefined | null): string {
    if (days == null) return 'bad';
    if (days === '-' || days === '—') return 'bad';
    const n = typeof days === 'number' ? days : Number(days);
    if (Number.isNaN(n)) return 'bad';
    if (n >= 7) return 'ok';
    if (n > 0) return 'warn';
    return 'bad';
  }

  /** Devuelve la clase para el pill de valoración promedio (colores) */
  ratingClass(value: number | null | undefined): string {
    if (value == null) return 'neutral';
    const n = Number(value);
    if (Number.isNaN(n)) return 'neutral';
    if (n < 2.0) return 'low';
    if (n < 3.5) return 'mid';
    return 'high';
  }

  cerrarEstadisticas(): void {
    this.mostrarEstadisticas = false;
    this.estadisticasData = null;
    this.estadisticasError = '';
    this.estadisticasLoading = false;
    this.cdr.detectChanges();
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
    this.allTags = Array.from(tagSet).sort((a, b) => a.localeCompare(b));
    this.cdr.detectChanges();
  }

  guardarCambios(): void {
    if (!this.detalleSeleccionado || this.saving) {
      return;
    }

    // En lugar de confirm(), mostramos la vista de confirmación
    this.showSaveConfirmation = true;
    this.cdr.detectChanges();
  }

  /**
   * Procede con el guardado después de la confirmación del usuario.
   */
  proceedWithSave(): void {
    // Añadimos una guarda para asegurar a TypeScript que el objeto no es nulo.
    if (!this.detalleSeleccionado) {
      return;
    }

    this.saving = true;
    this.showSaveConfirmation = false;
    this.saveError = '';
    this.saveSuccess = '';

    // Si hay una nueva carátula, la convertimos a base64 primero
    if (this.newCoverFile) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        this.sendUpdatePayload(base64String);
      };
      reader.onerror = () => {
        this.saveError = 'Error al procesar la nueva carátula.';
        this.saving = false;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(this.newCoverFile);
    } else {
      // Si no hay nueva carátula, enviamos la actualización con la carátula existente
      this.sendUpdatePayload(this.detalleSeleccionado.caratula ?? null);
    }
  }

  private sendUpdatePayload(caratulaPayload: string | null): void {
    if (!this.detalleSeleccionado) return;

    // --- INICIO: Validación en cliente (como propusiste) ---
    if (!this.editForm.titulo || this.editForm.titulo.trim().length < 2) {
      this.saveError = 'El título debe tener al menos 2 caracteres.';
      this.saving = false;
      this.cdr.detectChanges();
      return;
    }
    if (!this.editForm.tags || this.editForm.tags.length === 0) {
      this.saveError = 'Debes seleccionar al menos un tag.';
      this.saving = false;
      this.cdr.detectChanges();
      return;
    }
    // --- FIN: Validación en cliente ---

    const descripcionTrim = this.editForm.descripcion?.trim() ?? null;

    const payload: any = {
      titulo: this.editForm.titulo.trim(),
      // Si la descripción queda vacía, mandamos null para que pase la validación del backend
      descripcion: descripcionTrim === '' ? null : descripcionTrim,
      tags: this.editForm.tags,
      vip: this.editForm.vip,
      estado: this.editForm.estado,
      edadVisualizacion: this.editForm.edadVisualizacion,
      fechaDisponibleHasta: this.editForm.fechaDisponibleHasta ? new Date(this.editForm.fechaDisponibleHasta) : null,
      caratula: caratulaPayload
    };

    this.http
      .put<ContenidoDetalleGestor>(`${environment.apiUrl}/gestor/contenidos/${this.detalleSeleccionado.id}`, payload)
      .subscribe({
        next: () => {
          this.saveSuccess = 'Contenido actualizado correctamente.';
          this.saving = false;
          this.cargarContenidos();
          this.cerrarDetalle();
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

    // Validación de permisos por tipo de contenido
    if (this.gestorTipoContenido && this.gestorTipoContenido !== contenido.tipo) {
      this.errorMessage = 'No tienes permisos para eliminar este tipo de contenido.';
      // Ocultar el mensaje después de 5 segundos
      setTimeout(() => {
        this.errorMessage = '';
        this.cdr.detectChanges();
      }, 5000);
      return;
    }

    // Mostramos el modal de confirmación en lugar del confirm() del navegador
    this.deletingContent = contenido;
    this.showDeleteConfirmation = true;
    this.cdr.detectChanges();
  }

  /**
   * Procede con la eliminación después de la confirmación del usuario.
   */
  proceedWithDelete(): void {
    if (!this.deletingContent) return;

    const contenido = this.deletingContent;

    this.showDeleteConfirmation = false;
    this.deletingContent = null;

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

  // --- INTEGRACIÓN: Handlers para el componente de filtro compartido ---
  onFiltersApplied(selectedTags: string[]): void {
    this.currentTagFilters = Array.isArray(selectedTags) ? [...selectedTags] : [];
    // Para evitar inconsistencias por ausencia de campos en los resúmenes,
    // recargamos la lista y dejamos que `cargarContenidos` normalice y obtenga detalles si es necesario.
    this.currentFiltersObject = { tags: this.currentTagFilters };
    if (!this.loading) this.cargarContenidos();
  }

  onFiltersChanged(filters: any): void {
    if (!filters) return;
    this.currentFiltersObject = filters;
    this.currentTagFilters = Array.isArray(filters.tags) ? [...filters.tags] : [];
    // Para consistencia (y para poder solicitar detalles si faltan), recargar contenidos.
    if (!this.loading) this.cargarContenidos();
  }

  get contentFilterType(): 'all' | 'video' | 'audio' {
    if (this.gestorTipoContenido === 'VIDEO') return 'video';
    if (this.gestorTipoContenido === 'AUDIO') return 'audio';
    return 'all';
  }

  private handleSpecialModeEarlyReturn(): boolean {
    const f = this.currentFiltersObject;
    if (!f) return false;
    if (f.specialMode === 'top-contents' || f.specialMode === 'top-rated') {
      const contents = f.specialPayload?.contents ?? [];
      if (Array.isArray(contents)) {
        // Mapear a la forma mínima esperada por el gestor
        this.contenidos = contents.map((it: any) => ({
          id: it.id ?? it._id ?? it.idContenido ?? String(Math.random()),
          titulo: it.titulo ?? it.title ?? it.nombre ?? '',
          tipo: (it.tipo || it.type || 'VIDEO').toString().toUpperCase() === 'AUDIO' ? 'AUDIO' : 'VIDEO',
          vip: !!it.vip,
          resolucion: it.resolucion ?? it.resolution ?? null
        } as ContenidoResumenGestor));
        this.loading = false;
        this.cdr.detectChanges();
        return true;
      }
    }
    return false;
  }

  private isFiltersEmpty(): boolean {
    const tagsEmpty = !Array.isArray(this.currentTagFilters) || this.currentTagFilters.length === 0;
    if (!this.currentFiltersObject) return tagsEmpty;
    const obj = this.currentFiltersObject;
    const objEmpty = (!Array.isArray(obj.tags) || obj.tags.length === 0) &&
                     (!obj.suscripcion || obj.suscripcion === 'ANY') &&
                     (!obj.edad) &&
                     (!Array.isArray(obj.resoluciones) || obj.resoluciones.length === 0);
    return tagsEmpty && objEmpty;
  }

  private applyFilteringCombined(items: any[]): any[] {
    const fObj = this.currentFiltersObject;
    let tags: string[] = [];
    if (fObj && Array.isArray(fObj.tags)) tags = fObj.tags;
    else if (Array.isArray(this.currentTagFilters)) tags = this.currentTagFilters;

    const filters = {
      tags: tags,
      suscripcion: fObj ? (fObj.suscripcion || 'ANY') : 'ANY',
      edad: fObj ? fObj.edad : null,
      resoluciones: fObj && Array.isArray(fObj.resoluciones) ? fObj.resoluciones : [],
      specialMode: fObj ? fObj.specialMode : undefined,
      specialPayload: fObj ? fObj.specialPayload : undefined
    };

    const noFilters = filters.tags.length === 0 && filters.suscripcion === 'ANY' && !filters.edad && filters.resoluciones.length === 0;
    if (noFilters) return items;

    return items.filter(item => this.matchesAllFilters(item, filters));
  }

  private matchesAllFilters(item: any, filters: any): boolean {
    if (filters?.specialMode === 'top-tags') {
      return this.matchesTags(item, filters.tags, filters);
    }
    return this.matchesTags(item, filters.tags, filters) &&
           this.matchesSuscripcion(item, filters.suscripcion) &&
           this.matchesEdad(item, filters.edad) &&
           this.matchesResolucion(item, filters.resoluciones);
  }

  private matchesTags(item: any, tags: string[], _filters?: any): boolean {
    if (!Array.isArray(tags) || tags.length === 0) return true;
    const itemTags = item.tags || (item as any).tag_list || (item as any).tags_list;
    if (!Array.isArray(itemTags)) return false;
    return tags.every((tag: string) => itemTags.includes(tag));
  }

  private matchesSuscripcion(item: any, suscripcion: string): boolean {
    if (suscripcion === 'ANY') return true;
    if (suscripcion === 'VIP') return item.vip === true;
    if (suscripcion === 'STANDARD') return item.vip === false;
    return true;
  }

  private matchesEdad(item: any, edad: string | null): boolean {
    if (!edad) return true;
    let itemEdad: any = undefined;
    if (typeof (item as any).edadVisualizacion === 'number') itemEdad = (item as any).edadVisualizacion;
    else if (typeof (item as any).edadvisualizacion === 'number') itemEdad = (item as any).edadvisualizacion;
    else if (typeof (item as any).edad === 'number') itemEdad = (item as any).edad;
    else if (typeof (item as any).edadVisualizacion === 'string') {
      const n = parseInt((item as any).edadVisualizacion, 10);
      if (!Number.isNaN(n)) itemEdad = n;
    } else if (typeof (item as any).edadvisualizacion === 'string') {
      const s = (item as any).edadvisualizacion.trim();
      if (s.toUpperCase() === 'TP') itemEdad = 0;
      else {
        const n = parseInt(s, 10);
        if (!Number.isNaN(n)) itemEdad = n;
      }
    } else if (typeof (item as any).edad === 'string') {
      const s = (item as any).edad.trim();
      if (s.toUpperCase() === 'TP') itemEdad = 0;
      else {
        const n = parseInt(s, 10);
        if (!Number.isNaN(n)) itemEdad = n;
      }
    }

    if (typeof itemEdad !== 'number') return false;
    if (edad === 'TP') return itemEdad === 0;
    if (edad === '18') return itemEdad >= 18;
    return true;
  }

  private matchesResolucion(item: any, resoluciones: string[]): boolean {
    if (!resoluciones || resoluciones.length === 0) return true;
    // Si hay filtros de resolución, solo deben pasar los VIDEOS.
    const tipoRaw = (item as any).tipo ?? (item as any).type ?? '';
    const tipoUp = String(tipoRaw).toUpperCase();
    if (tipoUp && tipoUp !== 'VIDEO') return false;
    let itemResolucion = (item as any).resolucion ?? (item as any).resolution ?? (item as any).resolucion_video;
    if (itemResolucion == null) return false;
    if (typeof itemResolucion !== 'string') itemResolucion = String(itemResolucion);
    const norm = this.normalizeResolutionRaw(itemResolucion);
    const toCompare = norm ?? itemResolucion.trim();
    return resoluciones.includes(toCompare);
  }

  private applyDetailsToItems(details: any[], items: any[]): void {
    for (const d of details) {
      if (!d) continue;
      const match = items.find(i => i.id === d.id || i.id === d._id || i.id === d.idContenido);
      if (!match) continue;

      // Aplicar tags
      const tagsFromDetail = this.extractTagsFromDetail(d);
      if (Array.isArray(tagsFromDetail)) {
        match.tags = tagsFromDetail;
      }

      // Edad
      const edadFromDetail = this.extractEdadFromDetail(d);
      if (typeof edadFromDetail === 'number') {
        match.edadVisualizacion = edadFromDetail;
        match.edadvisualizacion = edadFromDetail;
      }

      // Resolución
      const resolFromDetail = this.extractResolucionFromDetail(d);
      if (resolFromDetail) {
        match.resolucion = resolFromDetail;
      }
    }
  }

  private extractTagsFromDetail(d: any): string[] | undefined {
    if (Array.isArray(d.tags)) return d.tags;
    if (Array.isArray(d.tag_list)) return d.tag_list;
    if (Array.isArray(d.tags_list)) return d.tags_list;
    if (typeof d.tags === 'string') return d.tags.split(',').map((s: string) => s.trim()).filter(Boolean);
    return undefined;
  }

  private extractEdadFromDetail(d: any): number | undefined {
    // Aceptar números o cadenas como 'TP' / '0' / '18'
    if (typeof d.edadvisualizacion === 'number') return d.edadvisualizacion;
    if (typeof d.edad === 'number') return d.edad;
    if (typeof d.edadVisualizacion === 'number') return d.edadVisualizacion;
    if (typeof d.edadvisualizacion === 'string') {
      const s = d.edadvisualizacion.trim();
      if (s.toUpperCase() === 'TP') return 0;
      const n = parseInt(s, 10);
      if (!Number.isNaN(n)) return n;
    }
    if (typeof d.edad === 'string') {
      const s = d.edad.trim();
      if (s.toUpperCase() === 'TP') return 0;
      const n = parseInt(s, 10);
      if (!Number.isNaN(n)) return n;
    }
    if (typeof d.edadVisualizacion === 'string') {
      const s = d.edadVisualizacion.trim();
      if (s.toUpperCase() === 'TP') return 0;
      const n = parseInt(s, 10);
      if (!Number.isNaN(n)) return n;
    }
    return undefined;
  }

  private extractResolucionFromDetail(d: any): string | undefined {
    const raw = (d.resolucion ?? d.resolution ?? d.resolucion_video);
    if (typeof raw === 'string') return this.normalizeResolutionRaw(raw);
    if (typeof raw === 'number') return this.normalizeResolutionRaw(String(raw));
    return undefined;
  }

  /** Normaliza un objeto de resumen de contenido recibido del backend */
  private normalizeContenidoResumen(raw: any): ContenidoResumenGestor {
    const id = raw.id ?? raw._id ?? raw.idContenido ?? String(Math.random());
    const titulo = raw.titulo ?? raw.title ?? raw.nombre ?? raw.name ?? '';
    const tipoRaw = (raw.tipo ?? raw.type ?? raw.tipoContenido ?? 'VIDEO').toString();
    const tipo = tipoRaw.toUpperCase().startsWith('A') ? 'AUDIO' : 'VIDEO';
    const vip = raw.vip === true || raw.esVip === true || raw.vip === 'true' || false;

    // Extraer tags en múltiples formatos
    let tags: string[] = [];
    if (Array.isArray(raw.tags)) tags = raw.tags;
    else if (Array.isArray(raw.tag_list)) tags = raw.tag_list;
    else if (Array.isArray(raw.tags_list)) tags = raw.tags_list;
    else if (typeof raw.tags === 'string') tags = raw.tags.split(',').map((s: string) => s.trim()).filter(Boolean);
    else if (typeof raw.tag === 'string') tags = raw.tag.split(',').map((s: string) => s.trim()).filter(Boolean);

    // Edad de visualización
    let edad: number | undefined = undefined;
    if (typeof raw.edadvisualizacion === 'number') edad = raw.edadvisualizacion;
    else if (typeof raw.edadVisualizacion === 'number') edad = raw.edadVisualizacion;
    else if (typeof raw.edad === 'number') edad = raw.edad;
    // Aceptar también cadenas 'TP' o '0'/'18'
    else if (typeof raw.edadvisualizacion === 'string') {
      const s = raw.edadvisualizacion.trim();
      if (s.toUpperCase() === 'TP') edad = 0;
      else {
        const n = parseInt(s, 10);
        if (!Number.isNaN(n)) edad = n;
      }
    } else if (typeof raw.edadVisualizacion === 'string') {
      const s = raw.edadVisualizacion.trim();
      if (s.toUpperCase() === 'TP') edad = 0;
      else {
        const n = parseInt(s, 10);
        if (!Number.isNaN(n)) edad = n;
      }
    } else if (typeof raw.edad === 'string') {
      const s = raw.edad.trim();
      if (s.toUpperCase() === 'TP') edad = 0;
      else {
        const n = parseInt(s, 10);
        if (!Number.isNaN(n)) edad = n;
      }
    }

    // Resolución (normalizar a formatos conocidos: 720p/1080p/2160p cuando sea posible)
    let resolucion: string | null = null;
    const rawRes = raw.resolucion ?? raw.resolution ?? raw.resolucion_video ?? null;
    if (rawRes != null) {
      const norm = this.normalizeResolutionRaw(rawRes);
      resolucion = norm ?? null;
    }

    return {
      id,
      titulo,
      tipo,
      vip: !!vip,
      resolucion: resolucion ?? null,
      // attach normalized tags/edad for filtering convenience
      ...(tags.length ? { tags } : {}),
      ...(typeof edad === 'number' ? { edadVisualizacion: edad } : {})
    } as any;
  }

  /** Normaliza variantes de resolución a los tokens usados por el UI: '720p','1080p','2160p' cuando es posible. */
  private normalizeResolutionRaw(raw: any): string | undefined {
    if (raw == null) return undefined;
    const s = String(raw).trim().toLowerCase();
    // numérico '1080' -> '1080p'
    const onlyDigits = s.replace(/[^0-9]/g, '');
    if (onlyDigits.length >= 3) {
      // map common heights
      if (onlyDigits === '2160' || onlyDigits === '4' || onlyDigits === '2160p') return '2160p';
      if (onlyDigits === '1080' || onlyDigits === '1080p') return '1080p';
      if (onlyDigits === '720' || onlyDigits === '720p') return '720p';
      // fallback: if it's a number like 480/360, keep as e.g. '480p'
      return `${onlyDigits}p`;
    }
    // common textual variants
    if (s.includes('4k') || s.includes('2160') || s.includes('uhd')) return '2160p';
    if (s.includes('full') && s.includes('hd')) return '1080p';
    if (s.includes('hd') && !s.includes('full')) return '720p';
    if (s.includes('720')) return '720p';
    if (s.includes('1080')) return '1080p';
    if (s.includes('2160')) return '2160p';
    // unknown format, return original trimmed string to allow direct compares
    return String(raw).trim();
  }

  /**
   * Formatea la duración (en segundos) como "X min Y s".
   */
  getDuracionFormateada(segundos: number | null | undefined): string {
    const total = typeof segundos === 'number' ? segundos : 0;
    if (total <= 0) {
      return 'No indicada';
    }
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    if (mins === 0) {
      return `${secs} s`;
    }
    if (secs === 0) {
      return `${mins} min`;
    }
    return `${mins} min ${secs} s`;
  }
}
