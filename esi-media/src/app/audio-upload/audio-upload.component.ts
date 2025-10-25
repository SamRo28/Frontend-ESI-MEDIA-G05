import { Component, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ContentService, AudioUploadData, UploadResponse } from '../services/content.service';

// Validador para fechas que deben ser estrictamente posteriores a hoy
function futureDateValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null; // Campo vacío permitido (es opcional)
    
    const selectedDate = new Date(value);
    if (Number.isNaN(selectedDate.getTime())) return { invalidDate: true };
    
    // Comparar solo la parte de fecha (sin horas) para evitar problemas de zona horaria
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    
    return selectedDate > today ? null : { notInFuture: true };
  };
}

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
  fileError = '';
  uploadSuccess = false;
  showUploadConfirmation = false;
  
  // Tags predefinidos para audios
  availableAudioTags = [
    { value: 'pop', label: 'Pop' },
    { value: 'rock', label: 'Rock' },
    { value: 'rap', label: 'Rap/Hip-Hop' },
    { value: 'jazz', label: 'Jazz' },
    { value: 'clasica', label: 'Clásica' },
    { value: 'electronica', label: 'Electrónica' },
    { value: 'reggaeton', label: 'Reggaeton' },
    { value: 'indie', label: 'Indie' },
    { value: 'folk', label: 'Folk' },
    { value: 'blues', label: 'Blues' },
    { value: 'metal', label: 'Metal' },
    { value: 'podcast', label: 'Podcast' },
    { value: 'audiolibro', label: 'Audiolibro' },
    { value: 'instrumental', label: 'Instrumental' },
    { value: 'acustico', label: 'Acústico' }
  ];
  
  selectedTags: string[] = [];
  
  constructor(
    private fb: FormBuilder,
    private contentService: ContentService,
    private router: Router
    ,
    private cdr: ChangeDetectorRef
  ) {
    this.audioForm = this.fb.group({
      titulo: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      descripcion: ['', [Validators.maxLength(500)]],
      tags: ['', [Validators.required]], // Mantenemos como string simple por ahora, cambiaremos la lógica después
      minutos: ['', [Validators.required, Validators.min(0), Validators.max(10)]],
      segundos: ['', [Validators.required, Validators.min(0), Validators.max(59)]],
      vip: [false, [Validators.required]],
      edadVisualizacion: ['', [Validators.required]],
      fechaDisponibleHasta: ['', [futureDateValidator()]],
      visible: [true, [Validators.required]],
      archivo: [null, [Validators.required]],
      caratula: ['']
    });

    // Validación inteligente de duración: si minutos = 10, segundos debe ser 0
    this.audioForm.get('minutos')?.valueChanges.subscribe(minutos => {
      const segundosControl = this.audioForm.get('segundos');
      if (Number(minutos) === 10) {
        segundosControl?.setValue(0);
        segundosControl?.disable();
      } else {
        segundosControl?.enable();
      }
    });
  }

  async onFileSelected(event: any) {
  const inputEl = event.target as HTMLInputElement;
  const file = inputEl.files ? inputEl.files[0] : null;
  this.fileError = ''; // Limpiar errores previos

    if (file) {
      // Validar tipo de archivo en función del MIME type
      if (!file.type.includes('audio/mpeg') && !file.type.includes('audio/mp3')) {
        this.fileError = 'Solo se permiten archivos MP3';
        this.selectedFile = null;
        // limpiar input para permitir volver a seleccionar el mismo archivo si fuese necesario
        inputEl.value = '';
        this.cdr.detectChanges();
        return;
      }

      // Validar tamaño (2MB máximo)
      if (file.size > 2 * 1024 * 1024) {
        this.fileError = 'El archivo excede el tamaño máximo de 2MB';
        this.selectedFile = null;
        inputEl.value = '';
        this.cdr.detectChanges();
        return;
      }

      // Debemos aceptar solo archivos que sean REALMENTE .mp3
      // Por ello validamos tanto la extensión como los magic-bytes
      if (!file.name.toLowerCase().endsWith('.mp3')) {
        this.fileError = 'Se requiere archivo con extensión .mp3';
        this.selectedFile = null;
        inputEl.value = '';
        this.cdr.detectChanges();
        return;
      }

      try {
        const detected = await this.detectAudioFormatByMagicBytes(file);
        if (detected !== 'mp3') {
          this.fileError = `Se requiere un archivo MP3 /// (Formato detectado: ${detected || 'desconocido'})`;
          this.selectedFile = null;
          inputEl.value = '';
          this.cdr.detectChanges();
          return;
        }
      } catch (err) {
        console.error('Error comprobando magic bytes:', err);
        this.fileError = 'No se pudo verificar el tipo del archivo';
        this.selectedFile = null;
        return;
      }

      this.selectedFile = file;
      this.audioForm.patchValue({ archivo: file });
      this.uploadMessage = '';
      // limpiar valor del input para permitir re-selección del mismo fichero si el usuario lo desea
      inputEl.value = '';
      // forzar detección de cambios en la UI inmediatamente
      this.cdr.detectChanges();
    }
  }

  // Detecta formato de audio por magic-bytes y devuelve 'mp3'|'wav'|'ogg'|'flac'|'m4a' o null si no se reconoce
  private async detectAudioFormatByMagicBytes(file: File): Promise<string | null> {
    // Debemos leer primeros 12 bytes para tener suficiente información de los magic-bytes
    const slice = file.slice(0, 12);
    const arrayBuffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    if (bytes.length < 4) return null;

    // MP3: Aparece ID3 al inicio
    if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return 'mp3';
    // O puede empezar directamente con un frame de audio (0xFFEx)
    if (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0) return 'mp3';

    // WAV: 'RIFF'....'WAVE'
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
      if (bytes.length >= 12 && bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45) return 'wav';
    }

    // OGG: 'OggS'
    if (bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) return 'ogg';

    // FLAC: 'fLaC'
    if (bytes[0] === 0x66 && bytes[1] === 0x4C && bytes[2] === 0x61 && bytes[3] === 0x43) return 'flac';

    // M4A: 'ftyp' en bytes 4-7
    if (bytes.length >= 8 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) return 'm4a';

    return null;
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
    this.audioForm.patchValue({ tags: this.selectedTags.join(',') });
  }

  isTagSelected(tagValue: string): boolean {
    return this.selectedTags.includes(tagValue);
  }

  getSelectedTagsText(): string {
    if (this.selectedTags.length === 0) return '';
    return this.selectedTags.map(tag => {
      const tagObj = this.availableAudioTags.find(t => t.value === tag);
      return tagObj ? tagObj.label : tag;
    }).join(', ');
  }

  onSubmit() {
    const minutos = Number(this.audioForm.value.minutos) || 0;
    const segundos = Number(this.audioForm.value.segundos) || 0;
    if ((minutos * 60 + segundos) <= 0) {
      this.uploadMessage = 'La duración debe ser al menos 1 segundo.';
      this.audioForm.get('minutos')?.markAsTouched();
      this.audioForm.get('segundos')?.markAsTouched();
      return;
    }

    if (this.audioForm.valid && this.selectedFile) {
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
    this.uploadMessage = 'Subiendo archivo de audio...';
    
    const minutos = Number(this.audioForm.value.minutos) || 0;
    const segundos = Number(this.audioForm.value.segundos) || 0;
    const formValues = this.audioForm.value; // Guardar todos los valores
      
      // Bloquear formulario completo una vez se decide subir el audio
      this.audioForm.disable();

      // Usar selectedTags directamente
      const tagsArray = this.selectedTags.length > 0 ? this.selectedTags : [];

      // Convertir minutos y segundos a total de segundos con validación
      const totalSegundos = (minutos * 60) + segundos;

      const audioData: AudioUploadData = {
        titulo: formValues.titulo,
        descripcion: formValues.descripcion || undefined,
        tags: tagsArray,
        duracion: totalSegundos > 0 ? totalSegundos : 1, // Mínimo 1 segundo
        vip: formValues.vip,
        edadVisualizacion: Number(formValues.edadVisualizacion) || 0,
        fechaDisponibleHasta: formValues.fechaDisponibleHasta && formValues.fechaDisponibleHasta.trim() !== ''
          ? new Date(formValues.fechaDisponibleHasta) 
          : undefined,
        visible: formValues.visible,
        archivo: this.selectedFile!,
        caratula: formValues.caratula || undefined
      };

      this.contentService.uploadAudio(audioData).subscribe({
        next: (response: UploadResponse) => {
          this.isUploading = false;
          if (response.success) {
            this.uploadSuccess = true;
            this.uploadMessage = '¡Audio subido exitosamente! 🎉';
          } else {
            this.uploadSuccess = false;
            this.uploadMessage = `❌ Error: ${response.message}`;
            this.audioForm.enable();
          }
        },
        error: (error: any) => {
          this.isUploading = false;
          this.uploadSuccess = false;
          this.audioForm.enable();
          console.error('Error uploading audio:', error);
          
          // Manejo específico de errores HTTP según el backend
          if (error.status === 400) {
            // Error de validación
            this.uploadMessage = `❌ Error de validación: ${error.error?.message || 'Datos inválidos'}`;
          } else if (error.status === 401) {
            // Error de autenticación
            this.uploadMessage = '❌ No autorizado. Por favor, inicia sesión nuevamente.';
          } else if (error.status === 413) {
            // Archivo muy grande
            this.uploadMessage = '❌ El archivo es demasiado grande. Máximo 2MB permitido.';
          } else if (error.status === 415) {
            // Tipo de archivo no soportado
            this.uploadMessage = '❌ Tipo de archivo no válido. Solo se permiten archivos MP3.';
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

  // Método para mostrar mensajes de ayuda solo cuando es apropiado
  shouldShowHelpMessage(fieldName: string): boolean {
    if (fieldName === 'duracion') {
      const minutosField = this.audioForm.get('minutos');
      const segundosField = this.audioForm.get('segundos');
      const hasError = this.getFieldError('minutos') || this.getFieldError('segundos');
      const hasTouched = !!(minutosField?.touched || segundosField?.touched);
      return !hasError && hasTouched;
    }
    
    const field = this.audioForm.get(fieldName);
    const hasError = this.getFieldError(fieldName);
    return !hasError && !!(field?.touched);
  }

  // Calcular barra de progreso del formulario para feedback visual
  getFormProgress(): number {
    const basicFields = ['titulo', 'edadVisualizacion'];
    const completedBasicFields = basicFields.filter(field => {
      const control = this.audioForm.get(field);
      return control && control.valid && control.value !== '';
    });
    
    // Contar duración como una sola unidad (minutos Y segundos deben estar completos)
    const durationComplete = this.isFieldComplete('minutos') && this.isFieldComplete('segundos');
    
    // Contar tags como requerido
    const tagsComplete = this.selectedTags.length > 0;
    
    // Contar archivo como campo requerido
    const hasFile = this.selectedFile !== null;
        
    const totalRequired = 5; // titulo, edadVisualizacion, duracion (minutos+segundos), tags, archivo
    const totalCompleted = completedBasicFields.length + (durationComplete ? 1 : 0) + (tagsComplete ? 1 : 0) + (hasFile ? 1 : 0);
    
    return Math.round((totalCompleted / totalRequired) * 100);
  }

  // Verificar si un campo específico está completo
  isFieldComplete(fieldName: string): boolean {
    if (fieldName === 'tags') {
      return this.selectedTags.length > 0;
    }
    if (fieldName === 'duracion') {
      return this.isFieldComplete('minutos') && this.isFieldComplete('segundos');
    }
    const field = this.audioForm.get(fieldName);
    if (!field) return false;

    // Si el control está deshabilitado (p.ej. segundos cuando minutos=10)
    // y tiene un valor (incluyendo 0), considerarlo completo.
    if (!field.enabled) {
      return field.value !== null && field.value !== undefined && field.value !== '';
    }

    return field.valid && field.value !== '';
  }

  // Obtener mensaje de ayuda para campos
  getFieldHelpMessage(fieldName: string): string {
    const field = this.audioForm.get(fieldName);
    if (!field) return '';

    switch (fieldName) {
      case 'titulo':
        return this.getTituloHelpMessage(field);
      case 'tags':
        return this.getTagsHelpMessage();
      case 'edadVisualizacion':
        return this.getEdadHelpMessage(field);
      default:
        return '';
    }
  }

  // Métodos auxiliares para reducir complejidad cognitiva
  private getTituloHelpMessage(field: any): string {
    if (!field.value) return 'Escribe un título descriptivo para tu audio';
    if (field.value.length < 2) return 'El título necesita al menos 2 caracteres';
    return '✓ Título válido';
  }

  private getTagsHelpMessage(): string {
    if (this.selectedTags.length === 0) return 'Selecciona al menos 1 tag para categorizar tu audio';
    if (this.selectedTags.length === 1) return `✓ 1 tag seleccionado: ${this.getSelectedTagsText()}`;
    return `✓ ${this.selectedTags.length} tags seleccionados: ${this.getSelectedTagsText()}`;
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
    const minutos = this.audioForm.get('minutos')?.value || 0;
    const segundos = this.audioForm.get('segundos')?.value || 0;
    
    if (minutos === '' && segundos === '') {
      return 'Especifica la duración de tu audio (máximo 10 minutos)';
    }
    
    if (minutos === '' || segundos === '') {
      return 'Completa tanto minutos como segundos';
    }
    
    const totalMinutos = Number(minutos);
    const totalSegundos = Number(segundos);
    
    if (totalMinutos === 0 && totalSegundos === 0) {
      return 'La duración debe ser mayor a 0';
    }
    
    if (totalMinutos > 10) {
      return 'La duración máxima es 10 minutos';
    }
    
    if (totalSegundos > 59) {
      return 'Los segundos no pueden ser mayor a 59';
    }
    
    return `✓ Duración: ${totalMinutos}m ${totalSegundos}s`;
  }

  // Formatear duración en minutos y segundos
  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
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

  // Solo permitiremos el uso del selector de fecha, no entrada manual
  preventKeyboardInput(event: KeyboardEvent): void {
    const allowedKeys = ['Tab', 'Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Delete', 'Backspace'];
    if (!allowedKeys.includes(event.key)) {
      event.preventDefault();
    }
  }

  // Obtener texto descriptivo para edad de visualización
  getEdadVisualizacionText(edad: string): string {
    switch(edad) {
      case 'TP':
        return 'Todo Público';
      case '18':
        return '+18 (Adultos)';
      default:
        return edad || 'No especificado';
    }
  }
}