import { Component, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AdminService, Usuario, ContenidoResumen, ContenidoDetalle } from '../services/admin.service';

@Component({
  selector: 'app-content-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './content-list.html',
  styleUrl: './content-list.css'
})
export class ContentList implements OnInit {

  activeTab = 'inicio';
  showForm = false;
  usuarios: Usuario[] = [];
  usuariosFiltrados: Usuario[] = []; // Lista filtrada para mostrar
  // Contenidos (solo lectura)
  contenidos: ContenidoResumen[] = [];
  contenidosFiltrados: ContenidoResumen[] = [];
  filtroTipoContenido: 'Todos' | 'Audio' | 'Video' = 'Todos';
  busquedaContenido = '';
  showContenidoModal = false;
  detalleContenido: ContenidoDetalle | null = null;
  loadingContenido = false;
  errorContenido = '';
  // Control para cargar contenidos cuando aún no tenemos Admin-ID
  private pendingLoadContenidos = false;
  
  // Información del usuario actual
  currentUser: any = null;
  
  // Modal de perfil
  showProfileModal = false;
  editingProfile = {
    nombre: '',
    apellidos: '',
    email: '',
    foto: ''
  };
  
  // Modal de confirmaciÃ³n para eliminar usuario
  showDeleteModal = false;
  usuarioAEliminar: Usuario | null = null;
  

  
  // Modal de confirmaciÃ³n para bloquear/desbloquear usuario
  showBloqueoModal = false;
  usuarioABloquear: Usuario | null = null;
  accionBloqueo: 'bloquear' | 'desbloquear' = 'bloquear';
  loadingBloqueo = false;
  errorBloqueo = '';
  // Doble confirmaciÃ³n de bloqueo/desbloqueo
  confirmBloqueoStep: 1 | 2 = 1;
  
  // Filtros
  filtroRol = 'Todos'; // 'Todos', 'Administrador', 'Gestor', 'Visualizador'
  busquedaNombre = ''; // Texto de bÃºsqueda

  newUser = {
    nombre: '',
    apellidos: '',
    email: '',
    contrasenia: '',
    repetirContrasenia: '',
    foto: '',
    departamento: '',
    rol: 'Administrador' as 'Administrador' | 'Gestor',
    // Campos especÃ­ficos para Gestor
    alias: '',
    descripcion: '',
    especialidad: '',
    tipoContenido: ''
  };
  errorMessage = '';
  successMessage = '';
  isCreating = false;
  isSuccess = false; // Nueva propiedad para mostrar estado de Ã©xito
  
  // Propiedades para manejar errores de validaciÃ³n
  fieldsWithError: string[] = [];

  // Fotos de perfil disponibles
  fotosDisponibles = [
    { id: 'perfil1.png', nombre: 'Perfil 1' },
    { id: 'perfil2.png', nombre: 'Perfil 2' },
    { id: 'perfil3.png', nombre: 'Perfil 3' },
    { id: 'perfil4.png', nombre: 'Perfil 4' }
  ];

  constructor(
    private readonly adminService: AdminService,
    private readonly cdr: ChangeDetectorRef,
    private readonly router: Router,
    @Inject(PLATFORM_ID) private readonly platformId: Object
  ) {
    console.log('🔧 [ContentList] Constructor llamado');
  }

  ngOnInit() {
    console.log('🚀 [ContentList] ngOnInit llamado');
    console.log('🔍 [ContentList] platformId:', this.platformId);
    console.log('🔍 [ContentList] isPlatformBrowser:', isPlatformBrowser(this.platformId));
    
    // Cargar información del usuario actual desde sessionStorage (solo en el navegador)
    if (isPlatformBrowser(this.platformId)) {
      const userStr = sessionStorage.getItem('user');
      console.log('📦 [ContentList] userStr de sessionStorage:', userStr);
      if (userStr) {
        try {
          this.currentUser = JSON.parse(userStr);
          console.log('✅ [ContentList] Usuario cargado desde sessionStorage:', this.currentUser);
        } catch (e) {
          console.error('❌ [ContentList] Error al parsear usuario desde sessionStorage:', e);
        }
      } else {
        console.warn('⚠️ [ContentList] No se encontró usuario en sessionStorage');
      }
    }
    
    // Cargar contenidos después de tener el usuario
    console.log('📋 [ContentList] Llamando a loadContenidos()...');
    this.loadContenidos();
  }


  resetMessages() {
    this.errorMessage = '';
    this.successMessage = '';
    this.isCreating = false; // Asegurar que se restablezca el estado de loading
    this.isSuccess = false; // Resetear estado de Ã©xito
    this.fieldsWithError = []; // Limpiar errores de campos
  }



  // ================= Contenidos (solo lectura) =================
  loadContenidos() {
    this.errorContenido = '';
    this.loadingContenido = true;
    const adminId = this.obtenerAdminId();
    if (!adminId) {
      this.errorContenido = 'No se pudo identificar al administrador';
      return;
    }
    // Debug ligero para confirmar el Admin-ID usado
    console.log('[Contenidos] Admin-ID usado:', adminId);

    this.adminService.getContenidos(adminId).subscribe({
      next: (lista) => {
        console.log('[Contenidos] Recibidos:', Array.isArray(lista) ? lista.length : 'n/a', 'items');
        if (Array.isArray(lista)) {
          console.log('[Contenidos] Ejemplo:', lista[0]);
        }
        this.contenidos = lista;
        this.aplicarFiltrosContenidos();
        this.loadingContenido = false;
        // Forzar render inmediato tras actualizar arrays
        try { this.cdr.detectChanges(); } catch {}
      },
      error: (err) => {
        console.error('Error al cargar contenidos:', err);
        try {
          const msg = (err?.error && (err.error.error || err.error.message)) || '';
          this.errorContenido = msg ? `Error al cargar contenidos: ${msg}` : 'Error al cargar contenidos';
        } catch {
          this.errorContenido = 'Error al cargar contenidos';
        }
        this.loadingContenido = false;
      }
    });
  }

  aplicarFiltrosContenidos() {
    let arr = [...this.contenidos];
    if (this.filtroTipoContenido !== 'Todos') {
      arr = arr.filter(c => c.tipo === this.filtroTipoContenido);
    }
    if (this.busquedaContenido.trim()) {
      const q = this.busquedaContenido.trim().toLowerCase();
      arr = arr.filter(c => (c.titulo || '').toLowerCase().includes(q) || (c.gestorNombre || '').toLowerCase().includes(q));
    }
    this.contenidosFiltrados = arr;
  }

  onFiltroTipoContenidoChange() { this.aplicarFiltrosContenidos(); }
  onBusquedaContenidoChange() { this.aplicarFiltrosContenidos(); }
  limpiarFiltrosContenidos() {
    this.filtroTipoContenido = 'Todos';
    this.busquedaContenido = '';
    this.aplicarFiltrosContenidos();
  }

  verDetalleContenido(c: any) {
    const adminId = this.obtenerAdminId();
    if (!adminId) {
      this.errorContenido = 'No se pudo identificar al administrador';
      return;
    }
    this.showContenidoModal = true;
    this.loadingContenido = true;
    this.errorContenido = '';
    this.detalleContenido = null;
    this.adminService.getContenidoDetalle(c.id, adminId).subscribe({
      next: (det) => {
        this.detalleContenido = det;
        this.loadingContenido = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error contenido detalle:', err);
        this.errorContenido = 'No se pudo cargar el detalle';
        this.loadingContenido = false;
        this.cdr.detectChanges();
      }
    });
  }

  cerrarContenidoModal() {
    this.showContenidoModal = false;
    this.detalleContenido = null;
    this.loadingContenido = false;
    this.errorContenido = '';
  }
  toggleForm() {
    this.showForm = !this.showForm;
    if (this.showForm) {
      // Limpiar mensajes cuando se abre el formulario
      this.resetMessages();
    } else {
      this.resetForm();
      this.resetMessages();
    }
  }


  // ==================================================
  // Bloquear/Desbloquear Usuario
  // ==================================================

  /**
   * Abre el modal de confirmaciÃ³n para bloquear/desbloquear usuario
   */
  abrirModalBloqueo(usuario: Usuario) {
    this.usuarioABloquear = usuario;
    this.accionBloqueo = usuario.bloqueado ? 'desbloquear' : 'bloquear';
    this.showBloqueoModal = true;
    this.errorBloqueo = '';
    this.confirmBloqueoStep = 1;
  }




resetForm() {
    this.newUser = {
      nombre: '',
      apellidos: '',
      email: '',
      contrasenia: '',
      repetirContrasenia: '',
      foto: '',
      departamento: '',
      rol: 'Administrador',
      // Campos especÃ­ficos para Gestor
      alias: '',
      descripcion: '',
      especialidad: '',
      tipoContenido: ''
    };
    this.resetMessages();
  }


































  


  private obtenerAdminId(): string | null {
    // Primero intenta desde currentUser (acepta id o _id)
    if (this.currentUser?._id || this.currentUser?.id) {
      return (this.currentUser as any)._id || this.currentUser.id;
    }

    // Buscar en la lista de usuarios por email
    if (this.currentUser?.email) {
      const adminEnLista = this.usuarios.find(u => u.email === this.currentUser?.email);
      if (adminEnLista?.id) {
        return adminEnLista.id;
      }
    }

    // Ãšltimo recurso: primer administrador de la lista
    const primerAdmin = this.usuarios.find(u => u.rol === 'Administrador');
    return primerAdmin?.id || null;
  }

  

}
