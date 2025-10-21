import { Usuario } from './usuario';
import { Lista } from './lista';
import { Contenido } from './contenido';

export class Gestor_de_Contenido extends Usuario {
    private alias?: string;
    private descripcion?: string;
    private campo_especializacion?: string;
    private tipo_contenido_video_o_audio?: string;
    public listas_generadas: Lista[] = [];

    constructor(apellidos: string, bloqueado: boolean, contrasenia: any, email: string, foto: any, nombre: string) {
        super(apellidos, bloqueado, contrasenia, email, foto, nombre);
        this.listas_generadas = [];
        this.alias = undefined;
        this.descripcion = undefined;
        this.campo_especializacion = undefined;
        this.tipo_contenido_video_o_audio = undefined;
    }

    public get_alias(): string | undefined { return this.alias; }
    public set_alias(a: string | undefined) { this.alias = a; }

    public get_descripcion(): string | undefined { return this.descripcion; }
    public set_descripcion(d: string | undefined) { this.descripcion = d; }

    public get_campo_especializacion(): string | undefined { return this.campo_especializacion; }
    public set_campo_especializacion(c: string | undefined) { this.campo_especializacion = c; }

    public get_tipo_contenido_video_o_audio(): string | undefined { return this.tipo_contenido_video_o_audio; }
    public set_tipo_contenido_video_o_audio(t: string | undefined) { this.tipo_contenido_video_o_audio = t; }

    public getListas_generadas(): Lista[] { return this.listas_generadas; }
    public setListas_generadas(l: Lista[]) { this.listas_generadas = l; }

    public subir(aC: Contenido) {
        throw new Error('UnsupportedOperationException');
    }
}
