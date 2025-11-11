import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, Usuario } from '../services/admin.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-edit-user-modal',
  templateUrl: './edit-user-modal.component.html',
  styleUrls: ['./edit-user-modal.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class EditUserModalComponent implements OnInit {
  @Input() usuario!: Usuario;
  @Input() fotosDisponibles: Array<{id: string, nombre: string}> = [];
  @Output() close = new EventEmitter<void>();
  @Output() userUpdated = new EventEmitter<void>();

  editUserForm: any = {};
  showEditConfirmation = false;
  isUpdating = false;
  successMessage = '';
  errorMessage = '';

  // Utilidades de fecha
  todayStr: string = '';
  minAllowedBirthStr: string = '';
  maxBirthForFourYearsStr: string = '';

  constructor(
    private readonly adminService: AdminService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.initializeDateValues();
    this.loadUserData();
  }

  private initializeDateValues() {
    const today = new Date();
    this.todayStr = this.toDateInputValue(today);

    const fourYearsAgo = new Date(today.getFullYear() - 4, today.getMonth(), today.getDate());
    this.maxBirthForFourYearsStr = this.toDateInputValue(fourYearsAgo);

    const minBirth = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
    this.minAllowedBirthStr = this.toDateInputValue(minBirth);
  }

  private toDateInputValue(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private loadUserData() {
    this.editUserForm = {
      id: this.usuario.id,
      nombre: this.usuario.nombre,
      apellidos: this.usuario.apellidos,
      email: this.usuario.email,
      foto: this.usuario.foto,
      departamento: this.usuario.departamento || '',
      rol: this.usuario.rol || 'Visualizador',
      bloqueado: this.usuario.bloqueado,
      alias: '',
      especialidad: '',
      descripcion: '',
      tipocontenidovideooaudio: '',
      fecharegistro: null,
      fechanac: '',
      vip: false
    };

    this.loadUserDetails(this.usuario.id!, this.usuario.rol || 'Visualizador');
  }

  private loadUserDetails(userId: string, rol: string) {
    switch (rol) {
      case 'Administrador':
        this.adminService.getAdministradorById(userId).subscribe({
          next: (response) => this.processUserDetails(response, 'Administrador'),
          error: (error) => this.handleUserDetailsError(error, 'Administrador')
        });
        break;
      case 'Gestor':
        this.adminService.getGestorById(userId).subscribe({
          next: (response) => this.processUserDetails(response, 'Gestor'),
          error: (error) => this.handleUserDetailsError(error, 'Gestor')
        });
        break;
      case 'Visualizador':
      default:
        this.adminService.getVisualizadorById(userId).subscribe({
          next: (response) => this.processUserDetails(response, 'Visualizador'),
          error: (error) => this.handleUserDetailsError(error, 'Visualizador')
        });
        break;
    }
  }

  private processUserDetails(response: any, rol: string) {
    let userDetails: any;
    
    if (response && typeof response === 'object') {
      userDetails = response;
    } else {
      this.errorMessage = 'Error: no se pudieron cargar los datos del usuario';
      return;
    }
    
    this.editUserForm = {
      ...this.editUserForm,
      ...userDetails
    };
    
    if (userDetails.campoespecializacion) {
      this.editUserForm.especialidad = userDetails.campoespecializacion;
    }
    
    if (userDetails.fechaNac || userDetails.fechanac) {
      const fechaNac = userDetails.fechaNac || userDetails.fechanac;
      this.editUserForm.fechanac = this.formatDateForInput(fechaNac);
    }
    
    if (userDetails.fechaRegistro || userDetails.fecharegistro) {
      const fechaRegistro = userDetails.fechaRegistro || userDetails.fecharegistro;
      this.editUserForm.fecharegistro = this.formatDateForInput(fechaRegistro);
    }
    
    if (userDetails.alias) {
      this.editUserForm.alias = userDetails.alias;
    }
    
    this.cdr.detectChanges();
  }

  private formatDateForInput(dateValue: any): string {
    if (!dateValue) return '';
    
    try {
      let date: Date;
      
      if (dateValue instanceof Date) {
        date = dateValue;
      } else if (typeof dateValue === 'string') {
        date = new Date(dateValue);
      } else if (typeof dateValue === 'number') {
        date = new Date(dateValue);
      } else {
        return '';
      }
      
      if (Number.isNaN(date.getTime())) {
        return '';
      }
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      return '';
    }
  }

  private handleUserDetailsError(error: any, rol: string) {
    console.error(`❌ Error cargando detalles del ${rol}:`, error);
    this.errorMessage = `No se pudieron cargar todos los detalles del usuario`;
    
    setTimeout(() => {
      this.errorMessage = '';
    }, 8000);
  }

  confirmUserChanges() {
    let requiredFields: string[] = ['nombre', 'apellidos', 'email'];
    
    if (this.editUserForm.rol === 'Administrador') {
      requiredFields.push('departamento');
    } else if (this.editUserForm.rol === 'Gestor') {
      requiredFields.push('alias');
    }

    const emptyFields = requiredFields.filter(field => !this.editUserForm[field]?.trim());
    
    if (emptyFields.length > 0) {
      this.errorMessage = `Complete los siguientes campos obligatorios: ${emptyFields.join(', ')}`;
      return;
    }

    this.showEditConfirmation = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  async saveUserChanges() {
    if (!this.editUserForm || !this.editUserForm.id || this.isUpdating) return;

    this.isUpdating = true;
    try {
      const rol = this.editUserForm.rol || 'Visualizador';
      await firstValueFrom(this.adminService.updateUser(this.editUserForm.id, this.editUserForm, rol));

      await new Promise(res => setTimeout(res, 200));
      this.showEditConfirmation = false;
      this.userUpdated.emit();
      this.closeModal();
    } catch (e) {
      console.error('Error al guardar cambios del usuario:', e);
      this.errorMessage = 'No se pudieron guardar los cambios. Inténtalo de nuevo.';
    } finally {
      this.isUpdating = false;
      this.cdr.detectChanges();
    }
  }

  cancelUserChanges() {
    this.showEditConfirmation = false;
  }

  closeModal() {
    this.close.emit();
  }

  getUserTypeDisplayName(rol: string): string {
    switch (rol) {
      case 'Administrador':
        return 'Administrador';
      case 'Gestor':
        return 'Gestor de Contenido';
      case 'Visualizador':
      default:
        return 'Visualizador';
    }
  }
}