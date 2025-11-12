import { Component, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ContentService, AudioUploadData, UploadResponse } from '../services/content.service';
import { BaseMediaUploadComponent, futureDateValidator, Tag } from '../shared/base-media-upload/base-media-upload.component';

@Component({
  selector: 'app-audio-upload',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './audio-upload.component.html',
  styleUrl: './audio-upload.component.css'
})
export class AudioUploadComponent extends BaseMediaUploadComponent {
  selectedFile: File | null = null;
  fileError = '';
  
  // Aliases para compatibilidad con template HTML existente
  get audioForm() { return this.mediaForm; }
  get availableAudioTags() { return this.availableTags; }
  
  override availableTags: Tag[] = [
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
  
  constructor(
    fb: FormBuilder,
    contentService: ContentService,
    router: Router,
    cdr: ChangeDetectorRef
  ) {
    super(fb, contentService, router, cdr);
    this.mediaType = 'audio';
    
    this.mediaForm = this.fb.group({
      titulo: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      descripcion: ['', [Validators.maxLength(500)]],
      tags: ['', [Validators.required]],
      minutos: ['', [Validators.required, Validators.min(0), Validators.max(10)]],
      segundos: ['', [Validators.required, Validators.min(0), Validators.max(59)]],
      vip: [false, [Validators.required]],
      edadVisualizacion: ['', [Validators.required]],
      fechaDisponibleHasta: ['', [futureDateValidator()]],
      visible: [true, [Validators.required]],
      archivo: [null, [Validators.required]],
      caratula: ['']
    });

    this.mediaForm.get('minutos')?.valueChanges.subscribe((minutos: any) => {
      const segundosControl = this.mediaForm.get('segundos');
      if (Number(minutos) === 10) {
        segundosControl?.setValue(0);
        segundosControl?.disable();
      } else {
        segundosControl?.enable();
      }
    });
  }

  // Implementaciones de métodos abstractos
  protected override isFormValid(): boolean {
    return this.mediaForm.valid && this.selectedFile !== null;
  }

  protected override getDurationMaxMessage(): string {
    return 'Máximo 10 minutos';
  }

  protected override isFieldRequired(fieldName: string): boolean {
    return ['titulo', 'edadVisualizacion'].includes(fieldName);
  }

  override getFormProgress(): number {
    const basicFields = ['titulo', 'edadVisualizacion'];
    const completedBasicFields = basicFields.filter(field => {
      const control = this.mediaForm.get(field);
      return control && control.valid && control.value !== '';
    });
    
    const durationComplete = this.isFieldComplete('minutos') && this.isFieldComplete('segundos');
    const tagsComplete = this.selectedTags.length > 0;
    const hasFile = this.selectedFile !== null;
        
    const totalRequired = 5;
    const totalCompleted = completedBasicFields.length + (durationComplete ? 1 : 0) + (tagsComplete ? 1 : 0) + (hasFile ? 1 : 0);
    
    return Math.round((totalCompleted / totalRequired) * 100);
  }

  // Métodos específicos de audio
  async onFileSelected(event: any) {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files ? inputEl.files[0] : null;
    this.fileError = '';

    if (file) {
      if (!file.type.includes('audio/mpeg') && !file.type.includes('audio/mp3')) {
        this.showFileError('Solo se permiten archivos MP3', inputEl);
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        this.showFileError('El archivo excede el tamaño máximo de 2MB', inputEl);
        return;
      }

      if (!file.name.toLowerCase().endsWith('.mp3')) {
        this.showFileError('Se requiere archivo con extensión .mp3', inputEl);
        return;
      }

      try {
        const detected = await this.detectAudioFormatByMagicBytes(file);
        if (detected !== 'mp3') {
          this.showFileError(`Se requiere un archivo MP3 (Formato detectado: ${detected || 'desconocido'})`, inputEl);
          return;
        }
      } catch (err) {
        console.error('Error comprobando magic bytes:', err);
        this.showFileError('No se pudo verificar el tipo del archivo', inputEl);
        return;
      }

      this.selectedFile = file;
      this.mediaForm.patchValue({ archivo: file });
      const archivoControl = this.mediaForm.get('archivo');
      if (archivoControl) {
        archivoControl.setErrors(null);
        archivoControl.markAsDirty();
      }
      this.uploadMessage = '';
      inputEl.value = '';
      this.cdr.detectChanges();
    }
  }

  override confirmUpload(): void {
    this.showUploadConfirmation = false;
    this.isUploading = true;
    this.uploadSuccess = false;
    this.uploadMessage = 'Subiendo archivo de audio...';
    
    const minutos = Number(this.mediaForm.value.minutos) || 0;
    const segundos = Number(this.mediaForm.value.segundos) || 0;
    const formValues = this.mediaForm.value;
      
    this.mediaForm.disable();

    const tagsArray = this.selectedTags.length > 0 ? this.selectedTags : [];
    const totalSegundos = (minutos * 60) + segundos;

    const audioData: AudioUploadData = {
      titulo: formValues.titulo,
      descripcion: formValues.descripcion || undefined,
      tags: tagsArray,
      duracion: totalSegundos > 0 ? totalSegundos : 1,
      vip: formValues.vip,
      edadVisualizacion: Number(formValues.edadVisualizacion) || 0,
      fechaDisponibleHasta: formValues.fechaDisponibleHasta && formValues.fechaDisponibleHasta.trim() !== ''
        ? new Date(formValues.fechaDisponibleHasta) 
        : undefined,
      visible: formValues.visible,
      archivo: this.selectedFile!,
      caratula: this.selectedCover || undefined
    };

    this.contentService.uploadAudio(audioData).subscribe({
      next: (response: UploadResponse) => this.handleUploadSuccess(response),
      error: (error: any) => this.handleUploadError(error)
    });
  }

  getFileFieldClasses(): string {
    const baseClasses = 'w-full px-4 py-3 bg-white/5 rounded-lg text-white placeholder-white/50 focus:outline-none transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700';
    const state = this.getFileFieldVisualState();
    
    switch (state) {
      case 'success':
        return `${baseClasses} border-2 border-green-500 focus:border-green-400`;
      case 'error':
        return `${baseClasses} border-2 border-red-500 focus:border-red-400`;
      default:
        return `${baseClasses} border border-white/20 focus:border-purple-400`;
    }
  }

  private showFileError(message: string, inputEl?: HTMLInputElement): void {
    this.fileError = message;
    this.selectedFile = null;
    const archivoControl = this.mediaForm.get('archivo');
    if (archivoControl) {
      archivoControl.setErrors({ invalidFile: true });
      archivoControl.markAsTouched();
    }
    if (inputEl) {
      inputEl.value = '';
    }
    this.cdr.detectChanges();
  }

  private getFileFieldVisualState() {
    if (this.fileError) return 'error';
    if (this.selectedFile) return 'success';
    return 'neutral';
  }

  private async detectAudioFormatByMagicBytes(file: File): Promise<string | null> {
    const slice = file.slice(0, 12);
    const arrayBuffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    if (bytes.length < 4) return null;

    // MP3
    if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return 'mp3';
    if (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0) return 'mp3';

    // WAV
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
      if (bytes.length >= 12 && bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45) return 'wav';
    }

    // OGG
    if (bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) return 'ogg';

    // M4A
    if (bytes.length >= 8 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) return 'm4a';

    return null;
  }
}
