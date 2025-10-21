import { Lista } from './lista';
import { Visualizador } from './visualizador';

export class Contenido {
    protected titulo: string;
    protected descripcion: string;
    protected tags: string[];
    protected duracion: number;
    protected vip: boolean;
    protected estado: boolean;
    protected fecha_estado_automatico?: Date;
    protected fecha_disponible_hasta?: Date;
    protected edad_visualizacion: number;
    protected caratula: any;
    protected n_visualizaciones: number;
    protected gestorId: string;
    public unnamed_Lista_: Lista[] = [];
    public unnamed_Visualizador_: Visualizador[] = [];

    constructor(titulo: string, descripcion: string, tags: string[], duracion: number, vip: boolean,
        estado: boolean, fecha_estado_automatico: Date | undefined, fecha_disponible_hasta: Date | undefined,
        edad_visualizacion: number, caratula: any, n_visualizaciones: number, gestorId: string, unnamed_Lista_: Lista[],
        unnamed_Visualizador_: Visualizador[]) {
        this.titulo = titulo;
        this.descripcion = descripcion;
        this.tags = tags;
        this.duracion = duracion;
        this.vip = vip;
        this.estado = estado;
        this.fecha_estado_automatico = fecha_estado_automatico;
        this.fecha_disponible_hasta = fecha_disponible_hasta;
        this.edad_visualizacion = edad_visualizacion;
        this.caratula = caratula;
        this.n_visualizaciones = n_visualizaciones;
        this.gestorId = gestorId;
        this.unnamed_Lista_ = unnamed_Lista_;
        this.unnamed_Visualizador_ = unnamed_Visualizador_;
    }

    public get_titulo(): string { return this.titulo; }
    public set_titulo(t: string) { this.titulo = t; }

    public get_descripcion(): string { return this.descripcion; }
    public set_descripcion(d: string) { this.descripcion = d; }

    public get_tags(): string[] { return this.tags; }
    public set_tags(tags: string[]) { this.tags = tags; }

    public get_duracion(): number { return this.duracion; }
    public set_duracion(d: number) { this.duracion = d; }

    public is_vip(): boolean { return this.vip; }
    public set_vip(v: boolean) { this.vip = v; }

    public is_estado(): boolean { return this.estado; }
    public set_estado(e: boolean) { this.estado = e; }

    public get_fecha_estado_automatico(): Date | undefined { return this.fecha_estado_automatico; }
    public set_fecha_estado_automatico(d: Date | undefined) { this.fecha_estado_automatico = d; }

    public get_fecha_disponible_hasta(): Date | undefined { return this.fecha_disponible_hasta; }
    public set_fecha_disponible_hasta(d: Date | undefined) { this.fecha_disponible_hasta = d; }

    public get_edad_visualizacion(): number { return this.edad_visualizacion; }
    public set_edad_visualizacion(e: number) { this.edad_visualizacion = e; }

    public get_caratula(): any { return this.caratula; }
    public set_caratula(c: any) { this.caratula = c; }

    public get_n_visualizaciones(): number { return this.n_visualizaciones; }
    public set_n_visualizaciones(n: number) { this.n_visualizaciones = n; }

    public get_unnamed_Lista_(): Lista[] { return this.unnamed_Lista_; }
    public set_unnamed_Lista_(l: Lista[]) { this.unnamed_Lista_ = l; }

    public get_unnamed_Visualizador_(): Visualizador[] { return this.unnamed_Visualizador_; }
    public set_unnamed_Visualizador_(v: Visualizador[]) { this.unnamed_Visualizador_ = v; }

    public get_gestorId(): string { return this.gestorId; }
    public set_gestorId(g: string) { this.gestorId = g; }
}
