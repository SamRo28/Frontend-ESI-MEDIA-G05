import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
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

  // Tags predefinidos para video
  availableVideoTags = [
    { value: 'cocina', label: 'Cocina' },
    { value: 'programacion', label: 'Programación' },
    { value: 'videojuegos', label: 'Videojuegos' },
    { value: 'musica', label: 'Música' },
    { value: 'educativo', label: 'Educativo' },
    { value: 'tutorial', label: 'Tutorial' },
    { value: 'entretenimiento', label: 'Entretenimiento' },
    { value: 'deportes', label: 'Deportes' },
    { value: 'tecnologia', label: 'Tecnología' },
    { value: 'arte', label: 'Arte y Diseño' },
    { value: 'viajes', label: 'Viajes' },
    { value: 'salud', label: 'Salud y Fitness' },
    { value: 'comedia', label: 'Comedia' },
    { value: 'documentales', label: 'Documentales' },
    { value: 'noticias', label: 'Noticias' }
  ];
  
  selectedTags: string[] = [];

  constructor(
    private fb: FormBuilder,
    private contentService: ContentService,
    private router: Router
  ) {
    this.videoForm = this.fb.group({
      titulo: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      descripcion: ['', [Validators.maxLength(500)]],
      tags: ['', [Validators.required]],
      minutos: ['', [Validators.required, Validators.min(0), Validators.max(240)]],
      segundos: ['', [Validators.required, Validators.min(0), Validators.max(59)]],
      vip: [false, [Validators.required]],
      edadVisualizacion: ['', [Validators.required]],
      fechaDisponibleHasta: [''],
      visible: [true, [Validators.required]],
      url: ['', [Validators.required, Validators.pattern(/^(https?):\/\/[\w\-]+(\.[\w\-]+)+[/#?]?.*$/)]],
      resolucion: ['', [Validators.required]],
      caratula: ['']
    });
  }

  // Métodos para manejar selección múltiple de tags
  toggleTag(tagValue: string) {
    const index = this.selectedTags.indexOf(tagValue);
    if (index > -1) {
      this.selectedTags.splice(index, 1);
    } else {
      this.selectedTags.push(tagValue);
    }
    
    // Actualizar el formulario
    this.videoForm.patchValue({ tags: this.selectedTags.join(',') });
  }

  isTagSelected(tagValue: string): boolean {
    return this.selectedTags.includes(tagValue);
  }

  getSelectedTagsText(): string {
    if (this.selectedTags.length === 0) return '';
    return this.selectedTags.map(tag => {
      const tagObj = this.availableVideoTags.find(t => t.value === tag);
      return tagObj ? tagObj.label : tag;
    }).join(', ');
  }

  onSubmit() {
    if (this.videoForm.valid) {
      this.isUploading = true;
      this.uploadMessage = '';

      // Usar selectedTags directamente (ya están como array)
      const tagsArray = this.selectedTags.length > 0 ? this.selectedTags : [];

      // Convertir minutos y segundos a total de minutos (decimal)
      const totalMinutos = Number(this.videoForm.value.minutos) + (Number(this.videoForm.value.segundos) / 60);

      const videoData: VideoUploadData = {
        titulo: this.videoForm.value.titulo,
        descripcion: this.videoForm.value.descripcion || undefined,
        tags: tagsArray,
        duracion: totalMinutos, // Ahora se pasa en minutos
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

  // Calcular progreso del formulario para feedback visual
  getFormProgress(): number {
    const requiredFields = ['titulo', 'url', 'minutos', 'segundos', 'resolucion', 'edadVisualizacion'];
    const completedFields = requiredFields.filter(field => {
      const control = this.videoForm.get(field);
      return control && control.valid && control.value !== '';
    });
    
    // Agregar tags como requerido
    const tagsComplete = this.selectedTags.length > 0;
    const totalRequired = requiredFields.length + 1; // +1 for tags
    const totalCompleted = completedFields.length + (tagsComplete ? 1 : 0);
    
    return Math.round((totalCompleted / totalRequired) * 100);
  }

  // Verificar si un campo específico está completo
  isFieldComplete(fieldName: string): boolean {
    if (fieldName === 'tags') {
      return this.selectedTags.length > 0;
    }
    const field = this.videoForm.get(fieldName);
    return field ? field.valid && field.value !== '' : false;
  }

  // Obtener mensaje de ayuda para campos
  getFieldHelpMessage(fieldName: string): string {
    const field = this.videoForm.get(fieldName);
    if (!field) return '';

    switch (fieldName) {
      case 'titulo':
        if (!field.value) return 'Escribe un título descriptivo para tu video';
        if (field.value.length < 2) return 'El título necesita al menos 2 caracteres';
        return '✓ Título válido';
      
      case 'url':
        if (!field.value) return 'Proporciona la URL del video (YouTube, Vimeo, etc.)';
        if (field.errors?.['pattern']) return 'URL debe comenzar con http:// o https://';
        return '✓ URL válida';
      
      case 'tags':
        if (this.selectedTags.length === 0) return 'Selecciona al menos 1 tag para categorizar tu video';
        if (this.selectedTags.length === 1) return `✓ 1 tag seleccionado: ${this.getSelectedTagsText()}`;
        return `✓ ${this.selectedTags.length} tags seleccionados: ${this.getSelectedTagsText()}`;
      
      case 'resolucion':
        if (!field.value) return 'Selecciona la resolución del video';
        return `✓ Resolución: ${field.value}`;
      
      case 'edadVisualizacion':
        if (!field.value) return 'Selecciona la edad mínima apropiada';
        const edadLabels: { [key: string]: string } = {
          '0': 'Todo público',
          '3': 'Niños 3+',
          '7': 'Niños 7+',
          '12': 'Adolescentes 12+',
          '16': 'Jóvenes 16+',
          '18': 'Solo adultos'
        };
        return `✓ ${edadLabels[field.value] || 'Edad configurada'}`;
      
      default:
        return '';
    }
  }

  // Mensaje de ayuda específico para duración
  getDurationHelpMessage(): string {
    const minutos = this.videoForm.get('minutos')?.value || 0;
    const segundos = this.videoForm.get('segundos')?.value || 0;
    
    if (minutos === '' && segundos === '') {
      return 'Especifica la duración de tu video (máximo 4 horas)';
    }
    
    if (minutos === '' || segundos === '') {
      return 'Completa tanto minutos como segundos';
    }
    
    const totalMinutos = Number(minutos);
    const totalSegundos = Number(segundos);
    
    if (totalMinutos === 0 && totalSegundos === 0) {
      return 'La duración debe ser mayor a 0';
    }
    
    if (totalMinutos > 240) {
      return 'La duración máxima es 4 horas (240 minutos)';
    }
    
    if (totalSegundos > 59) {
      return 'Los segundos no pueden ser mayor a 59';
    }
    
    return `✓ Duración: ${totalMinutos}m ${totalSegundos}s`;
  }
}