import { Component, ChangeDetectorRef, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ContentService, UploadResponse } from '../../services/content.service';

// Validador para fechas que deben ser estrictamente posteriores a hoy
export function futureDateValidator(): ValidatorFn {
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

// Tipo para el estado visual de los campos
export type FieldVisualState = 'success' | 'error' | 'neutral';

// Interface para tags
export interface Tag {
  value: string;
  label: string;
}

@Component({
  selector: 'app-base-media-upload',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: '',
  styleUrl: './base-media-upload.component.css'
})
export abstract class BaseMediaUploadComponent {
  @Input() mediaType: 'audio' | 'video' = 'audio';
  
  mediaForm!: FormGroup;
  selectedCover: File | null = null;
  coverPreviewUrl: string | null = null;
  isUploading = false;
  uploadMessage = '';
  coverError = '';
  uploadSuccess = false;
  showUploadConfirmation = false;
  
  selectedTags: string[] = [];
  abstract availableTags: Tag[];
  
  constructor(
    protected readonly fb: FormBuilder,
    protected readonly contentService: ContentService,
    protected readonly router: Router,
    protected readonly cdr: ChangeDetectorRef
  ) {}

  // === MÉTODOS DE GESTIÓN DE TAGS ===
  
  toggleTag(tagValue: string) {
    const index = this.selectedTags.indexOf(tagValue);
    if (index > -1) {
      this.selectedTags.splice(index, 1);
    } else {
      this.selectedTags.push(tagValue);
    }
    
    // Actualizar el formulario
    this.mediaForm.patchValue({ tags: this.selectedTags.join(',') });
  }

  isTagSelected(tagValue: string): boolean {
    return this.selectedTags.includes(tagValue);
  }

  getSelectedTagsText(): string {
    if (this.selectedTags.length === 0) return '';
    return this.selectedTags.map(tag => {
      const tagObj = this.availableTags.find(t => t.value === tag);
      return tagObj ? tagObj.label : tag;
    }).join(', ');
  }

  getTagLabel(tagValue: string): string {
    const tagObj = this.availableTags.find(t => t.value === tagValue);
    return tagObj ? tagObj.label : tagValue;
  }

  // === MÉTODOS DE VALIDACIÓN Y SUBMIT ===
  
  onSubmit() {
    const minutos = Number(this.mediaForm.value.minutos) || 0;
    const segundos = Number(this.mediaForm.value.segundos) || 0;
    if ((minutos * 60 + segundos) <= 0) {
      this.uploadMessage = 'La duración debe ser al menos 1 segundo.';
      this.mediaForm.get('minutos')?.markAsTouched();
      this.mediaForm.get('segundos')?.markAsTouched();
      return;
    }

    if (this.isFormValid()) {
      this.showUploadConfirmation = true;
    }
  }

  protected abstract isFormValid(): boolean;

  cancelUpload() {
    this.showUploadConfirmation = false;
  }

  abstract confirmUpload(): void;

  backToDashboard() {
    this.router.navigate(['/gestor-dashboard']);
  }

  // === MÉTODOS DE GESTIÓN DE ERRORES ===
  
  getFieldError(fieldName: string): string {
    const field = this.mediaForm.get(fieldName);
    if (field && field.touched && field.errors) {
      const errors = field.errors;
      if (errors['required']) return `${fieldName} es obligatorio`;
      if (errors['minlength']) return `${fieldName} debe tener al menos ${errors['minlength'].requiredLength} caracteres`;
      if (errors['maxlength']) return `${fieldName} no puede exceder ${errors['maxlength'].requiredLength} caracteres`;
      if (errors['min']) return `${fieldName} debe ser mayor a ${errors['min'].min}`;
      if (errors['max']) return `${fieldName} no puede ser mayor a ${errors['max'].max}`;
      if (errors['pattern']) return `${fieldName} debe tener un formato válido`;
    }
    return '';
  }

  shouldShowHelpMessage(fieldName: string): boolean {
    if (fieldName === 'duracion') {
      const minutosField = this.mediaForm.get('minutos');
      const segundosField = this.mediaForm.get('segundos');
      const hasError = this.getFieldError('minutos') || this.getFieldError('segundos');
      const hasTouched = !!(minutosField?.touched || segundosField?.touched || minutosField?.dirty || segundosField?.dirty);
      
      if (!hasTouched) {
        return true;
      }
      
      return !hasError && hasTouched;
    }
    
    const field = this.mediaForm.get(fieldName);
    const hasError = this.getFieldError(fieldName);
    return !hasError && !!(field?.touched);
  }

  // === CÁLCULO DE PROGRESO ===
  
  abstract getFormProgress(): number;

  isFieldComplete(fieldName: string): boolean {
    if (fieldName === 'tags') {
      return this.selectedTags.length > 0;
    }
    if (fieldName === 'duracion') {
      return this.isFieldComplete('minutos') && this.isFieldComplete('segundos');
    }
    const field = this.mediaForm.get(fieldName);
    if (!field) return false;

    if (!field.enabled) {
      return field.value !== null && field.value !== undefined && field.value !== '';
    }

    return field.valid && field.value !== '';
  }

  // === MENSAJES DE AYUDA ===
  
  getFieldHelpMessage(fieldName: string): string {
    const field = this.mediaForm.get(fieldName);
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

  protected getTituloHelpMessage(field: any): string {
    if (!field.value) return `Escribe un título descriptivo para tu ${this.mediaType === 'audio' ? 'audio' : 'video'}`;
    if (field.value.length < 2) return 'El título necesita al menos 2 caracteres';
    return '✓ Título válido';
  }

  protected getTagsHelpMessage(): string {
    if (this.selectedTags.length === 0) return `Selecciona al menos 1 tag para categorizar tu ${this.mediaType === 'audio' ? 'audio' : 'video'}`;
    if (this.selectedTags.length === 1) return `✓ 1 tag seleccionado: ${this.getSelectedTagsText()}`;
    return `✓ ${this.selectedTags.length} tags seleccionados: ${this.getSelectedTagsText()}`;
  }

  protected getEdadHelpMessage(field: any): string {
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

  getDurationHelpMessage(): string {
    const minutosField = this.mediaForm.get('minutos');
    const segundosField = this.mediaForm.get('segundos');
    const minutos = minutosField?.value || 0;
    const segundos = segundosField?.value || 0;
    
    const hasTouched = !!(minutosField?.touched || segundosField?.touched || minutosField?.dirty || segundosField?.dirty);
    if (!hasTouched) {
      return this.getDurationMaxMessage();
    }
    
    const totalMinutos = Number(minutos);
    const totalSegundos = Number(segundos);
    
    if (totalMinutos >= 0 && totalSegundos >= 0 && (totalMinutos > 0 || totalSegundos > 0)) {
      return `✓ Duración: ${totalMinutos}m ${totalSegundos}s`;
    }
    
    return '';
  }

  protected abstract getDurationMaxMessage(): string;

  // === VALIDACIÓN DE ENTRADA ===
  
  onlyNumbers(event: KeyboardEvent): void {
    const key = event.key;
    const allowedKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 
                         'Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 
                         'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    
    if (!allowedKeys.includes(key)) {
      event.preventDefault();
    }
  }

  preventKeyboardInput(event: KeyboardEvent): void {
    const allowedKeys = ['Tab', 'Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Delete', 'Backspace'];
    if (!allowedKeys.includes(event.key)) {
      event.preventDefault();
    }
  }

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

  // === SISTEMA DE FEEDBACK VISUAL ===
  
  getFieldVisualState(fieldName: string): FieldVisualState {
    if (fieldName === 'minutos' || fieldName === 'segundos') {
      return this.getDurationFieldVisualState(fieldName);
    }
    
    if (fieldName === 'tags') {
      return this.getTagsFieldVisualState();
    }

    return this.getStandardFieldVisualState(fieldName);
  }

  protected getTagsFieldVisualState(): FieldVisualState {
    return this.selectedTags.length > 0 ? 'success' : 'error';
  }

  protected getStandardFieldVisualState(fieldName: string): FieldVisualState {
    const field = this.mediaForm.get(fieldName);
    if (!field) return 'neutral';

    if (!field.touched && !field.dirty) return 'neutral';

    if (field.errors) return 'error';

    const isRequired = this.isFieldRequired(fieldName);
    
    if (field.value && field.value !== '') {
      return 'success';
    } else if (isRequired) {
      return 'error';
    }
    
    return 'neutral';
  }

  protected abstract isFieldRequired(fieldName: string): boolean;

  protected getDurationFieldVisualState(fieldName: 'minutos' | 'segundos'): FieldVisualState {
    const minutosField = this.mediaForm.get('minutos');
    const segundosField = this.mediaForm.get('segundos');
    
    if (!minutosField || !segundosField) return 'neutral';

    if (!minutosField.touched && !segundosField.touched && !minutosField.dirty && !segundosField.dirty) {
      return 'neutral';
    }

    const currentField = fieldName === 'minutos' ? minutosField : segundosField;
    
    if (currentField.errors) {
      return 'error';
    }

    if (currentField.value !== null && currentField.value !== '' && Number(currentField.value) >= 0) {
      return 'success';
    }

    if (currentField.touched || currentField.dirty) {
      return 'error';
    }

    return 'neutral';
  }

  getFieldClasses(fieldName: string): string {
    const baseClasses = 'w-full px-4 py-3 bg-white/5 rounded-lg text-white placeholder-white/50 focus:outline-none transition-colors';
    const state = this.getFieldVisualState(fieldName);
    
    switch (state) {
      case 'success':
        return `${baseClasses} border-2 border-green-500 focus:border-green-400`;
      case 'error':
        return `${baseClasses} border-2 border-red-500 focus:border-red-400`;
      default:
        return `${baseClasses} border border-white/20 focus:border-purple-400`;
    }
  }

  getSelectFieldClasses(fieldName: string): string {
    const baseClasses = 'w-full px-4 py-3 bg-white/5 rounded-lg text-white focus:outline-none transition-colors';
    const state = this.getFieldVisualState(fieldName);
    
    switch (state) {
      case 'success':
        return `${baseClasses} border-2 border-green-500 focus:border-green-400`;
      case 'error':
        return `${baseClasses} border-2 border-red-500 focus:border-red-400`;
      default:
        return `${baseClasses} border border-white/20 focus:border-purple-400`;
    }
  }

  onFieldBlur(fieldName: string): void {
    const field = this.mediaForm.get(fieldName);
    if (field) {
      field.markAsTouched();
      field.updateValueAndValidity();
    }
  }

  onFieldChange(fieldName: string): void {
    const field = this.mediaForm.get(fieldName);
    if (field) {
      field.markAsDirty();
      field.updateValueAndValidity();
    }
  }

  // === GESTIÓN DE CARÁTULA ===
  
  async onCoverSelected(event: any) {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files ? inputEl.files[0] : null;
    this.coverError = '';

    if (file) {
      if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
        this.showCoverError('Solo se permiten archivos PNG, JPG o JPEG', inputEl);
        return;
      }

      if (file.size > 1024 * 1024) {
        this.showCoverError('El archivo excede el tamaño máximo de 1MB', inputEl);
        return;
      }

      const validExtensions = ['.png', '.jpg', '.jpeg'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      if (!validExtensions.includes(fileExtension)) {
        this.showCoverError('Se requiere archivo con extensión PNG, JPG o JPEG', inputEl);
        return;
      }

      this.selectedCover = file;
      this.mediaForm.patchValue({ caratula: file });
      
      const reader = new FileReader();
      reader.onload = (e) => {
        this.coverPreviewUrl = e.target?.result as string;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);

      this.uploadMessage = '';
      inputEl.value = '';
      this.cdr.detectChanges();
    }
  }

  removeCover() {
    this.selectedCover = null;
    this.coverPreviewUrl = null;
    this.coverError = '';
    this.mediaForm.patchValue({ caratula: null });
    this.cdr.detectChanges();
  }

  protected showCoverError(message: string, inputEl?: HTMLInputElement): void {
    this.coverError = message;
    this.selectedCover = null;
    this.coverPreviewUrl = null;
    const caratulaControl = this.mediaForm.get('caratula');
    if (caratulaControl) {
      caratulaControl.setErrors({ invalidCover: true });
      caratulaControl.markAsTouched();
    }
    if (inputEl) {
      inputEl.value = '';
    }
    this.cdr.detectChanges();
  }

  // === MANEJO DE ERRORES DE UPLOAD ===
  
  protected handleUploadError(error: any): void {
    this.isUploading = false;
    this.uploadSuccess = false;
    this.mediaForm.enable();
    console.error(`Error uploading ${this.mediaType}:`, error);
    
    if (error.status === 400) {
      this.uploadMessage = `❌ Error de validación: ${error.error?.message || 'Datos inválidos'}`;
    } else if (error.status === 401) {
      this.uploadMessage = '❌ No autorizado. Por favor, inicia sesión nuevamente.';
    } else if (error.status === 413) {
      this.uploadMessage = '❌ El archivo es demasiado grande.';
    } else if (error.status === 415) {
      this.uploadMessage = '❌ Tipo de archivo no válido.';
    } else if (error.status === 500) {
      this.uploadMessage = '❌ Error interno del servidor. Inténtalo más tarde.';
    } else if (error.status === 0) {
      this.uploadMessage = '❌ Error de conexión. Verifica tu conexión a internet.';
    } else {
      this.uploadMessage = `❌ Error: ${error.error?.message || 'Error inesperado'}`;
    }
  }

  protected handleUploadSuccess(response: UploadResponse): void {
    this.isUploading = false;
    if (response.success) {
      this.uploadSuccess = true;
      this.uploadMessage = `¡${this.mediaType === 'audio' ? 'Audio' : 'Video'} subido exitosamente! 🎉`;
      this.cdr.detectChanges();
      setTimeout(() => {
        this.router.navigate(['/gestor-dashboard']);
      }, 3000);
    } else {
      this.uploadSuccess = false;
      this.uploadMessage = `❌ Error: ${response.message}`;
      this.mediaForm.enable();
    }
  }
}
