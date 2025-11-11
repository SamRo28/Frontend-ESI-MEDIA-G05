import { Component, OnInit, ChangeDetectorRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, ContenidoResumen, ContenidoDetalle } from '../services/admin.service';
import { ContentDetailModalComponent } from '../content-detail-modal.component/content-detail-modal.component';

@Component({
  selector: 'app-content-management',
  templateUrl: './content-management.component.html',
  styleUrls: ['./content-management.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, ContentDetailModalComponent]
})
export class ContentManagementComponent implements OnInit {
  @Input() adminId?: string;
  
  contenidos: ContenidoResumen[] = [];
  contenidosFiltrados: ContenidoResumen[] = [];
  
  // Filtros
  filtroTipoContenido: 'Todos' | 'Audio' | 'Video' = 'Todos';
  busquedaContenido = '';
  
  // Modal de detalle
  showContenidoModal = false;
  detalleContenido: ContenidoDetalle | null = null;
  loadingContenido = false;
  errorContenido = '';
  
  // Mensajes
  successMessage = '';
  errorMessage = '';

  constructor(
    private readonly adminService: AdminService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadContenidos();
  }

  loadContenidos() {
    if (!this.adminId) {
      this.errorMessage = 'No se pudo identificar al administrador';
      return;
    }

    this.errorContenido = '';
    this.loadingContenido = true;
    
    console.log('[Contenidos] Cargando con Admin-ID:', this.adminId);

    this.adminService.getContenidos(this.adminId).subscribe({
      next: (lista) => {
        console.log('[Contenidos] Recibidos:', Array.isArray(lista) ? lista.length : 'n/a', 'items');
        this.contenidos = lista || [];
        this.aplicarFiltrosContenidos();
        this.loadingContenido = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar contenidos:', err);
        this.errorMessage = err?.error?.message || err?.error?.error || 'Error al cargar contenidos';
        this.loadingContenido = false;
        this.cdr.detectChanges();
      }
    });
  }

  aplicarFiltrosContenidos() {
    let arr = [...this.contenidos];
    
    if (this.filtroTipoContenido !== 'Todos') {
      arr = arr.filter(c => c.tipo === this.filtroTipoContenido);
    }
    
    if (this.busquedaContenido.trim()) {
      const q = this.busquedaContenido.trim().toLowerCase();
      arr = arr.filter(c => 
        (c.titulo || '').toLowerCase().includes(q) || 
        (c.gestorNombre || '').toLowerCase().includes(q)
      );
    }
    
    this.contenidosFiltrados = arr;
  }

  onFiltroTipoContenidoChange() {
    this.aplicarFiltrosContenidos();
  }

  onBusquedaContenidoChange() {
    this.aplicarFiltrosContenidos();
  }

  limpiarFiltrosContenidos() {
    this.filtroTipoContenido = 'Todos';
    this.busquedaContenido = '';
    this.aplicarFiltrosContenidos();
  }

  verDetalleContenido(contenido: ContenidoResumen) {
    if (!this.adminId) {
      this.errorContenido = 'No se pudo identificar al administrador';
      return;
    }

    this.showContenidoModal = true;
    this.loadingContenido = true;
    this.errorContenido = '';
    this.detalleContenido = null;

    this.adminService.getContenidoDetalle(contenido.id, this.adminId).subscribe({
      next: (detalle) => {
        this.detalleContenido = detalle;
        this.loadingContenido = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar detalle del contenido:', err);
        this.errorContenido = 'No se pudo cargar el detalle del contenido';
        this.loadingContenido = false;
        this.cdr.detectChanges();
      }
    });
  }

  cerrarContenidoModal() {
    this.showContenidoModal = false;
    this.detalleContenido = null;
    this.loadingContenido = false;
    this.errorContenido = '';
  }
}