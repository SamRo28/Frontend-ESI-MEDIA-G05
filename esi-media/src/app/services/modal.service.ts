import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ModalConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmClass?: 'primary' | 'danger' | 'warning' | 'success';
  showCancel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  icon?: 'warning' | 'danger' | 'info' | 'success' | 'question';
  type?: 'info' | 'warning' | 'error' | 'success';
  data?: any;
}

export interface Modal {
  id: number;
  config: ModalConfig;
  resolve: (result: boolean) => void;
}

@Injectable({ 
  providedIn: 'root' 
})
export class ModalService {
  private modals = new BehaviorSubject<Modal[]>([]);

  openConfirmationModal(config: ModalConfig): Promise<boolean> {
    return new Promise((resolve) => {
      const modal: Modal = {
        id: Date.now(),
        config: {
          confirmText: 'Confirmar',
          cancelText: 'Cancelar',
          confirmClass: 'primary',
          showCancel: true,
          size: 'md',
          icon: 'question',
          type: 'info',
          ...config
        },
        resolve
      };
      
      const currentModals = this.modals.value;
      this.modals.next([...currentModals, modal]);
    });
  }

  closeModal(id: number, result: boolean = false) {
    const currentModals = this.modals.value;
    const modal = currentModals.find(m => m.id === id);
    
    if (modal) {
      modal.resolve(result);
      this.modals.next(currentModals.filter(m => m.id !== id));
    }
  }

  closeAllModals() {
    const currentModals = this.modals.value;
    currentModals.forEach(modal => modal.resolve(false));
    this.modals.next([]);
  }

  getModals() {
    return this.modals.asObservable();
  }

  // Métodos de conveniencia
  async confirm(title: string, message: string): Promise<boolean> {
    return this.openConfirmationModal({
      title,
      message,
      type: 'warning'
    });
  }

  async info(title: string, message: string): Promise<boolean> {
    return this.openConfirmationModal({
      title,
      message,
      type: 'info',
      confirmText: 'Aceptar',
      cancelText: ''
    });
  }

  async error(title: string, message: string): Promise<boolean> {
    return this.openConfirmationModal({
      title,
      message,
      type: 'error',
      confirmText: 'Aceptar',
      cancelText: ''
    });
  }
}