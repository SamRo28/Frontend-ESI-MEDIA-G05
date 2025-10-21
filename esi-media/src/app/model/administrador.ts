import { Usuario } from './usuario';

export class Administrador extends Usuario {
    private departamento: string;

    constructor(apellidos: string, bloqueado: boolean, contrasenia: any, email: string, foto: any, nombre: string, departamento: string) {
        super(apellidos, bloqueado, contrasenia, email, foto, nombre);
        this.departamento = departamento;
    }

    public get_departamento(): string { return this.departamento; }
    public set_departamento(d: string) { this.departamento = d; }
}
