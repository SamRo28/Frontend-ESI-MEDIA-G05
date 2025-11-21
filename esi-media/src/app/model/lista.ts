import { Usuario } from './usuario';
import { Contenido } from './contenido';

export class Lista {
    id?: string;
    private nombre: string;
    private descripcion: string;
    private visible: boolean;
    private creadorId: string;
    private tags: string[];
    private especializacionGestor?: string;
    private contenidosIds: string[];
    private fechaCreacion?: Date;
    private fechaActualizacion?: Date;
    
    // Campos legacy para compatibilidad
    private usuario?: Usuario;
    public publico?: string;
    public contenidos: Contenido[] = [];

    constructor(
        nombre: string,
        descripcion: string,
        visible: boolean,
        creadorId: string,
        tags: string[] = [],
        contenidosIds: string[] = [],
        usuario?: Usuario,
        publico?: string,
        contenidos: Contenido[] = []
    ) {
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.visible = visible;
        this.creadorId = creadorId;
        this.tags = tags;
        this.contenidosIds = contenidosIds;
        this.usuario = usuario;
        this.publico = publico;
        this.contenidos = contenidos;
    }

    // Getters y Setters
    public getNombre(): string { return this.nombre; }
    public setNombre(n: string) { this.nombre = n; }

    public getDescripcion(): string { return this.descripcion; }
    public setDescripcion(d: string) { this.descripcion = d; }

    public isVisible(): boolean { return this.visible; }
    public setVisible(v: boolean) { this.visible = v; }

    public getCreadorId(): string { return this.creadorId; }
    public setCreadorId(c: string) { this.creadorId = c; }

    public getTags(): string[] { return this.tags; }
    public setTags(t: string[]) { this.tags = t; }

    public getEspecializacionGestor(): string | undefined { return this.especializacionGestor; }
    public setEspecializacionGestor(e: string | undefined) { this.especializacionGestor = e; }

    public getContenidosIds(): string[] { return this.contenidosIds; }
    public setContenidosIds(c: string[]) { this.contenidosIds = c; }

    public getFechaCreacion(): Date | undefined { return this.fechaCreacion; }
    public setFechaCreacion(f: Date | undefined) { this.fechaCreacion = f; }

    public getFechaActualizacion(): Date | undefined { return this.fechaActualizacion; }
    public setFechaActualizacion(f: Date | undefined) { this.fechaActualizacion = f; }

    // Métodos legacy para compatibilidad
    public getUsuario(): Usuario | undefined { return this.usuario; }
    public setUsuario(u: Usuario | undefined) { this.usuario = u; }

    public getPublico(): string | undefined { return this.publico; }
    public setPublico(p: string | undefined) { this.publico = p; }

    public getContenidos(): Contenido[] { return this.contenidos; }
    public setContenidos(c: Contenido[]) { this.contenidos = c; }
}
