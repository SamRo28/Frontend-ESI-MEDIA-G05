import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ContentService } from '../services/content.service';
import { GestorDashboardComponent } from './gestor-dashboard';

describe('GestorDashboardComponent', () => {
  let component: GestorDashboardComponent;
  let fixture: ComponentFixture<GestorDashboardComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockContentService: jasmine.SpyObj<ContentService>;

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const contentServiceSpy = jasmine.createSpyObj('ContentService', ['uploadAudio', 'uploadVideo']);

    await TestBed.configureTestingModule({
      imports: [GestorDashboardComponent],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: ContentService, useValue: contentServiceSpy }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestorDashboardComponent);
    component = fixture.componentInstance;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  beforeEach(() => {
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load user info on init', () => {
    spyOn(component, 'loadUserInfo');
    spyOn(component, 'loadDashboardStats');
    
    component.ngOnInit();
    
    expect(component.loadUserInfo).toHaveBeenCalled();
    expect(component.loadDashboardStats).toHaveBeenCalled();
  });

  it('should navigate to upload (audio by default)', () => {
    component.navigateToUpload();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/audio/subir']);
  });

  it('should navigate to upload (video when gestorType is video)', () => {
    component.gestorType = 'video';
    component.navigateToUpload();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/video/subir']);
  });

  it('should logout and navigate to login', () => {
    spyOn(sessionStorage, 'removeItem');
    
    component.logout();
    
    expect(sessionStorage.removeItem).toHaveBeenCalledWith('token');
    expect(sessionStorage.removeItem).toHaveBeenCalledWith('email');
    expect(sessionStorage.removeItem).toHaveBeenCalledWith('currentUserClass');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should load user info from sessionStorage', () => {
    spyOn(sessionStorage, 'getItem').and.callFake((key: string) => {
      if (key === 'email') return 'test@example.com';
      if (key === 'currentUserClass') return 'gestor_de_contenido';
      return null;
    });

    component.loadUserInfo();

    expect(component.userName).toBe('test');
    expect(component.gestorType).toBe('audio');
  });

  it('should load dashboard stats', () => {
    component.loadDashboardStats();

    expect(component.stats.totalContent).toBe(0);
    expect(component.stats.audioCount).toBe(0);
    expect(component.stats.videoCount).toBe(0);
    expect(component.stats.recentUploads.length).toBe(0);
    expect(component.isLoading).toBeFalse();
  });
});