import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { GestionListasComponent } from './gestion-listas.component';
import { ListaService } from '../services/lista.service';

describe('GestionListasComponent', () => {
  let component: GestionListasComponent;
  let fixture: ComponentFixture<GestionListasComponent>;
  let mockListaService: jasmine.SpyObj<ListaService>;

  const mockLista = {
    id: '1',
    nombre: 'Lista de prueba',
    descripcion: 'Descripción de prueba para testing',
    visible: true,
    tags: ['rock', 'pop'],
    contenidosIds: ['contenido1', 'contenido2'],
    fechaCreacion: '2024-01-01T00:00:00.000Z'
  };

  const mockResponse = {
    success: true,
    mensaje: 'Operación exitosa',
    listas: [mockLista],
    lista: mockLista
  };

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('ListaService', [
      'getMisListas',
      'crearLista',
      'editarLista',
      'eliminarLista',
      'addContenido',
      'removeContenido'
    ]);

    await TestBed.configureTestingModule({
      imports: [GestionListasComponent, ReactiveFormsModule, FormsModule],
      providers: [
        FormBuilder,
        { provide: ListaService, useValue: spy }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionListasComponent);
    component = fixture.componentInstance;
    mockListaService = TestBed.inject(ListaService) as jasmine.SpyObj<ListaService>;
    
    // Configurar respuestas por defecto
    mockListaService.getMisListas.and.returnValue(of(mockResponse));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Inicialización del componente', () => {
    it('debería inicializar el formulario correctamente', () => {
      expect(component.listaForm).toBeDefined();
      expect(component.listaForm.get('nombre')).toBeTruthy();
      expect(component.listaForm.get('descripcion')).toBeTruthy();
      expect(component.listaForm.get('visible')).toBeTruthy();
      expect(component.listaForm.get('tagsInput')).toBeTruthy();
    });

    it('debería cargar las listas al inicializar', () => {
      spyOn(component, 'cargarListas');
      
      component.ngOnInit();
      
      expect(component.cargarListas).toHaveBeenCalled();
    });

    it('debería configurar modo visualizador correctamente', () => {
      component.modo = 'visualizador';
      
      component.ngOnInit();
      
      expect(component.listaForm.get('visible')?.value).toBeFalse();
      expect(component.listaForm.get('visible')?.disabled).toBeTrue();
    });
  });

  describe('Carga de listas', () => {
    it('debería cargar las listas exitosamente', () => {
      component.cargarListas();

      expect(mockListaService.getMisListas).toHaveBeenCalled();
      expect(component.listas).toEqual([mockLista]);
      expect(component.cargando).toBeFalse();
    });

    it('debería manejar error al cargar listas', () => {
      mockListaService.getMisListas.and.returnValue(
        throwError(() => ({ status: 500, error: { mensaje: 'Error del servidor' } }))
      );
      
      component.cargarListas();

      expect(component.cargando).toBeFalse();
      expect(component.mensajeError).toBeTruthy();
    });
  });

  describe('Creación y edición de listas', () => {
    beforeEach(() => {
      mockListaService.crearLista.and.returnValue(of(mockResponse));
      mockListaService.editarLista.and.returnValue(of(mockResponse));
    });

    it('debería crear una nueva lista', () => {
      component.listaForm.patchValue({
        nombre: 'Nueva Lista',
        descripcion: 'Descripción de nueva lista',
        visible: true,
        tagsInput: 'rock, pop'
      });

      component.guardarLista();

      expect(mockListaService.crearLista).toHaveBeenCalledWith({
        nombre: 'Nueva Lista',
        descripcion: 'Descripción de nueva lista',
        visible: true,
        tags: ['rock', 'pop']
      });
      expect(component.mensajeExito).toBeTruthy();
    });

    it('debería editar una lista existente', () => {
      component.listaEditando = mockLista;
      component.listaForm.patchValue({
        nombre: 'Lista Editada',
        descripcion: 'Descripción editada',
        visible: false,
        tagsInput: 'indie, alternative'
      });

      component.guardarLista();

      expect(mockListaService.editarLista).toHaveBeenCalledWith('1', {
        nombre: 'Lista Editada',
        descripcion: 'Descripción editada',
        visible: false,
        tags: ['indie', 'alternative']
      });
    });

    it('no debería guardar si el formulario es inválido', () => {
      component.listaForm.patchValue({
        nombre: '',
        descripcion: ''
      });

      component.guardarLista();

      expect(mockListaService.crearLista).not.toHaveBeenCalled();
      expect(component.listaForm.touched).toBeTrue();
    });
  });

  describe('Edición de listas', () => {
    it('debería cargar datos de lista en el formulario para editar', () => {
      component.editarLista(mockLista);

      expect(component.listaEditando).toEqual(mockLista);
      expect(component.contenidosIds).toEqual(['contenido1', 'contenido2']);
      expect(component.contenidosCount).toBe(2);
      expect(component.listaForm.get('nombre')?.value).toBe('Lista de prueba');
      expect(component.listaForm.get('tagsInput')?.value).toBe('rock, pop');
    });

    it('debería cancelar la edición', () => {
      component.listaEditando = mockLista;
      
      component.cancelarEdicion();

      expect(component.listaEditando).toBeNull();
      expect(component.contenidosIds).toEqual([]);
      expect(component.contenidosCount).toBe(0);
    });
  });

  describe('Eliminación de listas', () => {
    beforeEach(() => {
      mockListaService.eliminarLista.and.returnValue(of(mockResponse));
    });

    it('debería eliminar una lista', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      component.listas = [mockLista];

      component.eliminarLista('1');

      expect(mockListaService.eliminarLista).toHaveBeenCalledWith('1');
      expect(component.mensajeExito).toBeTruthy();
      expect(component.listas).toEqual([]);
    });

    it('no debería eliminar si el usuario cancela', () => {
      spyOn(window, 'confirm').and.returnValue(false);

      component.eliminarLista('1');

      expect(mockListaService.eliminarLista).not.toHaveBeenCalled();
    });
  });

  describe('Gestión de contenidos', () => {
    beforeEach(() => {
      mockListaService.addContenido.and.returnValue(of(mockResponse));
      mockListaService.removeContenido.and.returnValue(of(mockResponse));
    });

    it('debería mostrar modal para agregar contenido', () => {
      component.mostrarAgregarContenido(mockLista);

      expect(component.modalAgregarContenido).toBeTrue();
      expect(component.listaSeleccionada).toEqual(mockLista);
      expect(component.nuevoContenidoId).toBe('');
    });

    it('debería agregar contenido a una lista', () => {
      component.listaSeleccionada = mockLista;
      component.nuevoContenidoId = 'contenido3';

      component.agregarContenido();

      expect(mockListaService.addContenido).toHaveBeenCalledWith('1', 'contenido3');
      expect(component.mensajeExito).toBeTruthy();
    });

    it('debería quitar contenido de una lista', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      component.listaEditando = mockLista;

      component.quitarContenido('contenido1');

      expect(mockListaService.removeContenido).toHaveBeenCalledWith('1', 'contenido1');
      expect(component.mensajeExito).toBeTruthy();
    });

    it('debería cerrar el modal', () => {
      component.modalAgregarContenido = true;
      component.listaSeleccionada = mockLista;
      component.nuevoContenidoId = 'test';

      component.cerrarModal();

      expect(component.modalAgregarContenido).toBeFalse();
      expect(component.listaSeleccionada).toBeNull();
      expect(component.nuevoContenidoId).toBe('');
    });
  });

  describe('Utilidades', () => {
    it('debería parsear tags correctamente', () => {
      const tags = component['parseTags']('rock, pop, indie');
      expect(tags).toEqual(['rock', 'pop', 'indie']);
    });

    it('debería manejar tags vacíos', () => {
      const tags = component['parseTags']('');
      expect(tags).toEqual([]);
    });

    it('debería formatear fecha correctamente', () => {
      const fecha = component.formatDate('2024-01-01T00:00:00.000Z');
      expect(fecha).toBeTruthy();
      expect(typeof fecha).toBe('string');
    });

    it('debería manejar fecha nula', () => {
      const fecha = component.formatDate(null);
      expect(fecha).toBe('');
    });

    it('debería limpiar mensajes', () => {
      component.mensajeError = 'Error';
      component.mensajeExito = 'Éxito';

      component['limpiarMensajes']();

      expect(component.mensajeError).toBe('');
      expect(component.mensajeExito).toBe('');
    });
  });

  describe('Manejo de errores', () => {
    it('debería manejar error 401', () => {
      const error = { status: 401 };
      
      component['manejarError'](error);

      expect(component.mensajeError).toContain('No autorizado');
    });

    it('debería manejar error 403', () => {
      const error = { status: 403 };
      
      component['manejarError'](error);

      expect(component.mensajeError).toContain('No tienes permisos');
    });

    it('debería manejar error 404', () => {
      const error = { status: 404 };
      
      component['manejarError'](error);

      expect(component.mensajeError).toContain('Recurso no encontrado');
    });

    it('debería manejar error de conexión', () => {
      const error = { status: 0 };
      
      component['manejarError'](error);

      expect(component.mensajeError).toContain('No se puede conectar');
    });

    it('debería manejar error genérico', () => {
      const error = { status: 500, error: { mensaje: 'Error interno' } };
      
      component['manejarError'](error);

      expect(component.mensajeError).toBe('Error interno');
    });
  });
});