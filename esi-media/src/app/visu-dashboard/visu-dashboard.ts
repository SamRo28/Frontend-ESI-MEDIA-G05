import { Component, OnInit, AfterViewInit, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { Router, NavigationEnd, RouterLink, RouterLinkActive, RouterModule, ActivatedRoute } from '@angular/router';
import { MultimediaService, ContenidoResumenDTO } from '../services/multimedia.service';
import { UserService } from '../services/userService';
import { FavoritesService } from '../services/favorites.service';
import { GestionListasComponent } from '../gestion-listas/gestion-listas';
import { MultimediaListComponent } from '../multimedia-list/multimedia-list';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ListasPrivadas } from '../listas-privadas/listas-privadas';
import { CrearListaComponent } from '../crear-lista/crear-lista';
import { PerfilVisualizadorComponent } from '../perfil-visualizador/perfil-visualizador';
import { ContentFilterComponent } from '../shared/content-filter/content-filter.component';
import { finalize } from 'rxjs/operators';

interface Star {
  left: number;
  top: number;
  delay: number;
}

@Component({
  selector: 'app-visu-dashboard',
  standalone: true,

  imports: [CommonModule, RouterLink, RouterLinkActive, RouterModule, ListasPrivadas, CrearListaComponent, GestionListasComponent, MultimediaListComponent, ContentFilterComponent, PerfilVisualizadorComponent],

  templateUrl: './visu-dashboard.html',
  styleUrl: './visu-dashboard.css'
})
export class VisuDashboard implements OnInit, AfterViewInit, OnDestroy {
  stars: Star[] = [];
  mostrarListasPrivadas = false;
  mostrarListasPublicas = false;
  filtroTipo: 'AUDIO' | 'VIDEO' | null = null;
  showUserMenu = false;
  currentUser: any = null;
  userName: string = 'Usuario';
  userInitial: string = 'U';
  isGestor: boolean = false;
  forceReloadListas: number = 0;
  forceReloadListasPublicas: number = 0;
  showCrearModal: boolean = false;
  showCuentaModal: boolean = false;
  mostrarFavoritos: boolean = false;
  favoritos: ContenidoResumenDTO[] = [];
  favoritosLoading = false;
  activeSection: 'inicio' | 'videos' | 'audios' | 'listas' | 'favoritos' = 'inicio';
  
  // Variables para el sistema de filtrado
  currentTagFilters: string[] = [];
  currentFiltersObject: any = null;

  private isBrowser: boolean;
  private documentClickHandler = (event: Event) => this.onDocumentClick(event);
  private escapeKeyHandler = (event: KeyboardEvent) => { if ((event as KeyboardEvent).key === 'Escape') this.onEscapeKey(); };


  private multimedia = inject(MultimediaService);
  private userService = inject(UserService);
  private favoritesService = inject(FavoritesService);
  constructor(private router: Router, private route: ActivatedRoute) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }
  private platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    // Generación de estrellas si por cualquier motivo se queda en esta vista (fallback)
    this.generateStars();
    // Detectar ruta para ajustar filtro de contenido
    this.router.events.subscribe(evt => {
      if (evt instanceof NavigationEnd) {
        if (this.mostrarFavoritos) {
          this.mostrarFavoritos = false;
        }
        const url = evt.urlAfterRedirects || evt.url;
        if (url.includes('/dashboard/videos')) {
          this.filtroTipo = 'VIDEO';
          this.mostrarListasPublicas = false;
          this.activeSection = 'videos';
        } else if (url.includes('/dashboard/audios')) {
          this.filtroTipo = 'AUDIO';
          this.mostrarListasPublicas = false;
          this.activeSection = 'audios';
        } else if (url.includes('/dashboard/listas-publicas')) {
          this.mostrarListasPublicas = true;
          this.filtroTipo = null;
          this.forceReloadListasPublicas = Math.random();
          this.activeSection = 'listas';
        } else {
          this.filtroTipo = null; // mostrar ambos
          this.mostrarListasPublicas = false;
          this.activeSection = 'inicio';
        }
      }
    });
    this.route.queryParams.subscribe(params => {
      const section = params?.['section'];
      if (section === 'favoritos') {
        this.activateFavoritesView();
      }
    });
    // Inicial rápido
    const initUrl = this.router.url || '';
    if (initUrl.includes('/dashboard/videos')) {
      this.filtroTipo = 'VIDEO';
      this.mostrarListasPublicas = false;
      this.activeSection = 'videos';
    } else if (initUrl.includes('/dashboard/audios')) {
      this.filtroTipo = 'AUDIO';
      this.mostrarListasPublicas = false;
      this.activeSection = 'audios';
    } else if (initUrl.includes('/dashboard/listas-publicas')) {
      this.mostrarListasPublicas = true;
      this.filtroTipo = null;
      this.forceReloadListasPublicas = Math.random();
      this.activeSection = 'listas';
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
    }
    // Solo en navegador: cargar datos y registrar listeners
    if (this.isBrowser) {
      this.loadUserData();
      try {
        document.addEventListener('click', this.documentClickHandler);
        document.addEventListener('keydown', this.escapeKeyHandler as any);
      } catch (e) {
        // defensivo: si document no existe, no hacer nada
      }
    }
    if (isPlatformBrowser(this.platformId)) {
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



  generateStars(): void {
    // Generar 50 estrellas con posiciones aleatorias
    for (let i = 0; i < 50; i++) {
      this.stars.push({
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 3
      });
    }
  }

  /**
   * Muestra u oculta el panel de listas privadas del visualizador
   * También controla el bloqueo del scroll del body
   */
  toggleListasPrivadas(): void {
    this.mostrarListasPrivadas = !this.mostrarListasPrivadas;
    this.closeUserMenu();
    
    if (this.mostrarListasPrivadas) {
      this.forceReloadListas = Math.random();
    }
    
    if (this.isBrowser) {
      if (this.mostrarListasPrivadas) {
        document.body.classList.add('no-scroll');
      } else {
        document.body.classList.remove('no-scroll');
      }
    }
  }



  /**
   * Navega a la página de gestión de listas usando el router
   */
  navigateToGestionListas(): void {
    this.closeUserMenu();
    this.router.navigate(['/dashboard/listas']);
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
      // Refrescar la lista de listas privadas
      this.forceReloadListas = Math.random();
      
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

  loadUserData(): void {
    if (!this.isBrowser) {
      this.setDefaultUserData();
      return;
    }

    const userStr = sessionStorage.getItem('user');
      if (userStr) {
        try {
        this.currentUser = JSON.parse(userStr);
        this.updateUserDisplayData();
      } catch (error) {
        console.error('Error parsing user data:', error);
        this.currentUser = null;
        this.setDefaultUserData();
      }
    } else {
      this.setDefaultUserData();
    }
    this.refreshFavorites();
  }

  toggleFavoritosView(): void {
    if (this.mostrarFavoritos) {
      this.mostrarFavoritos = false;
      this.activeSection = 'inicio';
      return;
    }
    this.activateFavoritesView();
  }

  private activateFavoritesView(): void {
    this.mostrarFavoritos = true;
    this.activeSection = 'favoritos';
    this.mostrarListasPublicas = false;
    this.mostrarListasPrivadas = false;
    this.filtroTipo = null;
    this.currentTagFilters = [];
    this.currentFiltersObject = null;
    this.refreshFavorites();
  }

  handleNavSelect(section: 'inicio' | 'videos' | 'audios' | 'listas'): void {
    if (this.mostrarFavoritos) {
      this.mostrarFavoritos = false;
    }
    this.activeSection = section;
  }

  private refreshFavorites(): void {
    if (!this.isBrowser) {
      return;
    }
    this.favoritosLoading = true;
    this.favoritesService.list()
      .pipe(finalize(() => this.favoritosLoading = false))
      .subscribe({
        next: list => { this.favoritos = Array.isArray(list) ? list : []; },
        error: err => {
          console.error('Error al cargar favoritos', err);
          this.favoritos = [];
        }
      });
  }

  private updateUserDisplayData(): void {
    if (this.currentUser) {
      // Actualizar userName según la especificación: nombre o username
      this.userName = this.currentUser.nombre || this.currentUser.username || 'Usuario';
      
      // Actualizar userInitial: primera letra del userName
      this.userInitial = this.userName.charAt(0).toUpperCase();
      
      // Determinar si es gestor desde sessionStorage (solo en navegador)
      if (this.isBrowser) {
        const currentUserClass = sessionStorage.getItem('currentUserClass');
        this.isGestor = currentUserClass === 'Gestor';
      } else {
        this.isGestor = false;
      }
    }
  }

  private setDefaultUserData(): void {
    this.userName = 'Usuario';
    this.userInitial = 'U';
    this.isGestor = false;
  }

  getUserName(): string {
    return this.userName;
  }

  getUserInitial(): string {
    return this.userInitial;
  }

  /**
   * Obtiene las clases CSS para el avatar del usuario basadas en el tipo de usuario
   */
  getAvatarClasses(): string {
    return this.isGestor ? 'user-avatar gestor' : 'user-avatar visualizador';
  }

  /**
   * Abre o cierra el menú desplegable del usuario
   */
  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  /**
   * Maneja eventos de teclado para el perfil de usuario
   */
  onUserProfileKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleUserMenu();
    }
    if (event.key === 'Escape' && this.showUserMenu) {
      event.preventDefault();
      this.closeUserMenu();
    }
  }

  /**
   * Cierra el menú desplegable del usuario
   */
  closeUserMenu(): void {
    this.showUserMenu = false;
  }

  /**
   * Escucha clics en el documento para cerrar el menú cuando se hace clic fuera
   * Excluye clics en botones de notificaciones y elementos del menú
   */
  onDocumentClick(event: Event): void {
    if (!this.isBrowser) return;
    const target = event.target as HTMLElement;
    // Ignorar clics dentro del panel de filtros para evitar interferir con su comportamiento
    const insideFilter = target.closest('.filter-panel') || target.closest('.filter-backdrop') || target.closest('.filter-container');
    if (insideFilter) return;
    
    // Verificar si el clic fue en el área del perfil de usuario o el dropdown
    const userProfile = target.closest('.user-profile');
    const userDropdown = target.closest('.user-dropdown');
    
    // Verificar si el clic fue en el botón de notificaciones (para no interferir)
    const notificationBtn = target.closest('.notification-btn');
    
    // Si el clic no fue en el perfil, dropdown o botón de notificaciones, cerrar el menú
    if (!userProfile && !userDropdown && !notificationBtn && this.showUserMenu) {
      this.closeUserMenu();
    }
  }

  /**
   * Escucha la tecla Escape para cerrar el menú, el panel o el modal
   */
  onEscapeKey(): void {
    if (this.showCrearModal) {
      this.closeCrearListaModal();
    } else if (this.showCuentaModal) {
      this.closeCuentaModal();
    } else if (this.mostrarListasPrivadas) {
      this.toggleListasPrivadas();
    } else if (this.showUserMenu) {
      this.closeUserMenu();
    }
  }



  /** Abre la ventana de Cuenta (modal) */
  openCuentaModal(): void {
    this.showCuentaModal = true;
    this.closeUserMenu();
    if (this.isBrowser) {
      document.body.classList.add('no-scroll');
    }
  }

  /** Cierra la ventana de Cuenta */
  closeCuentaModal(): void {
    this.showCuentaModal = false;
    if (this.isBrowser) {
      document.body.classList.remove('no-scroll');
    }
  }

  /**
   * Inicia el proceso de eliminación de la cuenta del usuario.
   * Muestra una confirmación antes de proceder.
   */
  handleDeleteAccount(): void {
    if (!this.isBrowser) return;

    const confirmation = window.confirm(
      '¿Estás seguro de que quieres eliminar tu cuenta? Esta acción es irreversible. ' +
      'Se eliminarán tus datos personales, pero el contenido que hayas creado permanecerá en la plataforma.'
    );

    if (confirmation) {
      this.userService.deleteMyAccount().subscribe({
        next: () => {
          this.showToast('Tu cuenta ha sido eliminada.');
          // Forzar logout y redirección
          setTimeout(() => this.logout(), 1500);
        },
        error: (err: any) => {
          console.error('Error al eliminar la cuenta:', err);
          const message = err?.error?.mensaje || 'No se pudo eliminar la cuenta. Inténtalo de nuevo más tarde.';
          // Usar alert para errores críticos
          alert(`Error: ${message}`);
        }
      });
    }
  }



  logout(): void {
    // Llamar al servicio de logout para invalidar la cookie en el backend
    this.userService.logout().subscribe({
      next: () => {
        try {
          // Limpiar información del usuario en sessionStorage
          sessionStorage.removeItem('user');
          sessionStorage.removeItem('currentUserClass');
          sessionStorage.removeItem('email');
        } catch {}
        this.multimedia.clearCache();
        this.router.navigate(['/home']);
      },
      error: (err) => {
        console.error('Error al cerrar sesión:', err);
        alert('Error al cerrar sesión');
      }
    });
  }

  /**
   * Maneja la aplicación de filtros de tags desde el componente de filtro
   */
  onFiltersApplied(selectedTags: string[]): void {
    // El componente de filtro emite string[] con tags
    this.currentTagFilters = Array.isArray(selectedTags) ? [...selectedTags] : [];
  }

  /**
   * Maneja el objeto completo de filtros emitido por el componente de filtro
   */
  onFiltersChanged(filters: any): void {
    if (!filters) return;
    // Guardar objeto completo para futuras integraciones
    this.currentFiltersObject = filters;
    // Actualizar tagFilters para la lista
    this.currentTagFilters = Array.isArray(filters.tags) ? [...filters.tags] : [];
    // Asegurar que Angular evalúe los cambios inmediatamente
    try { (window as any).requestAnimationFrame(() => {}); } catch(e) {}
  }

  /**
   * Obtiene el tipo de contenido para el componente de filtro según la ruta actual
   */
  get contentFilterType(): 'all' | 'video' | 'audio' {
    if (this.filtroTipo === 'VIDEO') return 'video';
    if (this.filtroTipo === 'AUDIO') return 'audio';
    return 'all';
  }
}
