import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { fromEvent, merge, timer, Subscription } from 'rxjs';
import { debounceTime, switchMap, tap, filter } from 'rxjs/operators';
import { UserService } from '../../services/userService';

@Component({
  selector: 'app-inactivity-warning',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inactivity-warning.component.html',
  styleUrls: ['./inactivity-warning.component.css']
})
export class InactivityWarningComponent implements OnInit, OnDestroy {
  showWarning: boolean = false;
  remainingTime: number = 30;
  
  private activitySubscription?: Subscription;
  private routerSubscription?: Subscription;
  private countdownIntervalId?: any;
  private readonly isBrowser: boolean;
  private isMonitoringActive: boolean = false;
  
  // Configuración de tiempos en milisegundos
  private readonly INACTIVITY_TIME = 60 * 1000; // 1 minuto de inactividad
  private readonly WARNING_TIME = 30; // 30 segundos de advertencia
  
  // Rutas donde NO debe activarse el monitoreo
  private readonly EXCLUDED_ROUTES = ['/home', '/login', '/register'];
  
  constructor(
    private readonly router: Router,
    private readonly userService: UserService,
    private readonly cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private readonly platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    // Solo iniciar el monitoreo en el navegador
    if (this.isBrowser) {
      this.checkRouteAndStartMonitoring();
      this.subscribeToRouteChanges();
    }
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  /**
   * Verifica la ruta actual y decide si iniciar el monitoreo
   */
  private checkRouteAndStartMonitoring(): void {
    const currentUrl = this.router.url;
    if (this.shouldMonitorRoute(currentUrl)) {
      this.startActivityMonitoring();
    } else {
      this.stopActivityMonitoring();
    }
  }

  /**
   * Se suscribe a los cambios de ruta para activar/desactivar el monitoreo
   */
  private subscribeToRouteChanges(): void {
    if (!this.isBrowser) return;

    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const url = event.urlAfterRedirects || event.url;
        
        if (this.shouldMonitorRoute(url)) {
          if (!this.isMonitoringActive) {
            this.startActivityMonitoring();
          }
        } else {
          this.stopActivityMonitoring();
        }
      });
  }

  /**
   * Determina si se debe monitorear la ruta actual
   */
  private shouldMonitorRoute(url: string): boolean {
    // No monitorear en rutas excluidas
    if (this.EXCLUDED_ROUTES.some(route => url === route || url.startsWith(route + '/'))) {
      return false;
    }
    
    // No monitorear en rutas de detalle de contenido: /dashboard/{id}
    const dashboardDetailPattern = /^\/dashboard\/[^/]+$/;
    if (dashboardDetailPattern.test(url)) {
      return false;
    }
    
    return true;
  }

  /**
   * Inicia el monitoreo de actividad del usuario
   */
  private startActivityMonitoring(): void {
    if (!this.isBrowser || this.isMonitoringActive) return;
    
    this.isMonitoringActive = true;

    try {
      // Crear observables para diferentes eventos de actividad del usuario
      const mouseMove$ = fromEvent(document, 'mousemove');
      const mouseClick$ = fromEvent(document, 'click');
      const keyPress$ = fromEvent(document, 'keypress');
      const scroll$ = fromEvent(globalThis, 'scroll');
      const touchStart$ = fromEvent(document, 'touchstart');

      // Combinar todos los eventos de actividad
      const activity$ = merge(
        mouseMove$,
        mouseClick$,
        keyPress$,
        scroll$,
        touchStart$
      );

      // Usar startWith para emitir inmediatamente y luego en cada actividad
      const activityWithStart$ = merge(
        timer(0), // Emitir inmediatamente al iniciar
        activity$
      ).pipe(
        debounceTime(500), // Evitar demasiadas actualizaciones
        tap(() => {
          // Si hay actividad y el warning está visible, ocultarlo
          if (this.showWarning) {
            this.hideWarning();
          }
        }),
        switchMap(() => timer(this.INACTIVITY_TIME))
      );

      // Suscribirse al observable
      this.activitySubscription = activityWithStart$.subscribe(() => {
        this.onInactivityDetected();
      });
    } catch (error) {
      console.error('Error al iniciar monitoreo de actividad:', error);
    }
  }

  /**
   * Se ejecuta cuando se detecta inactividad
   */
  private onInactivityDetected(): void {
    if (!this.isBrowser) return;
    
    // Mostrar advertencia
    this.showWarning = true;
    this.remainingTime = this.WARNING_TIME;
    
    // Forzar detección de cambios
    this.cdr.markForCheck();
    this.cdr.detectChanges();
    
    // Iniciar cuenta regresiva
    this.startCountdown();
  }

  /**
   * Inicia la cuenta regresiva del warning
   */
  private startCountdown(): void {
    if (!this.isBrowser) return;

    // Limpiar contador anterior si existe
    if (this.countdownIntervalId) {
      clearInterval(this.countdownIntervalId);
    }

    // Actualizar cada segundo
    this.countdownIntervalId = setInterval(() => {
      this.remainingTime--;
      this.cdr.detectChanges();
      
      if (this.remainingTime <= 0) {
        this.performLogout();
      }
    }, 1000);
  }

  /**
   * Detiene el monitoreo de actividad
   */
  private stopActivityMonitoring(): void {
    if (this.activitySubscription) {
      this.activitySubscription.unsubscribe();
      this.activitySubscription = undefined;
    }
    
    this.hideWarning();
    this.isMonitoringActive = false;
  }

  /**
   * Oculta el warning y reinicia el monitoreo
   */
  hideWarning(): void {
    this.showWarning = false;
    this.remainingTime = this.WARNING_TIME;
    
    if (this.countdownIntervalId) {
      clearInterval(this.countdownIntervalId);
      this.countdownIntervalId = undefined;
    }
  }

  /**
   * Mantiene la sesión activa cuando el usuario interactúa con el warning
   */
  keepSession(): void {
    this.hideWarning();
  }

  /**
   * Realiza el logout del usuario
   */
  private performLogout(): void {
    if (!this.isBrowser) return;

    // Limpiar el warning
    this.hideWarning();
    
    // Llamar al servicio de logout
    this.userService.logout().subscribe({
      next: () => {
        this.clearSessionAndRedirect();
      },
      error: (err) => {
        console.error('Error al cerrar sesión por inactividad:', err);
        // Aún así, limpiar la sesión y redirigir
        this.clearSessionAndRedirect();
      }
    });
  }

  /**
   * Limpia la sesión y redirige al login
   */
  private clearSessionAndRedirect(): void {
    if (!this.isBrowser) return;

    try {
      // Limpiar sessionStorage
      sessionStorage.clear();
      
      // Redirigir al login
      this.router.navigate(['/home']);
    } catch (error) {
      console.error('Error al limpiar sesión:', error);
    }
  }

  /**
   * Limpia todas las suscripciones y timers
   */
  private cleanup(): void {
    if (this.activitySubscription) {
      this.activitySubscription.unsubscribe();
    }
    
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    
    if (this.countdownIntervalId) {
      clearInterval(this.countdownIntervalId);
    }
  }

  /**
   * Formatea el tiempo restante para mostrar
   */
  get formattedTime(): string {
    return `${this.remainingTime} segundo${this.remainingTime === 1 ? '' : 's'}`;
  }
}
