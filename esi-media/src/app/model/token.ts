import { Usuario } from './usuario';

export class Token {
    private token: string;
    private fecha_expiracion?: Date;
    private expirado: boolean;
    public usuario?: Usuario;

    constructor(expirado: boolean, fecha_expiracion: Date | undefined, token: string, usuario?: Usuario) {
        this.expirado = expirado;
        this.fecha_expiracion = fecha_expiracion;
        this.token = token;
        this.usuario = usuario;
    }

    public getToken(): string { return this.token; }
    public setToken(t: string) { this.token = t; }

    public getFechaExpiracion(): Date | undefined { return this.fecha_expiracion; }
    public setFechaExpiracion(d: Date | undefined) { this.fecha_expiracion = d; }

    public isExpirado(): boolean { return this.expirado; }
    public setExpirado(e: boolean) { this.expirado = e; }
}
