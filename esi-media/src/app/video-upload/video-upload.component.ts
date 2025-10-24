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
  uploadSuccess = false;
  showUploadConfirmation = false;

  // Tags predefinidos para videos
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
      url: ['', [Validators.required, Validators.pattern(/^https?:\/\/[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*(?:[/#?].*)?$/)]],
      resolucion: ['', [Validators.required]],
      caratula: ['']
    });

    // Validación inteligente de duración: si minutos = 240, segundos debe ser 0
    this.videoForm.get('minutos')?.valueChanges.subscribe(minutos => {
      const segundosControl = this.videoForm.get('segundos');
      if (Number(minutos) === 240) {
        segundosControl?.setValue(0);
        segundosControl?.disable();
      } else {
        segundosControl?.enable();
      }
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
      // Mostrar modal de confirmación antes de subir
      this.showUploadConfirmation = true;
    }
  }

  // Método para cancelar la subida
  cancelUpload() {
    this.showUploadConfirmation = false;
  }

  // Método para confirmar y proceder con la subida
  confirmUpload() {
    this.showUploadConfirmation = false;
    this.isUploading = true;
    this.uploadSuccess = false;
    this.uploadMessage = 'Subiendo información del video...';
    
    const minutos = Number(this.videoForm.value.minutos) || 0;
    const segundos = Number(this.videoForm.value.segundos) || 0;
    const formValues = this.videoForm.value;

    // Bloquear formulario completo una vez se decide subir el video
    this.videoForm.disable();

      // Usar selectedTags directamente
      const tagsArray = this.selectedTags.length > 0 ? this.selectedTags : [];

      // Convertir minutos y segundos a total de segundos con validación
      const totalSegundos = (minutos * 60) + segundos;

      const videoData: VideoUploadData = {
        titulo: formValues.titulo,
        descripcion: formValues.descripcion || undefined,
        tags: tagsArray,
        duracion: totalSegundos > 0 ? totalSegundos : 1,
        vip: formValues.vip,
        edadVisualizacion: Number(formValues.edadVisualizacion),
        fechaDisponibleHasta: formValues.fechaDisponibleHasta && formValues.fechaDisponibleHasta.trim() !== ''
          ? new Date(formValues.fechaDisponibleHasta) 
          : undefined,
        visible: formValues.visible,
        url: formValues.url,
        resolucion: formValues.resolucion,
        caratula: formValues.caratula || undefined
      };

      this.contentService.uploadVideo(videoData).subscribe({
        next: (response: UploadResponse) => {
          this.isUploading = false;
          if (response.success) {
            this.uploadSuccess = true;
            this.uploadMessage = '¡Video subido exitosamente! 🎉';
          } else {
            this.uploadSuccess = false;
            this.uploadMessage = `❌ Error: ${response.message}`;
            this.videoForm.enable();
          }
        },
        error: (error: any) => {
          this.isUploading = false;
          this.uploadSuccess = false;
          this.videoForm.enable();
          console.error('Error uploading video:', error);
          
          // Manejo específico de errores HTTP según el backend
          if (error.status === 400) {
            // Error de validación
            this.uploadMessage = `❌ Error de validación: ${error.error?.message || 'Datos inválidos'}`;
          } else if (error.status === 401) {
            // Error de autenticación
            this.uploadMessage = '❌ No autorizado. Por favor, inicia sesión nuevamente.';
          } else if (error.status === 500) {
            // Error interno del servidor
            this.uploadMessage = '❌ Error interno del servidor. Inténtalo más tarde.';
          } else if (error.status === 0) {
            // Error de conexión
            this.uploadMessage = '❌ Error de conexión. Verifica tu conexión a internet.';
          } else {
            // Error genérico
            this.uploadMessage = `❌ Error: ${error.error?.message || 'Error inesperado'}`;
          }
        }
      });
  }

  // Método para volver al dashboard después del éxito
  backToDashboard() {
    this.router.navigate(['/gestor-dashboard']);
  }

  // Helper methods para mostrar errores
  getFieldError(fieldName: string): string {
    const field = this.videoForm.get(fieldName);
    if (field && field.touched && field.errors) {
      return this.getErrorMessage(fieldName, field.errors);
    }
    return '';
  }

  // Método auxiliar para reducir complejidad cognitiva
  private getErrorMessage(fieldName: string, errors: any): string {
    if (errors['required']) return `${fieldName} es obligatorio`;
    if (errors['minlength']) return `${fieldName} debe tener al menos ${errors['minlength'].requiredLength} caracteres`;
    if (errors['maxlength']) return `${fieldName} no puede exceder ${errors['maxlength'].requiredLength} caracteres`;
    if (errors['min']) return `${fieldName} debe ser mayor a ${errors['min'].min}`;
    if (errors['max']) return `${fieldName} no puede ser mayor a ${errors['max'].max}`;
    if (errors['pattern']) return `${fieldName} debe tener un formato válido (http/https)`;
    return '';
  }

  // Método para mostrar mensajes de ayuda solo cuando es apropiado
  shouldShowHelpMessage(fieldName: string): boolean {
    if (fieldName === 'duracion') {
      const minutosField = this.videoForm.get('minutos');
      const segundosField = this.videoForm.get('segundos');
      const hasError = this.getFieldError('minutos') || this.getFieldError('segundos');
      const hasTouched = !!(minutosField?.touched || segundosField?.touched);
      return !hasError && hasTouched;
    }
    
    const field = this.videoForm.get(fieldName);
    const hasError = this.getFieldError(fieldName);
    return !hasError && !!(field?.touched);
  }

  // Calcular barra de progreso del formulario para feedback visual
  getFormProgress(): number {
    const basicFields = ['titulo', 'url', 'resolucion', 'edadVisualizacion'];
    const completedBasicFields = basicFields.filter(field => {
      const control = this.videoForm.get(field);
      return control && control.valid && control.value !== '';
    });
    
    // Contar duración como una sola unidad (minutos Y segundos deben estar completos)
    const durationComplete = this.isFieldComplete('minutos') && this.isFieldComplete('segundos');
    
    const tagsComplete = this.selectedTags.length > 0;
    
    const totalRequired = 6; // titulo, url, resolucion, edadVisualizacion, duracion (minutos+segundos), tags
    const totalCompleted = completedBasicFields.length + (durationComplete ? 1 : 0) + (tagsComplete ? 1 : 0);
    
    return Math.round((totalCompleted / totalRequired) * 100);
  }

  // Verificar si un campo específico está completo
  isFieldComplete(fieldName: string): boolean {
    if (fieldName === 'tags') {
      return this.selectedTags.length > 0;
    }
    const field = this.videoForm.get(fieldName);
    if (!field) return false;

    if (!field.enabled) {
      return field.value !== null && field.value !== undefined && field.value !== '';
    }

    return field.valid && field.value !== '';
  }

  // Obtener mensaje de ayuda para campos
  getFieldHelpMessage(fieldName: string): string {
    const field = this.videoForm.get(fieldName);
    if (!field) return '';

    switch (fieldName) {
      case 'titulo':
        return this.getTituloHelpMessage(field);
      case 'url':
        return this.getUrlHelpMessage(field);
      case 'tags':
        return this.getTagsHelpMessage();
      case 'resolucion':
        return this.getResolucionHelpMessage(field);
      case 'edadVisualizacion':
        return this.getEdadHelpMessage(field);
      default:
        return '';
    }
  }

  // Métodos auxiliares para reducir complejidad cognitiva
  private getTituloHelpMessage(field: any): string {
    if (!field.value) return 'Escribe un título descriptivo para tu video';
    if (field.value.length < 2) return 'El título necesita al menos 2 caracteres';
    return '✓ Título válido';
  }

  private getUrlHelpMessage(field: any): string {
    if (!field.value) return 'Proporciona la URL del video (YouTube, Vimeo, etc.)';
    if (field.errors?.['pattern']) return 'URL debe comenzar con http:// o https://';
    return '✓ URL válida';
  }

  private getTagsHelpMessage(): string {
    if (this.selectedTags.length === 0) return 'Selecciona al menos 1 tag para categorizar tu video';
    if (this.selectedTags.length === 1) return `✓ 1 tag seleccionado: ${this.getSelectedTagsText()}`;
    return `✓ ${this.selectedTags.length} tags seleccionados: ${this.getSelectedTagsText()}`;
  }

  private getResolucionHelpMessage(field: any): string {
    if (!field.value) return 'Selecciona la resolución del video';
    return `✓ Resolución: ${field.value}`;
  }

  private getEdadHelpMessage(field: any): string {
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

  // Solo permitiremos números en los campos de duración
  onlyNumbers(event: KeyboardEvent): void {
    const key = event.key;
    const allowedKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 
                         'Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 
                         'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    
    if (!allowedKeys.includes(key)) {
      event.preventDefault();
    }
  }

  // Solo permitir el uso del selector de fecha, no entrada manual
  preventKeyboardInput(event: KeyboardEvent): void {
    const allowedKeys = ['Tab', 'Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Delete', 'Backspace'];
    if (!allowedKeys.includes(event.key)) {
      event.preventDefault();
    }
  }
}