import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ListaService } from '../services/lista.service';
import { Lista } from '../model/lista';

@Component({
  selector: 'app-gestion-listas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './gestion-listas.html',
  styleUrls: ['./gestion-listas.css']
})
export class GestionListasComponent implements OnInit {
  @Input() modo: 'gestor' | 'visualizador' = 'visualizador';

  listaForm: FormGroup;
  listas: any[] = [];
  listaEditando: any = null;
  contenidosIds: string[] = [];
  contenidosCount: number = 0;

  cargando: boolean = false;
  guardando: boolean = false;
  mensajeError: string = '';
  mensajeExito: string = '';

  // Control de estado
  agregandoContenido: boolean = false;
  mostrandoCrear: boolean = false;

  constructor(
    private fb: FormBuilder,
    private listaService: ListaService,
    private router: Router
  ) {
    this.listaForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: ['', [Validators.required, Validators.minLength(10)]],
      visible: [false],
      tagsInput: ['']
    });
  }

  ngOnInit(): void {
    // Si es visualizador, siempre forzar visible a false
    if (this.modo === 'visualizador') {
      this.listaForm.patchValue({ visible: false });
      this.listaForm.get('visible')?.disable();
    }

    this.cargarListas();
  }

  cargarListas(): void {
    this.cargando = true;
    this.limpiarMensajes();

    this.listaService.getMisListas().subscribe({
      next: (response) => {
        if (response.success && response.listas) {
          this.listas = response.listas;
        } else {
          this.listas = [];
        }
        this.cargando = false;
      },
      error: (err) => {
        this.cargando = false;
        this.manejarError(err);
      }
    });
  }

  guardarLista(): void {
    // Este método ahora solo gestiona la edición. La creación se delega al componente <crear-lista>.
    if (!this.listaEditando) {
      // No hacemos nada si no hay lista a editar
      return;
    }

    if (this.listaForm.invalid) {
      this.listaForm.markAllAsTouched();
      return;
    }

    this.guardando = true;
    this.limpiarMensajes();

    const formValue = this.listaForm.getRawValue();
    const datos = {
      nombre: formValue.nombre.trim(),
      descripcion: formValue.descripcion.trim(),
      visible: this.modo === 'gestor' ? formValue.visible : false,
      tags: this.parseTags(formValue.tagsInput)
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
    this.agregandoContenido = true;
    this.limpiarMensajes();

    this.listaService.addContenido(lista.id, contenidoId).subscribe({
      next: (response) => {
        this.agregandoContenido = false;
        if (response.success) {
          this.mostrarNotificacionExito('Contenido añadido correctamente');
          this.cargarListas();
          
          // Si estamos editando esta lista, actualizar el contador
          if (this.listaEditando?.id === lista.id) {
            this.contenidosIds = response.lista?.contenidosIds || [];
            this.contenidosCount = this.contenidosIds.length;
          }
        }
      },
      error: (err) => {
        this.agregandoContenido = false;
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
    this.router.navigate(['/crear-lista']);
  }
}