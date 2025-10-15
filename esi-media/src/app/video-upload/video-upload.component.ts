import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ContentService, VideoUploadData, UploadResponse } from '../services/content.service';

@Component({
  selector: 'app-video-upload',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './video-upload.component.html',
  styleUrl: './video-upload.component.css'
})
export class VideoUploadComponent {
  videoForm: FormGroup;
  isUploading = false;
  uploadMessage = '';

  constructor(
    private fb: FormBuilder,
    private contentService: ContentService,
    private router: Router
  ) {
    this.videoForm = this.fb.group({
      titulo: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      descripcion: ['', [Validators.maxLength(500)]],
      tags: ['', [Validators.required]],
      duracion: ['', [Validators.required, Validators.min(0.1), Validators.max(14400)]],
      vip: [false, [Validators.required]],
      edadVisualizacion: [0, [Validators.required, Validators.min(0), Validators.max(18)]],
      fechaDisponibleHasta: [''],
      visible: [true, [Validators.required]],
      url: ['', [Validators.required, Validators.pattern(/^(https?):\/\/[\w\-]+(\.[\w\-]+)+[/#?]?.*$/)]],
      resolucion: ['', [Validators.required, Validators.maxLength(50)]],
      caratula: ['']
    });
  }

  onSubmit() {
    if (this.videoForm.valid) {
      this.isUploading = true;
      this.uploadMessage = '';

      // Convertir tags de string a array
      const tagsArray = this.videoForm.value.tags
        .split(',')
        .map((tag: string) => tag.trim())
        .filter((tag: string) => tag.length > 0);

      const videoData: VideoUploadData = {
        titulo: this.videoForm.value.titulo,
        descripcion: this.videoForm.value.descripcion || undefined,
        tags: tagsArray,
        duracion: Number(this.videoForm.value.duracion),
        vip: this.videoForm.value.vip,
        edadVisualizacion: Number(this.videoForm.value.edadVisualizacion),
        fechaDisponibleHasta: this.videoForm.value.fechaDisponibleHasta 
          ? new Date(this.videoForm.value.fechaDisponibleHasta) 
          : undefined,
        visible: this.videoForm.value.visible,
        url: this.videoForm.value.url,
        resolucion: this.videoForm.value.resolucion,
        caratula: this.videoForm.value.caratula || undefined
      };

      this.contentService.uploadVideo(videoData).subscribe({
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
          console.error('Error uploading video:', error);
        }
      });
    } else {
      this.uploadMessage = '❌ Por favor, completa todos los campos obligatorios correctamente';
    }
  }

  // Helper methods para mostrar errores
  getFieldError(fieldName: string): string {
    const field = this.videoForm.get(fieldName);
    if (field && field.touched && field.errors) {
      const errors = field.errors;
      if (errors['required']) return `${fieldName} es obligatorio`;
      if (errors['minlength']) return `${fieldName} debe tener al menos ${errors['minlength'].requiredLength} caracteres`;
      if (errors['maxlength']) return `${fieldName} no puede exceder ${errors['maxlength'].requiredLength} caracteres`;
      if (errors['min']) return `${fieldName} debe ser mayor a ${errors['min'].min}`;
      if (errors['max']) return `${fieldName} no puede ser mayor a ${errors['max'].max}`;
      if (errors['pattern']) return `${fieldName} debe tener un formato válido (http/https)`;
    }
    return '';
  }
}