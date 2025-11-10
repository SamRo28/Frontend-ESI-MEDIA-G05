import { Component, EventEmitter, Input, Output, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { ListaService } from '../services/lista.service';
import { ContentService, ContenidoSearchResult } from '../services/content.service';
import { Lista } from '../model/lista';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { Subject, of } from 'rxjs';

@Component({
  selector: 'crear-lista',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, HttpClientModule],
  templateUrl: './crear-lista.html',
  styleUrls: ['./crear-lista.css']
})
export class CrearListaComponent implements OnInit {
  @Input() modo: 'gestor' | 'visualizador' = 'visualizador';
  @Input() modal: boolean = false;
  @Input() listaParaEditar?: any = null; // Nueva propiedad para modo edición
  @Output() creada = new EventEmitter<any>();
  @Output() editada = new EventEmitter<any>(); // Nuevo evento para edición
  @Output() cancelada = new EventEmitter<void>();
  @Output() cerrar = new EventEmitter<void>();

  listaForm: FormGroup;
  guardando: boolean = false;
  userId: string = '';
  
  // Gestión de contenidos
  contenidosIds: string[] = [];
  nuevoContenido: string = '';
  mostrarErrorContenido: boolean = false;
  mensajeErrorNombre: string = '';
  mensajeExito: string = '';
  
  // Búsqueda de contenidos
  contenidosEncontrados: ContenidoSearchResult[] = [];
  mostrarSugerencias: boolean = false;
  buscandoContenidos: boolean = false;
  private searchSubject = new Subject<string>();
  private contenidosSeleccionados: Map<string, ContenidoSearchResult> = new Map();

  constructor(
    private fb: FormBuilder, 
    private listaService: ListaService, 
    private contentService: ContentService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.listaForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: ['', [Validators.required, Validators.minLength(10)]],
      especializacion: [''],
      visible: [false], // Se actualizará en configurarFormularioSegunRol()
      tagsInput: ['']
    });
  }

  ngOnInit(): void {
    // Solo ejecutar en el navegador, no durante SSR
    if (!isPlatformBrowser(this.platformId)) {
      console.log('CrearListaComponent - SSR detectado, saltando inicialización');
      return;
    }

    // Cargar el usuario desde sessionStorage
    const userJson = sessionStorage.getItem('user');
    if (!userJson) {
      // Si no existe el usuario, redirigir al login
      this.router.navigate(['/login']);
      return;
    }

    try {
      const user = JSON.parse(userJson);
      this.userId = user.id;
    } catch (error) {
      console.error('Error parsing user from sessionStorage:', error);
      this.router.navigate(['/login']);
      return;
    }

    // Determinar el rol del usuario desde sessionStorage
    const currentUserClass = sessionStorage.getItem('currentUserClass');
    if (currentUserClass === 'GestordeContenido') {
      this.modo = 'gestor';
    } else {
      this.modo = 'visualizador';
    }

    // Configurar formulario según el rol del usuario
    this.configurarFormularioSegunRol();
    
    // Configurar búsqueda en tiempo real
    this.configurarBusquedaContenidos();

    // Si hay lista para editar, cargar sus datos
    if (this.listaParaEditar) {
      this.cargarDatosLista();
    }
  }

  private parseTags(tagsInput: string): string[] {
    if (!tagsInput || tagsInput.trim() === '') return [];
    return tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0);
  }

  onSubmit(): void {
    if (this.listaForm.invalid) {
      this.listaForm.markAllAsTouched();
      return;
    }

    // Eliminar duplicados en contenidosIds
    const contenidosUnicos = [...new Set(this.contenidosIds)];
    
    // Verificar que hay contenidos
    if (contenidosUnicos.length === 0) {
      this.mostrarErrorContenido = true;
      return;
    }

    this.guardando = true;
    this.mensajeErrorNombre = '';
    this.mensajeExito = '';

    const fv = this.listaForm.getRawValue();
    
    const datosLista = {
      nombre: fv.nombre.trim(),
      descripcion: fv.descripcion.trim(),
      tags: this.parseTags(fv.tagsInput),
      visible: this.modo === 'gestor' ? fv.visible : false,
      creadorId: this.userId,
      especializacionGestor: this.modo === 'gestor' ? fv.especializacion?.trim() : null,
      contenidosIds: contenidosUnicos
    };

    // Validar datos antes de enviar
    const validacion = this.listaService.validarDatosLista(datosLista);
    if (!validacion.esValida) {
      this.guardando = false;
      this.mensajeErrorNombre = validacion.mensaje || 'Datos de la lista no válidos';
      return;
    }

    // Determinar si es creación o edición
    const observable = this.listaParaEditar ? 
      this.listaService.editarLista(this.listaParaEditar.id, datosLista) :
      this.listaService.crearLista(datosLista);

    observable.subscribe({
      next: (res: any) => {
        this.guardando = false;
        if (res && res.success) {
          // Mostrar mensaje de éxito
          const accion = this.listaParaEditar ? 'actualizada' : 'creada';
          this.mensajeExito = `✅ Lista ${accion} correctamente`;
          
          if (this.modal) {
            // En modo modal, emitir evento correspondiente y cerrar
            if (this.listaParaEditar) {
              this.editada.emit(res.lista);
            } else {
              this.creada.emit(res.lista);
            }
            setTimeout(() => {
              this.resetearFormulario();
            }, 500);
          } else {
            // En modo normal, navegar después de 2 segundos
            setTimeout(() => this.router.navigate(['/dashboard/listas']), 2000);
            this.resetearFormulario();
          }
        } else {
          console.error('Respuesta inesperada:', res);
          if (res?.mensaje && (res.mensaje.includes('nombre') && res.mensaje.includes('existe'))) {
            this.mensajeErrorNombre = res.mensaje;
          } else {
            this.mensajeErrorNombre = res?.mensaje || 'No se pudo procesar la lista';
          }
        }
      },
      error: (err: any) => {
        this.guardando = false;
        console.error('Error procesando lista:', err);
        if (err.status === 400 && err.error?.mensaje) {
          if (err.error.mensaje.includes('nombre') && err.error.mensaje.includes('existe')) {
            this.mensajeErrorNombre = err.error.mensaje;
          } else {
            this.mensajeErrorNombre = err.error.mensaje;
          }
        } else {
          this.mensajeErrorNombre = 'Error al procesar la lista. Inténtalo de nuevo.';
        }
      }
    });
  }

  onCancelar(): void {
    if (this.modal) {
      this.cerrar.emit();
    } else {
      this.cancelada.emit();
    }
  }

  /**
   * Configura la búsqueda en tiempo real de contenidos
   */
  private configurarBusquedaContenidos(): void {
    this.searchSubject.pipe(
      debounceTime(300), // Esperar 300ms después de que el usuario deje de escribir
      distinctUntilChanged(), // Solo buscar si el texto cambió
      switchMap(query => {
        if (!query || query.trim().length < 2) {
          this.buscandoContenidos = false;
          return of({ success: false, contenidos: [], total: 0, query: '', mensaje: '' });
        }
        
        console.log('Buscando contenidos para:', query.trim());
        this.buscandoContenidos = true;
        
        return this.contentService.buscarContenidos(query.trim(), 8).pipe(
          // Capturar errores HTTP y convertirlos en respuestas manejables
          catchError(error => {
            console.error('Error HTTP en búsqueda:', error);
            return of({ 
              success: false, 
              contenidos: [], 
              total: 0, 
              query: query.trim(), 
              mensaje: 'Error al buscar contenidos' 
            });
          })
        );
      })
    ).subscribe({
      next: (response) => {
        console.log('Procesando respuesta:', response);
        this.buscandoContenidos = false;
        
        if (response && response.success) {
          this.contenidosEncontrados = response.contenidos || [];
          this.mostrarSugerencias = this.contenidosEncontrados.length > 0;
          console.log('Contenidos encontrados:', this.contenidosEncontrados.length);
        } else {
          console.log('Búsqueda sin resultados o error:', response?.mensaje);
          this.contenidosEncontrados = [];
          this.mostrarSugerencias = false;
        }
      },
      error: (error) => {
        console.error('Error en búsqueda de contenidos:', error);
        this.buscandoContenidos = false;
        this.contenidosEncontrados = [];
        this.mostrarSugerencias = false;
        
        // Mostrar mensaje de error si es necesario
        if (error.status === 401) {
          console.warn('Token de autorización inválido o expirado');
        } else if (error.status === 0) {
          console.warn('No se puede conectar al servidor backend');
        }
      }
    });
  }

  /**
   * Configura el formulario según el rol del usuario
   */
  private configurarFormularioSegunRol(): void {
    if (this.modo === 'visualizador') {
      // Para visualizadores: ocultar campo visible y forzar a false
      this.listaForm.patchValue({ visible: false });
      this.listaForm.get('visible')?.disable();
      this.listaForm.get('especializacion')?.clearValidators();
    } else {
      // Para gestores: habilitar campo visible, establecer como público por defecto y añadir validación a especialización
      this.listaForm.patchValue({ visible: true });
      this.listaForm.get('visible')?.enable();
      this.listaForm.get('especializacion')?.setValidators([Validators.required]);
    }
    this.listaForm.get('especializacion')?.updateValueAndValidity();
  }

  /**
   * Resetea el formulario con valores por defecto según el rol del usuario
   */
  private resetearFormulario(): void {
    const defaultValues = {
      nombre: '',
      descripcion: '',
      especializacion: '',
      visible: this.modo === 'gestor' ? true : false, // Gestor: público por defecto, Visualizador: privado
      tagsInput: ''
    };

    this.listaForm.reset(defaultValues);
    this.contenidosIds = [];
    this.nuevoContenido = '';
    this.mostrarErrorContenido = false;
    this.mensajeErrorNombre = '';
    this.mensajeExito = '';
    
    // Limpiar búsqueda y caché
    this.contenidosEncontrados = [];
    this.mostrarSugerencias = false;
    this.buscandoContenidos = false;
    this.contenidosSeleccionados.clear();
    
    // Reconfigurar según el rol después del reset
    this.configurarFormularioSegunRol();
  }

  /**
   * Navegar de vuelta a la gestión de listas
   */
  volver(): void {
    this.router.navigate(['/dashboard/listas']);
  }

  /**
   * Maneja el cambio en el campo de búsqueda de contenidos
   */
  onBuscarContenido(): void {
    this.searchSubject.next(this.nuevoContenido);
  }

  /**
   * Selecciona un contenido de las sugerencias
   */
  seleccionarContenido(contenido: ContenidoSearchResult): void {
    // Verificar que no esté duplicado
    if (this.contenidosIds.includes(contenido.id)) {
      alert('Este contenido ya está en la lista');
      return;
    }

    // Guardar el contenido en el caché para poder mostrar su nombre después
    this.contenidosSeleccionados.set(contenido.id, contenido);
    
    this.contenidosIds.push(contenido.id);
    this.nuevoContenido = '';
    this.mostrarSugerencias = false;
    this.contenidosEncontrados = [];
    this.mostrarErrorContenido = false;
  }

  /**
   * Cierra las sugerencias
   */
  cerrarSugerencias(): void {
    setTimeout(() => {
      this.mostrarSugerencias = false;
    }, 200); // Pequeño delay para permitir clicks en las sugerencias
  }

  /**
   * Obtiene el nombre del contenido por su ID (para mostrar en la lista)
   */
  obtenerNombreContenido(id: string): string {
    // Buscar en el caché de contenidos seleccionados
    const contenidoCacheado = this.contenidosSeleccionados.get(id);
    if (contenidoCacheado) {
      return `${contenidoCacheado.titulo} (${contenidoCacheado.tipo})`;
    }
    
    // Buscar en los contenidos encontrados recientemente
    const contenidoEncontrado = this.contenidosEncontrados.find(c => c.id === id);
    if (contenidoEncontrado) {
      return `${contenidoEncontrado.titulo} (${contenidoEncontrado.tipo})`;
    }
    
    // Si no se encuentra, devolver el ID (para contenidos añadidos manualmente)
    return `Contenido ID: ${id}`;
  }

  /**
   * Añade un nuevo contenido a la lista (método legacy mantenido para compatibilidad)
   */
  agregarContenido(): void {
    if (!this.nuevoContenido || !this.nuevoContenido.trim()) {
      return;
    }

    const contenido = this.nuevoContenido.trim();
    
    // Si hay sugerencias y el usuario escribió exactamente el título de una, seleccionarla
    const contenidoEncontrado = this.contenidosEncontrados.find(c => 
      c.titulo.toLowerCase() === contenido.toLowerCase()
    );
    
    if (contenidoEncontrado) {
      this.seleccionarContenido(contenidoEncontrado);
      return;
    }
    
    // Verificar que no esté duplicado (por ID)
    if (this.contenidosIds.includes(contenido)) {
      alert('Este contenido ya está en la lista');
      return;
    }

    // Agregar como ID directo si no se encontró en las sugerencias
    this.contenidosIds.push(contenido);
    this.nuevoContenido = '';
    this.mostrarErrorContenido = false;
    this.mostrarSugerencias = false;
  }

  /**
   * Quita un contenido de la lista
   */
  quitarContenido(index: number): void {
    // No permitir borrar si solo hay 1 contenido
    if (this.contenidosIds.length > 1) {
      const contenidoEliminado = this.contenidosIds[index];
      this.contenidosIds.splice(index, 1);
      // Limpiar del caché también
      this.contenidosSeleccionados.delete(contenidoEliminado);
    } else {
      // Mostrar mensaje de advertencia
      alert('⚠️ Una lista debe tener al menos un contenido. No puedes eliminar el último elemento.');
    }
  }

  /**
   * Verifica si se puede eliminar un contenido
   */
  puedeEliminarContenido(): boolean {
    return this.contenidosIds.length > 1;
  }

  /**
   * Formatea la duración en segundos a un formato legible (mm:ss o hh:mm:ss)
   */
  formatDuration(seconds: number): string {
    if (!seconds) return '';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Verifica si se puede crear la lista
   */
  puedeCrearLista(): boolean {
    return this.listaForm.valid && 
           this.contenidosIds.length > 0 && 
           !this.guardando;
  }

  /**
   * Carga los datos de una lista existente para edición
   */
  private cargarDatosLista(): void {
    if (!this.listaParaEditar) return;

    // Cargar datos básicos en el formulario
    this.listaForm.patchValue({
      nombre: this.listaParaEditar.nombre || '',
      descripcion: this.listaParaEditar.descripcion || '',
      especializacion: this.listaParaEditar.especializacionGestor || '',
      visible: this.listaParaEditar.visible || false,
      tagsInput: this.listaParaEditar.tags ? this.listaParaEditar.tags.join(', ') : ''
    });

    // Cargar contenidos si existen
    if (this.listaParaEditar.contenidosIds && this.listaParaEditar.contenidosIds.length > 0) {
      this.contenidosIds = [...this.listaParaEditar.contenidosIds];
    }

    // Si hay contenidos y queremos mostrar sus nombres, podemos buscarlos
    if (this.listaParaEditar.contenidos && this.listaParaEditar.contenidos.length > 0) {
      this.listaParaEditar.contenidos.forEach((contenido: any) => {
        this.contenidosSeleccionados.set(contenido.id, {
          id: contenido.id,
          titulo: contenido.titulo || contenido.nombre,
          tipo: contenido.tipo,
          duracion: contenido.duracion
        });
      });
    }
  }

  /**
   * Obtiene el título del modal/componente según el modo
   */
  get tituloModal(): string {
    return this.listaParaEditar ? 'Editar lista' : 'Crear nueva lista';
  }

  /**
   * Obtiene el texto del botón de submit según el modo
   */
  get textoBotonSubmit(): string {
    if (this.guardando) {
      return this.listaParaEditar ? 'Actualizando...' : 'Creando...';
    }
    return this.listaParaEditar ? 'Actualizar lista' : 'Crear lista';
  }
}
