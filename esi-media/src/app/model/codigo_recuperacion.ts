import { Usuario } from './usuario';

export class Codigo_recuperacion {
    private codigo: string;
    private fecha_expiracion: string;
    public unnamed_Usuario_?: Usuario;

    constructor(codigo: string, fecha_expiracion: string, unnamed_Usuario_: Usuario | undefined) {
        this.codigo = codigo;
        this.fecha_expiracion = fecha_expiracion;
        this.unnamed_Usuario_ = unnamed_Usuario_;
    }

    public get_codigo(): string { return this.codigo; }
    public set_codigo(c: string) { this.codigo = c; }

    public get_fecha_expiracion(): string { return this.fecha_expiracion; }
    public set_fecha_expiracion(f: string) { this.fecha_expiracion = f; }

    public get_unnamed_Usuario_(): Usuario | undefined { return this.unnamed_Usuario_; }
    public set_unnamed_Usuario_(u: Usuario | undefined) { this.unnamed_Usuario_ = u; }
}
