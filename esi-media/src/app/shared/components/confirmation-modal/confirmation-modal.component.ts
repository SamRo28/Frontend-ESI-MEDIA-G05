import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalConfig } from '../../../services/modal.service';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmation-modal.component.html',
  styleUrls: ['./confirmation-modal.component.css']
})
export class ConfirmationModalComponent {
  @Input() isVisible: boolean = false;
  @Input() config: ModalConfig = {
    title: 'Confirmar',
    message: '¿Está seguro?',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    confirmClass: 'primary',
    showCancel: true,
    size: 'md',
    icon: 'question'
  };
  
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() modalClosed = new EventEmitter<void>();

  onConfirm(): void {
    this.confirmed.emit();
    this.closeModal();
  }

  onCancel(): void {
    this.cancelled.emit();
    this.closeModal();
  }

  closeModal(): void {
    this.isVisible = false;
    this.modalClosed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    // Solo cerrar si se hizo clic en el backdrop, no en el modal
    if (event.target === event.currentTarget) {
      this.onCancel();
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.onCancel();
    } else if (event.key === 'Enter') {
      this.onConfirm();
    }
  }

  getIconSvg(): string {
    const icons = {
      warning: `
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z">
        </path>
      `,
      danger: `
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z">
        </path>
      `,
      info: `
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z">
        </path>
      `,
      success: `
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z">
        </path>
      `,
      question: `
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z">
        </path>
      `
    };
    return icons[this.config.icon || 'question'];
  }

  getIconClass(): string {
    const iconClasses = {
      warning: 'icon-warning',
      danger: 'icon-danger',
      info: 'icon-info',
      success: 'icon-success',
      question: 'icon-question'
    };
    return iconClasses[this.config.icon || 'question'];
  }

  getConfirmButtonClass(): string {
    const buttonClasses = {
      primary: 'btn-primary',
      danger: 'btn-danger',
      warning: 'btn-warning',
      success: 'btn-success'
    };
    return buttonClasses[this.config.confirmClass || 'primary'];
  }

  getModalSizeClass(): string {
    const sizeClasses = {
      sm: 'modal-sm',
      md: 'modal-md',
      lg: 'modal-lg'
    };
    return sizeClasses[this.config.size || 'md'];
  }
}