import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ListaService } from '../services/lista.service';
import { Lista } from '../model/lista';

@Component({
  selector: 'crear-lista',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './crear-lista.html',
  styleUrls: ['./crear-lista.css']
})
export class CrearListaComponent {
  @Input() modo: 'gestor' | 'visualizador' = 'visualizador';
  @Output() creada = new EventEmitter<any>();
  @Output() cancelada = new EventEmitter<void>();

  listaForm: FormGroup;
  guardando: boolean = false;

  constructor(private fb: FormBuilder, private listaService: ListaService) {
    this.listaForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: ['', [Validators.required, Validators.minLength(10)]],
      visible: [false],
      tagsInput: ['']
    });

    if (this.modo === 'visualizador') {
      this.listaForm.patchValue({ visible: false });
      this.listaForm.get('visible')?.disable();
    }
  }

  private parseTags(tagsInput: string): string[] {
    if (!tagsInput || tagsInput.trim() === '') return [];
    return tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0);
  }

  onSubmit(): void {
    if (this.listaForm.invalid) {
      this.listaForm.markAllAsTouched();
      return;
    }

    this.guardando = true;

    const fv = this.listaForm.getRawValue();
    const datos = {
      nombre: fv.nombre.trim(),
      descripcion: fv.descripcion.trim(),
      visible: this.modo === 'gestor' ? fv.visible : false,
      tags: this.parseTags(fv.tagsInput)
    };

    this.listaService.crearLista(datos).subscribe({
      next: (res: any) => {
        this.guardando = false;
        if (res && res.success) {
          // Emitir la lista creada al componente padre
          this.creada.emit(res.lista || {});
          this.listaForm.reset({ nombre: '', descripcion: '', visible: this.modo === 'gestor' ? false : false, tagsInput: '' });
        } else {
          console.error('Respuesta inesperada al crear lista', res);
          // Mostrar feedback simple
          alert(res?.mensaje || 'No se pudo crear la lista');
        }
      },
      error: (err: any) => {
        this.guardando = false;
        console.error('Error creando lista:', err);
        alert('Error al crear la lista. Revisa la consola.');
      }
    });
  }

  onCancelar(): void {
    this.cancelada.emit();
  }
}
