import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContenidoDetalle } from '../services/admin.service';

@Component({
  selector: 'app-content-detail-modal',
  templateUrl: './content-detail-modal.component.html',
  styleUrls: ['./content-detail-modal.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class ContentDetailModalComponent {
  @Input() contenido: ContenidoDetalle | null = null;
  @Input() loading = false;
  @Input() error = '';
  @Output() close = new EventEmitter<void>();

  closeModal() {
    this.close.emit();
  }
}