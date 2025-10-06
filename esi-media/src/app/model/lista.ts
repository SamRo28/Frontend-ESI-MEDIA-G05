import { Usuario } from './usuario';
import { Contenido } from './contenido';

export class Lista {
    private nombre: string;
    private usuario: Usuario | undefined;
    public publico: string | undefined;
    public contenidos: Contenido[] = [];

    constructor(nombre: string, usuario?: Usuario, publico?: string, contenidos: Contenido[] = []) {
        this.nombre = nombre;
        this.usuario = usuario;
        this.publico = publico;
        this.contenidos = contenidos;
    }

    public getNombre(): string { return this.nombre; }
    public setNombre(n: string) { this.nombre = n; }

    public getUsuario(): Usuario | undefined { return this.usuario; }
    public setUsuario(u: Usuario | undefined) { this.usuario = u; }

    public getPublico(): string | undefined { return this.publico; }
    public setPublico(p: string | undefined) { this.publico = p; }

    public getContenidos(): Contenido[] { return this.contenidos; }
    public setContenidos(c: Contenido[]) { this.contenidos = c; }
}
