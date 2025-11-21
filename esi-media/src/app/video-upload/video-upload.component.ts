import { Component, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ContentService, VideoUploadData, UploadResponse } from '../services/content.service';
import { BaseMediaUploadComponent, futureDateValidator, Tag } from '../shared/base-media-upload/base-media-upload.component';

@Component({
  selector: 'app-video-upload',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './video-upload.component.html',
  styleUrl: './video-upload.component.css'
})
export class VideoUploadComponent extends BaseMediaUploadComponent {
  
  // Aliases para compatibilidad con template HTML existente
  get videoForm() { return this.mediaForm; }
  get availableVideoTags() { return this.availableTags; }
  
  override availableTags: Tag[] = [
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
  
  constructor(
    fb: FormBuilder,
    contentService: ContentService,
    router: Router,
    cdr: ChangeDetectorRef
  ) {
    super(fb, contentService, router, cdr);
    this.mediaType = 'video';
    
    this.mediaForm = this.fb.group({
      titulo: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      descripcion: ['', [Validators.maxLength(500)]],
      tags: ['', [Validators.required]],
      minutos: ['', [Validators.required, Validators.min(0), Validators.max(240)]],
      segundos: ['', [Validators.required, Validators.min(0), Validators.max(59)]],
      vip: [false, [Validators.required]],
      edadVisualizacion: ['', [Validators.required]],
      fechaDisponibleHasta: ['', [futureDateValidator()]],
      visible: [true, [Validators.required]],
      url: ['', [Validators.required, Validators.pattern(/^https?:\/\/[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*(?:[/#?].*)?$/)]],
      resolucion: ['', [Validators.required]],
      caratula: ['']
    });

    // Validación inteligente de duración: si minutos = 240, segundos debe ser 0
    this.mediaForm.get('minutos')?.valueChanges.subscribe((minutos: any) => {
      const segundosControl = this.mediaForm.get('segundos');
      if (Number(minutos) === 240) {
        segundosControl?.setValue(0);
        segundosControl?.disable();
      } else {
        segundosControl?.enable();
      }
    });

    // POLÍTICA 4K: solo disponible para contenido VIP
    this.mediaForm.get('vip')?.valueChanges.subscribe((vipStatus: any) => {
      const resolucionControl = this.mediaForm.get('resolucion');
      const currentResolution = resolucionControl?.value;
      
      if (!vipStatus && currentResolution === '2160p') {
        resolucionControl?.setValue('1080p');
        console.log('Resolución cambiada automáticamente a 1080p (contenido no VIP)');
      }
    });
  }

  // Implementaciones de métodos abstractos
  protected override isFormValid(): boolean {
    return this.mediaForm.valid;
  }

  protected override getDurationMaxMessage(): string {
    return 'Máximo 240 minutos';
  }

  protected override isFieldRequired(fieldName: string): boolean {
    return ['titulo', 'url', 'resolucion', 'edadVisualizacion'].includes(fieldName);
  }

  override getFormProgress(): number {
    const basicFields = ['titulo', 'url', 'resolucion', 'edadVisualizacion'];
    const completedBasicFields = basicFields.filter(field => {
      const control = this.mediaForm.get(field);
      return control && control.valid && control.value !== '';
    });
    
    const durationComplete = this.isFieldComplete('minutos') && this.isFieldComplete('segundos');
    const tagsComplete = this.selectedTags.length > 0;
    
    const totalRequired = 6;
    const totalCompleted = completedBasicFields.length + (durationComplete ? 1 : 0) + (tagsComplete ? 1 : 0);
    
    return Math.round((totalCompleted / totalRequired) * 100);
  }

  // Sobrescribir getFieldHelpMessage para agregar mensajes específicos de video
  override getFieldHelpMessage(fieldName: string): string {
    const field = this.mediaForm.get(fieldName);
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

  private getUrlHelpMessage(field: any): string {
    if (!field.value) return 'Proporciona la URL del video (YouTube, Vimeo, etc.)';
    if (field.errors?.['pattern']) return 'URL debe comenzar con http:// o https://';
    return 'URL válida';
  }

  private getResolucionHelpMessage(field: any): string {
    if (!field.value) return 'Selecciona la resolución del video';
    return 'Resolución: ${field.value}';
  }

  override confirmUpload(): void {
    this.showUploadConfirmation = false;
    this.isUploading = true;
    this.uploadSuccess = false;
    this.uploadMessage = 'Subiendo información del video...';
    
    const minutos = Number(this.mediaForm.value.minutos) || 0;
    const segundos = Number(this.mediaForm.value.segundos) || 0;
    const formValues = this.mediaForm.value;

    this.mediaForm.disable();

    const tagsArray = this.selectedTags.length > 0 ? this.selectedTags : [];
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
      caratula: this.selectedCover || undefined
    };

    this.contentService.uploadVideo(videoData).subscribe({
      next: (response: UploadResponse) => this.handleUploadSuccess(response),
      error: (error: any) => this.handleUploadError(error)
    });
  }

  // NUEVA FUNCIONALIDAD: Verificar si 4K está disponible (solo para VIP)
  is4KAvailable(): boolean {
    return this.mediaForm.get('vip')?.value === true;
  }

  // Obtener mensaje explicativo para la política de 4K
  get4KPolicyMessage(): string {
    if (this.is4KAvailable()) {
      return '4K disponible (contenido VIP activo)';
    } else {
      return '4K solo disponible para contenido VIP';
    }
  }
}
