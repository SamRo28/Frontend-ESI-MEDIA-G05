import { Contenido } from './contenido';
import { Lista } from './lista';
import { Visualizador } from './visualizador';

export class Audio extends Contenido {
    private fichero: any;

    constructor(titulo: string, descripcion: string, etiquetas: string[], tamano: number, esPublico: boolean, esDescargable: boolean,
        fechaCreacion: Date | undefined, fechaPublicacion: Date | undefined, duracion: number, fichero: any, reproducciones: number,
        gestorId: string, listas: Lista[], visualizadores: Visualizador[]) {
        super(titulo, descripcion, etiquetas, tamano, esPublico, esDescargable, fechaCreacion, fechaPublicacion, duracion, fichero, reproducciones, gestorId, listas, visualizadores);
        this.fichero = fichero;
    }

    public get_fichero(): any { return this.fichero; }
    public set_fichero(f: any) { this.fichero = f; }
}
