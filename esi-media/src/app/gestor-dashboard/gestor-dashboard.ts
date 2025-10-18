import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  gestorType: 'audio' | 'video' | 'admin' = 'audio'; // Por defecto audio
  userName = '';

  constructor(
    private readonly contentService: ContentService,
    private readonly router: Router
  ) {}

  ngOnInit() {
    this.loadUserInfo();
    this.loadDashboardStats();
  }

  loadUserInfo() {
    // Obtener información del usuario del sessionStorage
    const userType = sessionStorage.getItem('currentUserClass');
    const email = sessionStorage.getItem('email');
    
    if (email) {
      // Extraer el nombre del email (antes del @)
      this.userName = email.split('@')[0] || 'Gestor';
    } else {
      this.userName = 'Gestor';
    }
    
    // Determinar el tipo de gestor basado en la información de sesión
    if (userType === 'gestor_de_contenido') {
      this.gestorType = 'audio'; // Por defecto, pero se puede extender
    } else if (userType === 'admin') {
      this.gestorType = 'admin';
    } else {
      this.gestorType = 'audio';
    }
  }

  loadDashboardStats() {
    // Para el Sprint #1, no necesitamos cargar estadísticas reales
    // Solo inicializamos los valores por defecto
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
    // Por ahora, para el mockup, iremos por defecto a audio
    // En el futuro esto se determinará por el tipo de gestor
    if (this.gestorType === 'video') {
      this.router.navigate(['/video/subir']);
    } else {
      // Por defecto audio
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
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('email');
    sessionStorage.removeItem('currentUserClass');
    this.router.navigate(['/login']);
  }

  // Ir al home
  goToHome() {
    this.router.navigate(['/home']);
  }
}