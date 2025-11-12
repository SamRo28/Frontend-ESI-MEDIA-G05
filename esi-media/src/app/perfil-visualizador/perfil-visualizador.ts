import { Component, OnInit, Inject, PLATFORM_ID, Output, EventEmitter } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService } from '../services/admin.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { timeout } from 'rxjs';

@Component({
  selector: 'app-perfil-visualizador',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './perfil-visualizador.html',
  styleUrls: ['./perfil-visualizador.css']
})
export class PerfilVisualizadorComponent implements OnInit {
  loading = false;
  errorMessage = '';
  successMessage = '';
  showConfirm = false;
  activeSection: 'info' | 'suscripcion' | 'seguridad' | 'dispositivos' = 'info';

  // Datos
  userId: string | null = null;
  email: string = '';
  form = {
    nombre: '', apellidos: '', alias: '', fechaNacimiento: '', foto: '', vip: false,
    currentPassword: '', newPassword: '', repeatPassword: ''
  };
  originalForm: any = null;

  // Reglas contraseña
  passwordRules = { minLength: false, upper: false, lower: false, number: false, special: false, match: true, noPersonal: true };

  // Avatares
  availableAvatars: string[] = ['perfil1.png', 'perfil2.png', 'perfil3.png', 'perfil4.png'];

  // Cambio de contraseña
  passwordVerified = false;
  verifyingPassword = false;
  passwordCheckError = '';
  passwordCheckOk = '';

  // Rol
  rol: string = 'Visualizador';

  // Suscripción
  subLoading = false;
  subError = '';
  subSuccess = '';
  showSubConfirm = false;
  pendingVip: boolean | null = null;
  lastSubscriptionChange?: string;
  subscriberSince?: string | null;
  selectedPlan: 'STD' | 'VIP' | null = null;
  get isVip(): boolean { return !!this.form.vip; }
  vipBenefits: string[] = ['Contenido VIP','Novedades destacadas','Mejor experiencia'];
  stdFeatures: string[] = ['Acceso al catalogo estandar','Hasta 2 dispositivos a la vez','2 descargas','TV, ordenador, movil, tableta'];
  vipFeatures: string[] = ['Acceso a contenido VIP','Hasta 4 dispositivos a la vez','6 descargas','Novedades destacadas'];
  stdDesc: string = 'Acceso al catalogo estandar, reproduccion fluida y sin complicaciones.';
  vipDesc: string = 'Mas dispositivos simultaneos y acceso a contenido VIP y novedades.';
  stdNotes: string[] = ['Cambios reversibles','Podrás volver a VIP','Sin permanencia'];

  constructor(
    private readonly adminService: AdminService,
    private readonly http: HttpClient,
    @Inject(PLATFORM_ID) private readonly platformId: Object
  ) {}

  @Output() close = new EventEmitter<void>();

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const raw = sessionStorage.getItem('user') || localStorage.getItem('currentUser');
        if (raw) { const u = JSON.parse(raw); this.userId = u?.id || u?._id || null; this.email = u?.email || ''; }
      } catch {}
    }
    if (this.userId) {
      this.loading = true;
      this.adminService.getUserById(this.userId).subscribe({
        next: (u: any) => {
          this.email = u?.email || this.email;
          this.form.nombre = u?.nombre || '';
          this.form.apellidos = u?.apellidos || '';
          this.form.alias = u?.alias || '';
          const fn = u?.fechaNacimiento || u?.fechanac;
          if (fn) { const d = new Date(fn); if (!isNaN(d.getTime())) this.form.fechaNacimiento = this.toDateInputValue(d); }
          this.form.foto = typeof u?.foto === 'string' ? u.foto : '';
          this.form.vip = !!u?.vip;
          const since = (u?.fechacambiosuscripcion || u?.fechaAlta || u?.createdAt || null);
          this.subscriberSince = since ? new Date(since).toISOString() : null;
          this.captureOriginal();
          this.loading = false;
          this.loadSubscription();
        },
        error: () => { this.loading = false; this.errorMessage = 'No se pudo cargar el perfil'; }
      });
    }
  }

  select(section: 'info' | 'suscripcion' | 'seguridad' | 'dispositivos') { this.activeSection = section; this.errorMessage=''; this.successMessage=''; }
  selectAvatar(file: string) { this.form.foto = file; }
  isInternalAvatar(file?: string): boolean { return !!file && /^perfil\d+\.png$/i.test(file); }
  getAvatarSrc(file?: string): string { return !file ? '/perfil1.png' : (this.isInternalAvatar(file) ? `/${file}` : file); }
  onFotoInput(value: string) { this.form.foto = value || ''; }

  verifyCurrentPassword(): void {
    if (!this.email || !this.form.currentPassword) { this.passwordCheckError = 'Introduce tu contraseña actual'; this.passwordCheckOk=''; return; }
    this.passwordCheckError=''; this.passwordCheckOk=''; this.verifyingPassword=true;
    this.http.post('http://localhost:8080/users/login', { email: this.email, password: this.form.currentPassword }).pipe(timeout(7000)).subscribe({
      next: () => { this.passwordVerified=true; this.verifyingPassword=false; this.passwordCheckOk='Contraseña verificada'; },
      error: () => { this.verifyingPassword=false; this.passwordVerified=false; this.passwordCheckError='La contraseña actual no es correcta. Vuelve a intentarlo.'; }
    });
  }

  private toDateInputValue(d: Date): string { const yyyy=d.getFullYear(); const mm=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0'); return `${yyyy}-${mm}-${dd}`; }
  private captureOriginal(): void { this.originalForm = { ...this.form }; }
  private restoreOriginal(): void { if (this.originalForm) this.form = { ...this.form, ...this.originalForm }; this.passwordVerified=false; this.verifyingPassword=false; this.form.currentPassword=''; this.form.newPassword=''; this.form.repeatPassword=''; this.passwordCheckError=''; this.passwordCheckOk=''; this.errorMessage=''; this.successMessage=''; this.showConfirm=false; }

  onPasswordInput(): void {
    const p = this.form.newPassword || '';
    this.passwordRules.minLength = p.length>=8 && p.length<=64;
    this.passwordRules.upper = /[A-Z]/.test(p);
    this.passwordRules.lower = /[a-z]/.test(p);
    this.passwordRules.number = /\d/.test(p);
    this.passwordRules.special = /[^A-Za-z0-9]/.test(p);
    this.passwordRules.match = this.form.newPassword === this.form.repeatPassword;
    const normalize=(s?:string)=>(s||'').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g,'');
    const pwd = normalize(this.form.newPassword);
    const tokens=[normalize(this.form.nombre),normalize(this.form.apellidos),normalize(this.form.alias),normalize((this.email||'').split('@')[0])].filter(t=>t&&t.length>=3) as string[];
    this.passwordRules.noPersonal = !tokens.some(t=>pwd.includes(t));
  }

  canSubmit(): boolean { if (this.loading) return false; return true; }
  openConfirm(): void { this.errorMessage=''; this.successMessage=''; if(!this.userId){ this.errorMessage='No se pudo identificar al usuario'; return; } this.showConfirm=true; }
  cancelConfirm(): void { this.showConfirm=false; }
  onCloseRequested(): void { this.restoreOriginal(); this.close.emit(); }

  save(): void {
    if (!this.userId || this.loading) return;
    this.showConfirm=false; this.loading=true; this.errorMessage=''; this.successMessage='';
    const userData:any={ nombre:this.form.nombre?.trim()||'', apellidos:this.form.apellidos?.trim()||'', alias:this.form.alias?.trim()||'', fechanac:this.form.fechaNacimiento||null, foto:this.form.foto||null, vip:!!this.form.vip };
    const doUpdate=()=>{ this.adminService.updateUser(this.userId!, userData, 'Visualizador').subscribe({
      next:()=>{ this.loading=false; this.successMessage='Perfil actualizado correctamente'; this.form.currentPassword=''; this.form.newPassword=''; this.form.repeatPassword=''; this.passwordVerified=false; this.passwordCheckOk=''; this.captureOriginal(); },
      error:(err:any)=>{ this.loading=false; const msg=err?.error?.mensaje||err?.message||'No se pudo actualizar el perfil'; this.errorMessage=msg; }
    }); };
    if(this.form.newPassword){ if(!this.passwordVerified){ this.loading=false; this.errorMessage='Verifica tu contraseña actual antes de cambiarla'; return; } this.onPasswordInput(); const ok=this.passwordRules.minLength&&this.passwordRules.upper&&this.passwordRules.lower&&this.passwordRules.number&&this.passwordRules.special&&this.passwordRules.match; if(!ok){ this.loading=false; this.errorMessage='Revisa los campos antes de guardar'; return; } (userData as any).contrasenia=this.form.newPassword; }
    doUpdate();
  }

  // =================== SUSCRIPCION ===================
  private getAuthHeaders(): HttpHeaders | null {
    const token = sessionStorage.getItem('token') || localStorage.getItem('authToken') || '';
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : null;
  }
  private getRawToken(): string | null { return sessionStorage.getItem('token') || localStorage.getItem('authToken'); }
  private buildOptions(): { headers?: HttpHeaders; observe: 'body' } {
    const headers = this.getAuthHeaders();
    return headers ? { headers, observe: 'body' } : { observe: 'body' };
  }
  loadSubscription(): void {
    if(!this.userId) return;
    let url = `http://localhost:8080/users/${this.userId}/subscription`;
    const tok = this.getRawToken();
    if (tok) url += (url.includes('?') ? '&' : '?') + 'auth=' + encodeURIComponent(tok);
    this.http.get<{vip:boolean;fechaCambio?:string}>(url, this.buildOptions()).subscribe({
      next:(res)=>{ if(typeof res?.vip==='boolean') this.form.vip=!!res.vip; this.lastSubscriptionChange=res?.fechaCambio||undefined; },
      error:()=>{}
    });
  }
  abrirCambioSuscripcion(nuevoVip:boolean): void { this.subError=''; this.subSuccess=''; this.pendingVip=nuevoVip; this.showSubConfirm=true; }
  cancelarCambioSuscripcion(): void { this.showSubConfirm=false; this.pendingVip=null; }
  selectPlan(plan: 'STD'|'VIP'): void { this.subError=''; this.subSuccess=''; this.selectedPlan = plan; }
  confirmarSeleccion(): void { if(this.selectedPlan===null) return; const targetVip = this.selectedPlan==='VIP'; if(targetVip===!!this.form.vip){ this.subError='Ya tienes ese plan seleccionado'; return; } this.abrirCambioSuscripcion(targetVip); }
  confirmarCambioSuscripcion(): void {
    if(!this.userId||this.pendingVip===null||this.subLoading) return;
    this.subLoading=true;
    let url = `http://localhost:8080/users/${this.userId}/subscription`;
    const tok = this.getRawToken();
    if (tok) url += (url.includes('?') ? '&' : '?') + 'auth=' + encodeURIComponent(tok);
    this.http.put<{vip:boolean;fechaCambio?:string}>(url,{vip:this.pendingVip}, this.buildOptions()).subscribe({
      next:(res)=>{ this.subLoading=false; this.showSubConfirm=false; this.form.vip=!!res?.vip; this.lastSubscriptionChange=res?.fechaCambio||new Date().toISOString(); if(this.originalForm) this.originalForm.vip=this.form.vip; this.subSuccess='Suscripcion actualizada correctamente'; },
      error:()=>{ this.subLoading=false; this.subError='No se pudo actualizar la suscripcion'; }
    });
  }
}