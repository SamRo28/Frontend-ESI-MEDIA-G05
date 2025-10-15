import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ContentService, AudioUploadData, UploadResponse } from '../services/content.service';

@Component({
  selector: 'app-audio-upload',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './audio-upload.component.html',
  styleUrl: './audio-upload.component.css'
})
export class AudioUploadComponent {
  audioForm: FormGroup;
  selectedFile: File | null = null;
  isUploading = false;
  uploadMessage = '';

  constructor(
    private fb: FormBuilder,
    private contentService: ContentService,
    private router: Router
  ) {
    this.audioForm = this.fb.group({
      titulo: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      descripcion: ['', [Validators.maxLength(500)]],
      tags: ['', [Validators.required]],
      duracion: ['', [Validators.required, Validators.min(0.1), Validators.max(600)]],
      vip: [false, [Validators.required]],
      edadVisualizacion: [0, [Validators.required, Validators.min(0), Validators.max(18)]],
      fechaDisponibleHasta: [''],
      visible: [true, [Validators.required]],
      archivo: [null, [Validators.required]],
      caratula: ['']
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Validar tipo de archivo
      if (!file.type.includes('audio/mpeg') && !file.type.includes('audio/mp3')) {
        this.uploadMessage = 'Error: Solo se permiten archivos MP3';
        return;
      }
      
      // Validar tamaño (2MB máximo)
      if (file.size > 2 * 1024 * 1024) {
        this.uploadMessage = 'Error: El archivo excede el tamaño máximo de 2MB';
        return;
      }
      
      // Validar extensión
      if (!file.name.toLowerCase().endsWith('.mp3')) {
        this.uploadMessage = 'Error: El archivo debe tener extensión .mp3';
        return;
      }

      this.selectedFile = file;
      this.audioForm.patchValue({ archivo: file });
      this.uploadMessage = '';
    }
  }

  onSubmit() {
    if (this.audioForm.valid && this.selectedFile) {
      this.isUploading = true;
      this.uploadMessage = '';

      // Convertir tags de string a array
      const tagsArray = this.audioForm.value.tags
        .split(',')
        .map((tag: string) => tag.trim())
        .filter((tag: string) => tag.length > 0);

      const audioData: AudioUploadData = {
        titulo: this.audioForm.value.titulo,
        descripcion: this.audioForm.value.descripcion || undefined,
        tags: tagsArray,
        duracion: Number(this.audioForm.value.duracion),
        vip: this.audioForm.value.vip,
        edadVisualizacion: Number(this.audioForm.value.edadVisualizacion),
        fechaDisponibleHasta: this.audioForm.value.fechaDisponibleHasta 
          ? new Date(this.audioForm.value.fechaDisponibleHasta) 
          : undefined,
        visible: this.audioForm.value.visible,
        archivo: this.selectedFile,
        caratula: this.audioForm.value.caratula || undefined
      };

      this.contentService.uploadAudio(audioData).subscribe({
        next: (response: UploadResponse) => {
          this.isUploading = false;
          if (response.success) {
            this.uploadMessage = `✅ ${response.message}`;
            // Opcional: redirigir después de unos segundos
            setTimeout(() => {
              this.router.navigate(['/home']);
            }, 2000);
          } else {
            this.uploadMessage = `❌ ${response.message}`;
          }
        },
        error: (error: any) => {
          this.isUploading = false;
          this.uploadMessage = `❌ Error: ${error.error?.message || 'Error interno del servidor'}`;
          console.error('Error uploading audio:', error);
        }
      });
    } else {
      this.uploadMessage = '❌ Por favor, completa todos los campos obligatorios correctamente';
    }
  }

  // Helper methods para mostrar errores
  getFieldError(fieldName: string): string {
    const field = this.audioForm.get(fieldName);
    if (field && field.touched && field.errors) {
      const errors = field.errors;
      if (errors['required']) return `${fieldName} es obligatorio`;
      if (errors['minlength']) return `${fieldName} debe tener al menos ${errors['minlength'].requiredLength} caracteres`;
      if (errors['maxlength']) return `${fieldName} no puede exceder ${errors['maxlength'].requiredLength} caracteres`;
      if (errors['min']) return `${fieldName} debe ser mayor a ${errors['min'].min}`;
      if (errors['max']) return `${fieldName} no puede ser mayor a ${errors['max'].max}`;
    }
    return '';
  }
}