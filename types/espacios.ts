export type TipoCocina = 'Cocina completa' | 'Office de regeneración' | 'Sin cocina';
export type RelacionComercial = 'Exclusividad' | 'Homologado Preferente' | 'Homologado' | 'Puntual' | 'Sin Relación';
export type DificultadMontaje = 1 | 2 | 3 | 4 | 5;

export interface Sala {
    id: string;
    espacioId: string;
    nombreSala: string;
    m2?: number;
    dimensiones?: string;
    alturaMax?: number;
    alturaMin?: number;
    aforoTeatro?: number;
    aforoEscuela?: number;
    aforoCabaret?: number;
    aforoBanquete?: number;
    aforoCocktailSala?: number;
    esDiafana: boolean;
    tieneLuzNatural: boolean;
    dataExtendida?: Record<string, any>;
    orden: number;
}

export interface ContactoEspacio {
    id: string;
    espacioId: string;
    nombre: string;
    cargo?: string;
    telefono?: string;
    email?: string;
    esPrincipal: boolean;
    notas?: string;
}

export interface CuadroElectrico {
    id: string;
    espacioId: string;
    nombre: string;
    voltaje?: string;
    amperaje?: string;
    tipo?: string; // Monofásico, Trifásico
    ubicacion?: string;
    notas?: string;
    orden: number;
}

export interface PrecioHistorico {
    id: string;
    espacioId: string;
    fechaCambio: string;
    usuarioId: string;
    precioAlquilerAnterior?: number;
    canonPorcentajeAnterior?: number;
    canonFijoAnterior?: number;
    precioAlquilerNuevo?: number;
    canonPorcentajeNuevo?: number;
    canonFijoNuevo?: number;
    motivoCambio?: string;
    createdAt?: string;
}

export interface ImagenEspacio {
    id: string;
    espacioId: string;
    url: string;
    esPrincipal: boolean;
    descripcion?: string;
    orden: number;
    categoria?: 'foto' | 'plano';
}

export interface EspacioV2 {
    id: string;

    // Identificación
    nombre: string;
    ciudad: string;
    provincia: string;
    calle?: string;
    codigoPostal?: string;
    zona?: string;
    descripcionCorta?: string;
    descripcionLarga?: string;
    tiposEspacio: string[];
    estilos: string[];
    tags: string[];
    idealPara: string[];

    // Capacidades
    aforoMaxCocktail?: number;
    aforoMaxBanquete?: number;
    salas?: Sala[];

    // Evaluación MICE
    proveedorId?: string;
    relacionComercial: RelacionComercial;
    valoracionComercial?: number;
    valoracionOperaciones?: number;
    perfilClienteIdeal?: string;
    puntosFuertes: string[];
    puntosDebiles: string[];

    // Logística
    accesoVehiculos?: string;
    horarioMontajeDesmontaje?: string;
    potenciaTotal?: string;
    tipoCocina?: TipoCocina;
    logisticaPase?: string;
    limitadorSonido: boolean;
    dificultadMontaje?: DificultadMontaje;
    penalizacionPersonalMontaje?: number;

    // Experiencia invitado
    aparcamiento?: string;
    transportePublico?: string;
    accesibilidadAsistentes?: string;
    conexionWifi?: string;

    // Económico
    precioOrientativoAlquiler?: number;
    canonEspacioPorcentaje?: number;
    canonEspacioFijo?: number;

    // Datos extendidos
    dataExtendida?: Record<string, any>;

    // Multimedia
    imagenPrincipalUrl?: string;
    carpetaDrive?: string;
    visitaVirtualUrl?: string;
    imagenes?: ImagenEspacio[];

    // IA
    resumenEjecutivoIA?: string;
    ultimaGeneracionIA?: string;

    // Contactos
    contactos?: ContactoEspacio[];

    // Cuadros eléctricos
    cuadrosElectricos?: CuadroElectrico[];

    // Metadata
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
    updatedBy?: string;
}
