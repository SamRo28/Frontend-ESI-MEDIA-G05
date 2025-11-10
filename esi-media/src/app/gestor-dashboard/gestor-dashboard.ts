import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { ContentService } from '../services/content.service';
import { GestionListasComponent } from '../gestion-listas/gestion-listas';
import { CrearListaComponent } from '../crear-lista/crear-lista';

interface RecentUpload {
  id: number;
  titulo: string;
  tipo: 'audio' | 'video';
  fecha: Date;
  duracion: number;
}

interface DashboardStats {
  totalContent: number;
  audioCount: number;
  videoCount: number;
  recentUploads: RecentUpload[];
}

@Component({
  selector: 'app-gestor-dashboard',
  standalone: true,
  imports: [CommonModule, GestionListasComponent, CrearListaComponent],
  templateUrl: './gestor-dashboard.html',
  styleUrl: './gestor-dashboard.css'
})
export class GestorDashboardComponent implements OnInit, OnDestroy {
  
  stats: DashboardStats = {
    totalContent: 0,
    audioCount: 0,
    videoCount: 0,
    recentUploads: []
  };
  
  isLoading = true;
  gestorType: 'audio' | 'video' = 'audio'; // Por defecto audio, solo para pruebas
  userName = '';
  // Mensajes para mostrar retroalimentación en la UI (por ejemplo, 'Sesión cerrada')
  successMessage = '';
  
  // Variables para el manejo de listas (similar a visu-dashboard)
  mostrarGestionListas = false;
  forceReloadListasGestor: number = 0;
  showCrearModal: boolean = false;

  private isBrowser: boolean;
  private documentClickHandler = (event: Event) => this.onDocumentClick(event);
  private escapeKeyHandler = (event: KeyboardEvent) => { if ((event as KeyboardEvent).key === 'Escape') this.onEscapeKey(); };

  constructor(
    private readonly contentService: ContentService,
    private readonly router: Router,
    @Inject(PLATFORM_ID) private readonly platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    this.loadUserInfo();
    this.loadDashboardStats();
    
    // Registrar listeners para manejo de eventos
    if (this.isBrowser) {
      try {
        document.addEventListener('click', this.documentClickHandler);
        document.addEventListener('keydown', this.escapeKeyHandler as any);
      } catch (e) {
        // defensivo: si document no existe, no hacer nada
      }
    }
  }

  ngOnDestroy(): void {
    if (this.isBrowser) {
      try {
        document.removeEventListener('click', this.documentClickHandler);
        document.removeEventListener('keydown', this.escapeKeyHandler as any);
        document.body.classList.remove('no-scroll');
      } catch (e) {
        // ignorar
      }
    }
  }

  loadUserInfo() {
    // Solo acceder a sessionStorage en el navegador
    if (isPlatformBrowser(this.platformId)) {
      // Obtener el resto de información del usuario del sessionStorage
      const userJson = sessionStorage.getItem('user');
      let parsedUser: any = null;
      if (userJson) {
        try {
          parsedUser = JSON.parse(userJson);
        } catch (e) {
          // Manejo explícito del error de parseo: registrar el error y eliminar la entrada corrupta
          console.error('Failed to parse session user JSON:', e);
          parsedUser = null;
          // Evitar futuros errores por el mismo valor corrupto
          try {
            sessionStorage.removeItem('user');
          } catch (error_) {
            console.error('Failed to remove corrupt session user key:', error_);
          }
        }
      }
      this.userName = parsedUser?.alias || 'Gestor';
      //Ahora obtenemos el tipo contenido video o audio
      this.gestorType = parsedUser?.tipocontenidovideooaudio || 'audio';
    }
  }

  loadDashboardStats() {
    // Para el Sprint #1, todavia no necesitamos cargar estadísticas reales
    // Solo inicializamos los valores por defecto

    // TODO en sprint #2 implementar carga real de estadísticas
    this.stats = {
      totalContent: 0,
      audioCount: 0,
      videoCount: 0,
      recentUploads: []
    };
    this.isLoading = false;
  }


  // Navegación a páginas de subida
  navigateToUpload() {
    if (this.gestorType === 'video') {
      this.router.navigate(['/video/subir']);
    } else {
      this.router.navigate(['/audio/subir']);
    }
  }


  // Mostrar/ocultar el componente de gestión de listas (como tab)
  toggleGestionListas(): void {
    this.mostrarGestionListas = !this.mostrarGestionListas;
    
    if (this.mostrarGestionListas) {
      this.forceReloadListasGestor = Math.random();
    }
  }

  /**
   * Abre el modal para crear una nueva lista
   */
  openCrearListaModal(): void {
    this.showCrearModal = true;
    if (this.isBrowser) {
      document.body.classList.add('no-scroll');
    }
  }

  /**
   * Cierra el modal de crear lista
   * @param success - Si la lista se creó exitosamente
   */
  closeCrearListaModal(success?: boolean): void {
    this.showCrearModal = false;
    if (this.isBrowser) {
      document.body.classList.remove('no-scroll');
    }
    
    if (success) {
      // Refrescar la lista de listas
      this.forceReloadListasGestor = Math.random();
      
      // Mostrar toast de éxito
      this.showToast('Lista creada correctamente');
    }
  }

  /**
   * Muestra un toast de notificación
   * @param message - Mensaje a mostrar
   */
  private showToast(message: string): void {
    // Implementación simple de toast - se puede mejorar más tarde
    if (this.isBrowser) {
      const toast = document.createElement('div');
      toast.className = 'toast-message';
      toast.textContent = message;
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(34, 197, 94, 0.9);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
      `;
      
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => document.body.removeChild(toast), 300);
      }, 3000);
    }
  }

  /**
   * Escucha clics en el documento para cerrar modales cuando se hace clic fuera
   */
  onDocumentClick(event: Event): void {
    // Esta función puede expandirse si necesitamos cerrar modales con clicks externos
    // Por ahora no es necesario para el modal de crear lista ya que tiene backdrop
  }

  /**
   * Escucha la tecla Escape para cerrar el modal
   */
  onEscapeKey(): void {
    if (this.showCrearModal) {
      this.closeCrearListaModal();
    }
  }

  // Cerrar sesión
  logout() {
    // borrar usuario completo, token y metadatos de sesión, limpiar estado y redirigir
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('email');
      sessionStorage.removeItem('currentUserClass');

      // Limpiar estado local
      this.userName = '';

      // Mostrar mensaje breve (puede usarse en template si se quiere mostrar)
      this.successMessage = 'Sesión cerrada';

      // Redirigir al home después de un pequeño retardo para permitir ver el mensaje
      setTimeout(() => {
        this.router.navigate(['/home']);
      }, 1350);
    }
  }
}