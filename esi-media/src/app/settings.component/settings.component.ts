import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class SettingsComponent {
  // Configuraciones del sistema
  systemSettings = {
    siteName: 'ESIMedia',
    maintenanceMode: false,
    allowRegistrations: true,
    maxUploadSize: 100, // MB
    sessionTimeout: 30, // minutos
    emailNotifications: true,
    twoFactorAuth: false
  };

  // Configuraciones de contenido
  contentSettings = {
    autoApproveContent: false,
    defaultContentVisibility: true,
    maxVideoDuration: 120, // minutos
    maxAudioDuration: 180, // minutos
    allowedVideoFormats: ['mp4', 'avi', 'mkv'],
    allowedAudioFormats: ['mp3', 'wav', 'flac']
  };

  // Configuraciones de usuario
  userSettings = {
    defaultUserRole: 'Visualizador',
    passwordMinLength: 8,
    passwordRequireSpecialChar: true,
    passwordRequireNumber: true,
    passwordRequireUppercase: true,
    accountLockoutAttempts: 5,
    accountLockoutDuration: 15 // minutos
  };

  successMessage = '';
  errorMessage = '';

  saveSettings() {
    try {
      // Aquí iría la lógica para guardar en el backend
      console.log('Guardando configuraciones:', {
        system: this.systemSettings,
        content: this.contentSettings,
        user: this.userSettings
      });

      this.successMessage = 'Configuraciones guardadas correctamente';
      
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
    } catch (error) {
      this.errorMessage = 'Error al guardar las configuraciones';
      
      setTimeout(() => {
        this.errorMessage = '';
      }, 3000);
    }
  }

  resetToDefaults() {
    if (confirm('¿Estás seguro de que quieres restaurar la configuración predeterminada? Esta acción no se puede deshacer.')) {
      // Restaurar valores predeterminados
      this.systemSettings = {
        siteName: 'ESIMedia',
        maintenanceMode: false,
        allowRegistrations: true,
        maxUploadSize: 100,
        sessionTimeout: 30,
        emailNotifications: true,
        twoFactorAuth: false
      };

      this.contentSettings = {
        autoApproveContent: false,
        defaultContentVisibility: true,
        maxVideoDuration: 120,
        maxAudioDuration: 180,
        allowedVideoFormats: ['mp4', 'avi', 'mkv'],
        allowedAudioFormats: ['mp3', 'wav', 'flac']
      };

      this.userSettings = {
        defaultUserRole: 'Visualizador',
        passwordMinLength: 8,
        passwordRequireSpecialChar: true,
        passwordRequireNumber: true,
        passwordRequireUppercase: true,
        accountLockoutAttempts: 5,
        accountLockoutDuration: 15
      };

      this.successMessage = 'Configuraciones restauradas a valores predeterminados';
      
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
    }
  }
}
