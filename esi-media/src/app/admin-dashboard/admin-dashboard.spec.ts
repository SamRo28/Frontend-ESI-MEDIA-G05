import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { AdminDashboardComponent } from './admin-dashboard';
import { AdminService, Usuario } from '../services/admin.service';

describe('AdminDashboard', () => {
  let component: AdminDashboardComponent;
  let fixture: ComponentFixture<AdminDashboardComponent>;

  const mockAdminService = {
    getUsuarios: jasmine.createSpy('getUsuarios').and.returnValue(of([])),
    bloquearUsuario: jasmine.createSpy('bloquearUsuario').and.returnValue(of({ mensaje: 'Usuario bloqueado correctamente' })),
    desbloquearUsuario: jasmine.createSpy('desbloquearUsuario').and.returnValue(of({ mensaje: 'Usuario desbloqueado correctamente' })),
    updateProfile: jasmine.createSpy('updateProfile').and.returnValue(of({})),
    deleteUser: jasmine.createSpy('deleteUser').and.returnValue(of({}))
  } as unknown as AdminService;

  const mockRouter = {
    navigate: jasmine.createSpy('navigate')
  } as unknown as Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDashboardComponent],
      providers: [
        { provide: AdminService, useValue: mockAdminService },
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: Router, useValue: mockRouter }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('abre modal de bloqueo con acción correcta según estado', () => {
    const uActivo: Usuario = { id: 'u1', nombre: 'N', apellidos: 'A', email: 'e', departamento: '', rol: 'Visualizador', bloqueado: false };
    const uBloq: Usuario = { id: 'u2', nombre: 'N2', apellidos: 'A2', email: 'e2', departamento: '', rol: 'Visualizador', bloqueado: true };

    component.abrirModalBloqueo(uActivo);
    expect(component.showBloqueoModal).toBeTrue();
    expect(component.accionBloqueo).toBe('bloquear');

    component.cerrarModalBloqueo();

    component.abrirModalBloqueo(uBloq);
    expect(component.showBloqueoModal).toBeTrue();
    expect(component.accionBloqueo).toBe('desbloquear');
  });

  it('bloquea usuario y actualiza la tabla inmediatamente', fakeAsync(() => {
    // Preparar datos
    component.currentUser = { id: 'admin1', email: 'admin@test.com' };
    const admin: Usuario = { id: 'admin1', nombre: 'Admin', apellidos: 'A', email: 'admin@test.com', departamento: '', rol: 'Administrador', bloqueado: false };
    const user: Usuario = { id: 'user1', nombre: 'User', apellidos: 'U', email: 'user@test.com', departamento: '', rol: 'Visualizador', bloqueado: false };
    component.usuarios = [admin, user];
    component.aplicarFiltros();

    // Abrir modal y confirmar
    component.abrirModalBloqueo(user);
    component.confirmarBloqueo();

    // UI inmediata actualizada
    const actualizado = component.usuarios.find(u => u.id === 'user1');
    expect(actualizado?.bloqueado).toBeTrue();
    expect(component.showBloqueoModal).toBeFalse();
    expect(component['loadingBloqueo']).toBeFalse();

    // Se programa recarga diferida
    const spyRecarga = spyOn(component, 'loadUsuarios');
    tick(600);
    expect(spyRecarga).toHaveBeenCalled();
  }));

  it('desbloquea usuario y actualiza la tabla inmediatamente', fakeAsync(() => {
    // Preparar datos
    component.currentUser = { id: 'admin1', email: 'admin@test.com' };
    const admin: Usuario = { id: 'admin1', nombre: 'Admin', apellidos: 'A', email: 'admin@test.com', departamento: '', rol: 'Administrador', bloqueado: false };
    const user: Usuario = { id: 'user2', nombre: 'User2', apellidos: 'U2', email: 'user2@test.com', departamento: '', rol: 'Visualizador', bloqueado: true };
    component.usuarios = [admin, user];
    component.aplicarFiltros();

    // Abrir modal y confirmar
    component.abrirModalBloqueo(user); // debería poner accion = 'desbloquear'
    component.confirmarBloqueo();

    // UI inmediata actualizada
    const actualizado = component.usuarios.find(u => u.id === 'user2');
    expect(actualizado?.bloqueado).toBeFalse();
    expect(component.showBloqueoModal).toBeFalse();
    expect(component['loadingBloqueo']).toBeFalse();

    // Se programa recarga diferida
    const spyRecarga = spyOn(component, 'loadUsuarios');
    tick(600);
    expect(spyRecarga).toHaveBeenCalled();
  }));
});
