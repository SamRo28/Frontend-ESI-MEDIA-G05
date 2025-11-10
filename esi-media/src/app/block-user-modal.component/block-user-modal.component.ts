import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, Usuario } from '../services/admin.service';

@Component({
  selector: 'app-block-user-modal',
  templateUrl: './block-user-modal.component.html',
  styleUrls: ['./block-user-modal.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class BlockUserModalComponent implements OnInit {
  @Input() usuario!: Usuario;
  @Input() adminId?: string;
  @Output() close = new EventEmitter<void>();
  @Output() userBlocked = new EventEmitter<boolean>();

  accionBloqueo: 'bloquear' | 'desbloquear' = 'bloquear';
  loadingBloqueo = false;
  errorBloqueo = '';
  confirmBloqueoStep: 1 | 2 = 1;

  constructor(
    private readonly adminService: AdminService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.accionBloqueo = this.usuario.bloqueado ? 'desbloquear' : 'bloquear';
  }

  confirmarBloqueo() {
    if (!this.usuario) return;

    // Primera pulsación: mostrar aviso y pedir confirmación
    if (this.confirmBloqueoStep === 1) {
      this.confirmBloqueoStep = 2;
      return;
    }

    if (!this.adminId) {
      this.errorBloqueo = 'No se pudo identificar al administrador';
      return;
    }

    this.loadingBloqueo = true;
    this.errorBloqueo = '';

    const accion$ = this.accionBloqueo === 'bloquear'
      ? this.adminService.bloquearUsuario(this.usuario.id!, this.adminId)
      : this.adminService.desbloquearUsuario(this.usuario.id!, this.adminId);

    const backup = setTimeout(() => {
      if (this.loadingBloqueo) {
        this.loadingBloqueo = false;
        this.errorBloqueo = 'La operación tardó más de lo esperado. Refresca la lista para ver el estado.';
        this.cdr.detectChanges();
      }
    }, 7000);

    accion$.subscribe({
      next: async (response) => {
        console.log('✅ Usuario', this.accionBloqueo === 'bloquear' ? 'bloqueado' : 'desbloqueado');
        
        const nuevoEstado = this.accionBloqueo === 'bloquear';
        this.usuario.bloqueado = nuevoEstado;
        
        this.loadingBloqueo = false;
        clearTimeout(backup);
        
        this.userBlocked.emit(nuevoEstado);
        this.closeModal();
        
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('🛑 Error:', error);
        this.errorBloqueo = error.message || `Error al ${this.accionBloqueo} usuario`;
        this.loadingBloqueo = false;
        clearTimeout(backup);
        this.cdr.detectChanges();
      }
    });
  }

  closeModal() {
    this.close.emit();
  }

  getFotoUrl(foto: any): string {
    if (!foto) return '';
    if (typeof foto === 'string') {
      if (foto.startsWith('http://') || foto.startsWith('https://') || foto.startsWith('/')) {
        return foto;
      }
    }
    return `/${foto}`;
  }
}
