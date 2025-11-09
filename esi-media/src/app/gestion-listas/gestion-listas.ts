import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { ListaService } from '../services/lista.service';
import { Lista } from '../model/lista';

@Component({
  selector: 'app-gestion-listas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './gestion-listas.html',
  styleUrls: ['./gestion-listas.css']
})
export class GestionListasComponent implements OnInit, OnDestroy, OnChanges {
  @Input() modo: 'gestor' | 'visualizador' = 'visualizador';
  @Input() forceReload: number = 0;

  listaForm: FormGroup;
  listas: any[] = [];
  listaEditando: any = null;
  contenidosIds: string[] = [];
  contenidosCount: number = 0;
  userId: string = '';

  mensajeError: string = '';
  mensajeExito: string = '';

  mostrandoCrear: boolean = false;
  cargando: boolean = false;
  guardando: boolean = false;

  // Suscripción para detectar navegación
  private routerSubscription: Subscription = new Subscription();

  constructor(
    private fb: FormBuilder,
    private listaService: ListaService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.listaForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: ['', [Validators.required, Validators.minLength(10)]],
      visible: [false],
      tagsInput: ['']
    });
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const userJson = sessionStorage.getItem('user');
    if (!userJson) {
      this.router.navigate(['/login']);
      return;
    }

    try {
      const user = JSON.parse(userJson);
      this.userId = user.id;
    } catch (error) {
      this.router.navigate(['/login']);
      return;
    }

    this.modo = sessionStorage.getItem('currentUserClass') === 'Gestor' ? 'gestor' : 'visualizador';
    this.userId = JSON.parse(sessionStorage.getItem('user') || '{}').id;

    if (this.modo === 'visualizador') {
      this.listaForm.patchValue({ visible: false });
      this.listaForm.get('visible')?.disable();
    }

    this.configurarRecargaAutomatica();
    this.cargarListas();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['forceReload'] && !changes['forceReload'].firstChange) {
      this.cargarListas();
    }
  }

  ngOnDestroy(): void {
    // Limpiar suscripciones para evitar memory leaks
    this.routerSubscription.unsubscribe();
  }

  /**
   * Configura la recarga automática al volver a esta vista
   */
  private configurarRecargaAutomatica(): void {
    let isInitialLoad = true;
    
    this.routerSubscription = this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        filter((event: NavigationEnd) => event.url === '/dashboard/listas')
      )
      .subscribe((event: NavigationEnd) => {
        if (!isInitialLoad) {
          this.cargarListas();
        }
        isInitialLoad = false;
      });
  }

  cargarListas(): void {
    this.limpiarMensajes();
    this.cargando = true;

    if (this.modo === 'gestor') {
      this.listaService.obtenerListasGestor().subscribe({
        next: (response) => {
          this.cargando = false;
          if (response.success && response.listas) {
            this.listas = response.listas;
          } else {
            this.listas = [];
          }
        },
        error: (err) => {
          this.cargando = false;
          this.listas = [];
          this.mostrarNotificacionError('Error al cargar listas');
        }
      });
    } else {
      this.listaService.obtenerListasUsuario(this.userId).subscribe({
        next: (response) => {
          this.cargando = false;
          if (response.success && response.listas) {
            this.listas = response.listas;
          } else {
            this.listas = [];
          }
        },
        error: (err) => {
          this.cargando = false;
          this.listas = [];
          this.mostrarNotificacionError('Error al cargar listas');
        }
      });
    }
  }

  guardarLista(): void {
    if (!this.listaEditando) {
      return;
    }

    if (this.listaForm.invalid) {
      this.listaForm.markAllAsTouched();
      return;
    }

    this.limpiarMensajes();
    this.guardando = true;

    const formValue = this.listaForm.getRawValue();
    const datos = {
      nombre: formValue.nombre.trim(),
      descripcion: formValue.descripcion.trim(),
      visible: this.modo === 'gestor' ? formValue.visible : false,
      tags: this.parseTags(formValue.tagsInput),
      userId: this.userId,
      modo: this.modo
    };

    this.listaService.editarLista(this.listaEditando.id, datos).subscribe({
      next: (response) => {
        this.guardando = false;
        if (response.success) {
          const mensaje = response.mensaje || 'Lista actualizada correctamente';
          this.mostrarNotificacionExito(mensaje);
          this.resetearFormulario();
          this.cargarListas();
        }
      },
      error: (err) => {
        this.guardando = false;
        this.manejarError(err);
      }
    });
  }

  onListaCreada(lista: any): void {
    if (!lista) return;
    // Insertar al principio sin recargar
    this.listas = [lista, ...this.listas];
    this.mostrarNotificacionExito('Lista creada correctamente');
    this.mostrandoCrear = false;
  }

  editarLista(lista: any): void {
    this.listaEditando = lista;
    this.contenidosIds = lista.contenidosIds || [];
    this.contenidosCount = this.contenidosIds.length;

    this.listaForm.patchValue({
      nombre: lista.nombre,
      descripcion: lista.descripcion,
      visible: lista.visible,
      tagsInput: lista.tags ? lista.tags.join(', ') : ''
    });

    // Scroll al formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  eliminarLista(id: string): void {
    if (!confirm('¿Estás seguro de que deseas eliminar esta lista?')) {
      return;
    }

    this.limpiarMensajes();

    this.listaService.eliminarLista(id).subscribe({
      next: (response) => {
        if (response.success) {
          this.mostrarNotificacionExito('Lista eliminada correctamente');
          this.listas = this.listas.filter(l => l.id !== id);
          if (this.listaEditando?.id === id) {
            this.resetearFormulario();
          }
        }
      },
      error: (err) => {
        this.manejarError(err);
      }
    });
  }

  mostrarAgregarContenido(lista: any): void {
    // Reemplazar por un prompt simple
    const contenidoId = prompt('Ingrese el ID del contenido a agregar:');
    if (contenidoId && contenidoId.trim()) {
      this.agregarContenido(lista, contenidoId.trim());
    }
  }

  private agregarContenido(lista: any, contenidoId: string): void {
    this.limpiarMensajes();

    this.listaService.addContenido(lista.id, contenidoId).subscribe({
      next: (response) => {
        if (response.success) {
          this.mostrarNotificacionExito('Contenido añadido correctamente');
          this.cargarListas();
          
          if (this.listaEditando?.id === lista.id) {
            this.contenidosIds = response.lista?.contenidosIds || [];
            this.contenidosCount = this.contenidosIds.length;
          }
        }
      },
      error: (err) => {
        this.manejarError(err);
      }
    });
  }

  quitarContenido(contenidoId: string): void {
    if (!this.listaEditando) {
      return;
    }

    if (!confirm('¿Quitar este contenido de la lista?')) {
      return;
    }

    this.limpiarMensajes();

    this.listaService.removeContenido(this.listaEditando.id, contenidoId).subscribe({
      next: (response) => {
        if (response.success) {
          this.mostrarNotificacionExito('Contenido eliminado correctamente');
          this.contenidosIds = response.lista?.contenidosIds || [];
          this.contenidosCount = this.contenidosIds.length;
          this.cargarListas();
        }
      },
      error: (err) => {
        this.manejarError(err);
      }
    });
  }

  cancelarEdicion(): void {
    this.resetearFormulario();
  }



  private resetearFormulario(): void {
    this.listaEditando = null;
    this.contenidosIds = [];
    this.contenidosCount = 0;
    this.listaForm.reset({
      nombre: '',
      descripcion: '',
      visible: this.modo === 'gestor' ? false : false,
      tagsInput: ''
    });
  }

  private parseTags(tagsInput: string): string[] {
    if (!tagsInput || tagsInput.trim() === '') {
      return [];
    }
    return tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
  }

  private limpiarMensajes(): void {
    this.mensajeError = '';
    this.mensajeExito = '';
  }

  private mostrarNotificacionExito(mensaje: string): void {
    this.mensajeExito = mensaje;
    this.mensajeError = '';
    // Limpiar mensaje después de 3 segundos
    setTimeout(() => this.mensajeExito = '', 3000);
  }

  private mostrarNotificacionError(mensaje: string): void {
    this.mensajeError = mensaje;
    this.mensajeExito = '';
    // Limpiar mensaje después de 3 segundos
    setTimeout(() => this.mensajeError = '', 3000);
  }

  private manejarError(err: any): void {
    console.error('Error:', err);

    let mensajeError = '';
    if (err.status === 401) {
      mensajeError = 'No autorizado. Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
    } else if (err.status === 403) {
      mensajeError = 'No tienes permisos para realizar esta acción.';
    } else if (err.status === 404) {
      mensajeError = 'Recurso no encontrado.';
    } else if (err.status === 400) {
      mensajeError = err.error?.mensaje || 'Datos inválidos. Verifica la información.';
    } else if (err.status === 0) {
      mensajeError = 'No se puede conectar con el servidor. Verifica tu conexión.';
    } else {
      mensajeError = err.error?.mensaje || 'Ha ocurrido un error. Intenta nuevamente.';
    }

    this.mensajeError = mensajeError;
    this.mostrarNotificacionError(mensajeError);
  }

  formatDate(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  navegarACrearLista(): void {
    this.router.navigate(['/dashboard/listas/crear']);
  }

  volverAlDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}