import { Usuario } from './usuario';
import { Lista } from './lista';
import { Contenido } from './contenido';

export class Visualizador extends Usuario {
    private alias?: string;
    private fecha_nac?: Date;
    private vip: boolean = false;
    public listas_privadas: Lista[] = [];
    public contenido_fav: Contenido[] = [];

    constructor(apellidos: string, bloqueado: boolean, contrasenia: any, email: string, foto: any,
        nombre: string, alias?: string, fechaNac?: Date, vip: boolean = false) {
        super(apellidos, bloqueado, contrasenia, email, foto, nombre);
        this.alias = alias;
        this.fecha_nac = fechaNac;
        this.vip = vip;
        this.listas_privadas = [];
        this.contenido_fav = [];
    }

    public Visualizar(aC: Contenido) {
        throw new Error('UnsupportedOperationException');
    }

    public getAlias(): string | undefined { return this.alias; }
    public setAlias(a: string | undefined) { this.alias = a; }

    public getFechaNac(): Date | undefined { return this.fecha_nac; }
    public setFechaNac(d: Date | undefined) { this.fecha_nac = d; }

    public isVip(): boolean { return this.vip; }
    public setVip(v: boolean) { this.vip = v; }
}
