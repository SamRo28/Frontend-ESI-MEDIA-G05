import { Codigo_recuperacion } from './codigo_recuperacion';
import { Token } from './token';
import { Contrasenia } from './contrasenia';

export class Usuario {
    id?: string;
    nombre: string;
    apellidos: string;
    email: string;
    foto: any;
    bloqueado: boolean;
    rol?: string;
    apodo?: string;
    departamento?: string;
    public codigos_recuperacion_: Codigo_recuperacion[] = [];
    public sesions_token_: Token[] = [];
    public contrasenia?: Contrasenia;

    constructor(apellidos: string, bloqueado: boolean, contrasenia: Contrasenia | undefined, email: string, foto: any, nombre: string) {
        this.apellidos = apellidos;
        this.bloqueado = bloqueado;
        this.contrasenia = contrasenia;
        this.email = email;
        this.foto = foto;
        this.nombre = nombre;
    }

    public getNombre(): string { return this.nombre; }
    public setNombre(n: string) { this.nombre = n; }

    public getApellidos(): string { return this.apellidos; }
    public setApellidos(a: string) { this.apellidos = a; }

    public getEmail(): string { return this.email; }
    public setEmail(e: string) { this.email = e; }

    public isBloqueado(): boolean { return this.bloqueado; }
    public setBloqueado(b: boolean) { this.bloqueado = b; }
}
