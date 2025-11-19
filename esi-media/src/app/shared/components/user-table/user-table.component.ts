import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Usuario {
  id?: number;
  username: string;
  email: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento: string;
  telefono: string;
  genero: string;
  fechaCreacion?: string;
  ultimoAcceso?: string;
  estado: boolean;
  rol: 'ADMINISTRADOR' | 'VISUALIZADOR' | 'GESTOR_CONTENIDOS';
}

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  type?: 'text' | 'date' | 'boolean' | 'badge';
  width?: string;
}

export interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

@Component({
  selector: 'app-user-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-table.component.html',
  styleUrls: ['./user-table.component.css']
})
export class UserTableComponent {
  @Input() users: Usuario[] = [];
  @Input() loading: boolean = false;
  @Input() searchTerm: string = '';
  @Input() showActions: boolean = true;
  @Input() selectable: boolean = false;
  @Input() pageSize: number = 10;
  
  @Output() userSelect = new EventEmitter<Usuario>();
  @Output() userEdit = new EventEmitter<Usuario>();
  @Output() userDelete = new EventEmitter<Usuario>();
  @Output() userToggleStatus = new EventEmitter<Usuario>();
  @Output() searchTermChange = new EventEmitter<string>();
  @Output() sortChange = new EventEmitter<SortConfig>();

  // Estado interno del componente
  selectedUsers: Set<number> = new Set();
  currentPage: number = 1;
  sortConfig: SortConfig | null = null;

  // Configuración de columnas
  columns: TableColumn[] = [
    { key: 'username', label: 'Usuario', sortable: true, width: '15%' },
    { key: 'nombres', label: 'Nombres', sortable: true, width: '15%' },
    { key: 'apellidos', label: 'Apellidos', sortable: true, width: '15%' },
    { key: 'email', label: 'Email', sortable: true, width: '20%' },
    { key: 'rol', label: 'Rol', type: 'badge', sortable: true, width: '10%' },
    { key: 'estado', label: 'Estado', type: 'boolean', sortable: true, width: '8%' },
    { key: 'fechaCreacion', label: 'F. Creación', type: 'date', sortable: true, width: '12%' },
    { key: 'ultimoAcceso', label: 'Último Acceso', type: 'date', sortable: true, width: '12%' }
  ];

  get filteredUsers(): Usuario[] {
    if (!this.searchTerm) {
      return this.users;
    }
    
    const search = this.searchTerm.toLowerCase();
    return this.users.filter(user => 
      user.username.toLowerCase().includes(search) ||
      user.nombres.toLowerCase().includes(search) ||
      user.apellidos.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search) ||
      user.rol.toLowerCase().includes(search)
    );
  }

  get sortedUsers(): Usuario[] {
    const filtered = this.filteredUsers;
    
    if (!this.sortConfig) {
      return filtered;
    }

    return [...filtered].sort((a, b) => {
      const aValue = this.getNestedValue(a, this.sortConfig!.column);
      const bValue = this.getNestedValue(b, this.sortConfig!.column);
      
      let comparison = 0;
      
      if (aValue < bValue) {
        comparison = -1;
      } else if (aValue > bValue) {
        comparison = 1;
      }
      
      return this.sortConfig!.direction === 'desc' ? comparison * -1 : comparison;
    });
  }

  get paginatedUsers(): Usuario[] {
    const sorted = this.sortedUsers;
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return sorted.slice(start, end);
  }

  get totalPages(): number {
    return Math.ceil(this.sortedUsers.length / this.pageSize);
  }

  get totalUsers(): number {
    return this.sortedUsers.length;
  }

  get startIndex(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalUsers);
  }

  onSearchTermChange(term: string): void {
    this.searchTermChange.emit(term);
    this.currentPage = 1; // Reset a la primera página
  }

  onSort(columnKey: string): void {
    if (!this.isColumnSortable(columnKey)) {
      return;
    }

    let direction: 'asc' | 'desc' = 'asc';
    
    if (this.sortConfig && this.sortConfig.column === columnKey) {
      direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
    }
    
    this.sortConfig = { column: columnKey, direction };
    this.sortChange.emit(this.sortConfig);
  }

  getSortIcon(columnKey: string): string {
    if (!this.sortConfig || this.sortConfig.column !== columnKey) {
      return '';
    }
    return this.sortConfig.direction === 'asc' ? '↑' : '↓';
  }

  isColumnSortable(columnKey: string): boolean {
    const column = this.columns.find(col => col.key === columnKey);
    return column ? column.sortable || false : false;
  }

  onUserSelect(user: Usuario): void {
    this.userSelect.emit(user);
  }

  onUserEdit(user: Usuario): void {
    this.userEdit.emit(user);
  }

  onUserDelete(user: Usuario): void {
    this.userDelete.emit(user);
  }

  onUserToggleStatus(user: Usuario): void {
    this.userToggleStatus.emit(user);
  }

  toggleUserSelection(userId: number): void {
    if (this.selectedUsers.has(userId)) {
      this.selectedUsers.delete(userId);
    } else {
      this.selectedUsers.add(userId);
    }
  }

  isUserSelected(userId: number): boolean {
    return this.selectedUsers.has(userId);
  }

  selectAllUsers(): void {
    this.paginatedUsers.forEach(user => {
      if (user.id) {
        this.selectedUsers.add(user.id);
      }
    });
  }

  deselectAllUsers(): void {
    this.selectedUsers.clear();
  }

  get allUsersSelected(): boolean {
    return this.paginatedUsers.every(user => 
      user.id ? this.selectedUsers.has(user.id) : false
    );
  }

  get someUsersSelected(): boolean {
    return this.paginatedUsers.some(user => 
      user.id ? this.selectedUsers.has(user.id) : false
    );
  }

  toggleAllUsersSelection(): void {
    if (this.allUsersSelected) {
      this.deselectAllUsers();
    } else {
      this.selectAllUsers();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  previousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  getCellValue(user: Usuario, column: TableColumn): any {
    return this.getNestedValue(user, column.key);
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj) || '';
  }

  getRoleBadgeClass(rol: string): string {
    const roleClasses = {
      'ADMINISTRADOR': 'badge-admin',
      'GESTOR_CONTENIDOS': 'badge-gestor',
      'VISUALIZADOR': 'badge-visualizador'
    };
    return roleClasses[rol as keyof typeof roleClasses] || 'badge-default';
  }

  getRoleLabel(rol: string): string {
    const roleLabels = {
      'ADMINISTRADOR': 'Administrador',
      'GESTOR_CONTENIDOS': 'Gestor',
      'VISUALIZADOR': 'Visualizador'
    };
    return roleLabels[rol as keyof typeof roleLabels] || rol;
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  }

  formatDateTime(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  }
}