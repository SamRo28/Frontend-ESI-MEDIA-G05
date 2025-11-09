import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmation-modal.html',
  styleUrls: ['./confirmation-modal.css']
})
export class ConfirmationModalComponent {
  @Input() isVisible: boolean = false;
  @Input() title: string = 'Confirmar acción';
  @Input() message: string = '¿Estás seguro de que deseas continuar?';
  @Input() submessage: string = '';
  @Input() confirmText: string = 'Confirmar';
  @Input() cancelText: string = 'Cancelar';
  @Input() processingText: string = 'Procesando...';
  @Input() isProcessing: boolean = false;

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  onConfirm(): void {
    if (!this.isProcessing) {
      this.confirmed.emit();
    }
  }

  onCancel(): void {
    if (!this.isProcessing) {
      this.cancelled.emit();
    }
  }

  onOverlayClick(event: Event): void {
    // Cerrar modal solo si se hace click en el overlay, no en el contenido
    if (event.target === event.currentTarget && !this.isProcessing) {
      this.onCancel();
    }
  }
}