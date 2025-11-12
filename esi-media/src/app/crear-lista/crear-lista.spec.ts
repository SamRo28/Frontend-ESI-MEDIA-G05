import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { CrearListaPageComponent } from './crear-lista-page';

describe('CrearListaPageComponent', () => {
  let component: CrearListaPageComponent;
  let fixture: ComponentFixture<CrearListaPageComponent>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [CrearListaPageComponent],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrearListaPageComponent);
    component = fixture.componentInstance;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate back to gestion-listas when goBack is called', () => {
    component.goBack();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/gestion-listas']);
  });

  it('should navigate back to gestion-listas when lista is created', () => {
    const mockLista = { id: '1', nombre: 'Test Lista' };
    component.onListaCreada(mockLista);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/gestion-listas']);
  });

  it('should load user info on init', () => {
    spyOn(component, 'loadUserInfo');
    component.ngOnInit();
    expect(component.loadUserInfo).toHaveBeenCalled();
  });
});