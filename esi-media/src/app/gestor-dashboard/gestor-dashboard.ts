import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { ContentService } from '../services/content.service';

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
  imports: [CommonModule],
  templateUrl: './gestor-dashboard.html',
  styleUrl: './gestor-dashboard.css'
})
export class GestorDashboardComponent implements OnInit {
  
  stats: DashboardStats = {
    totalContent: 0,
    audioCount: 0,
    videoCount: 0,
    recentUploads: []
  };
  
  isLoading = true;
  gestorType: 'audio' | 'video' = 'audio'; // Por defecto audio, solo para pruebas
  userName = '';
  // Mensajes para mostrar retroalimentación en la UI (p.ej. 'Sesión cerrada')
  successMessage = '';

  constructor(
    private readonly contentService: ContentService,
    private readonly router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    this.loadUserInfo();
    this.loadDashboardStats();
  }

  loadUserInfo() {
    // Solo acceder a sessionStorage en el navegador
    if (isPlatformBrowser(this.platformId)) {
      // Obtenemos el tipo de usuario desde sessionStorage para validar que es gestor realmente
      const userType = sessionStorage.getItem('currentUserClass');
      // Obtener el resto de información del usuario del sessionStorage
      const userJson = sessionStorage.getItem('user');
        let parsedUser: any = null;
        if (userJson) {
          try { parsedUser = JSON.parse(userJson); } catch (e) { parsedUser = null; }
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

  navigateToAudioUpload() {
    this.router.navigate(['/audio/subir']);
  }

  navigateToVideoUpload() {
    this.router.navigate(['/video/subir']);
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
      // Renovamos isLoading/flags si es necesario

      // Redirigir al home después de un pequeño retardo para permitir ver el mensaje
      setTimeout(() => {
        this.router.navigate(['/home']);
      }, 1350);
    }
  }


// TODO: Analizar si esto se puede eliminar ya sin problemas, porque este boton ya no existe en la interfaz

  // Ir al home
  goToHome() {
    this.router.navigate(['/home']);
  }
}