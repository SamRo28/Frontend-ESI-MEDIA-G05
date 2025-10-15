import { Contenido } from './contenido';
import { Lista } from './lista';
import { Visualizador } from './visualizador';

export class Video extends Contenido {
    private url: string;
    private resolucion: string;

    constructor(titulo: string, descripcion: string, tags: string[], duracion: number, vip: boolean,
        estado: boolean, fecha_estado_automatico: Date | undefined, fecha_disponible_hasta: Date | undefined,
        edad_visualizacion: number, caratula: any, n_visualizaciones: number, gestorId: string, unnamed_Lista_: Lista[],
        unnamed_Visualizador_: Visualizador[], url: string, resolucion: string) {
        super(titulo, descripcion, tags, duracion, vip, estado, fecha_estado_automatico, fecha_disponible_hasta,
            edad_visualizacion, caratula, n_visualizaciones, gestorId, unnamed_Lista_, unnamed_Visualizador_);
        this.url = url;
        this.resolucion = resolucion;
    }

    public getUrl(): string { return this.url; }
    public setUrl(u: string) { this.url = u; }

    public getResolucion(): string { return this.resolucion; }
    public setResolucion(r: string) { this.resolucion = r; }
}
