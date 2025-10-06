import { Usuario } from './usuario';

export class Contrasenia {
    private fecha_expiracion?: Date;
    private contrasenia_actual?: string;
    private contrasenia_usadas?: string[];
    public unnamed_Usuario_?: Usuario;

    public getFechaExpiracion(): Date | undefined { return this.fecha_expiracion; }
    public setFechaExpiracion(d: Date | undefined) { this.fecha_expiracion = d; }

    public getContraseniaActual(): string | undefined { return this.contrasenia_actual; }
    public setContraseniaActual(c: string | undefined) { this.contrasenia_actual = c; }

    public getContraseniasUsadas(): string[] | undefined { return this.contrasenia_usadas; }
    public setContraseniasUsadas(l: string[] | undefined) { this.contrasenia_usadas = l; }
}
