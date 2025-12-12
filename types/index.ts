
import { z } from "zod";

export type CateringItem = {
    itemCode: string;
    description: string;
    price: number;
    stock: number;
    imageUrl: string;
    imageHint: string;
    category: string;
    tipo?: string;
    unidadVenta?: number;
};

export type OrderItem = CateringItem & {
    quantity: number;
    orderId?: string;
    tipo?: string;
    ajustes?: {
        tipo: 'merma' | 'exceso' | 'ajuste manual' | 'devolucion';
        cantidad: number;
        fecha: string;
        comentario: string;
    }[];
};

export type OrderCompletionAssistantInput = {
    eventDescription: string;
};

export type OrderCompletionAssistantOutput = {
    itemCode: string;
    description: string;
    price: number;
    quantity: number;
}[];

export const CATERING_VERTICALES = ['Recurrente', 'Grandes Eventos', 'Gran Cuenta'] as const;
export type CateringVertical = typeof CATERING_VERTICALES[number];

export type ServiceOrder = {
    id: string;
    serviceNumber: string;
    startDate: string;
    endDate: string;
    client: string;
    tipoCliente?: 'Empresa' | 'Agencia' | 'Particular';
    finalClient: string;
    contact: string;
    phone: string;
    asistentes: number;
    cateringVertical?: CateringVertical;
    space: string;
    spaceAddress: string;
    spaceContact: string;
    spacePhone: string;
    spaceMail: string;
    respMetre: string;
    respMetrePhone: string;
    respMetreMail: string;
    respCocinaCPR: string;
    respCocinaCPRPhone: string;
    respCocinaCPRMail: string;
    respPase: string;
    respPasePhone: string;
    respPaseMail: string;
    respCocinaPase: string;
    respCocinaPasePhone: string;
    respCocinaPaseMail: string;
    comercialAsiste: boolean;
    comercial: string;
    comercialPhone: string;
    comercialMail: string;
    rrhhAsiste: boolean;
    respRRHH: string;
    respRRHHPhone: string;
    respRRHHMail: string;
    agencyPercentage: number;
    agencyCommissionValue?: number;
    spacePercentage: number;
    spaceCommissionValue?: number;
    comisionesAgencia?: number;
    comisionesCanon?: number;
    facturacion: number;
    plane: string;
    comments: string;
    status: 'Borrador' | 'Pendiente' | 'Confirmado' | 'Anulado';
    anulacionMotivo?: string;
    deliveryTime?: string;
    deliveryLocations?: string[];
    objetivoGastoId?: string;
    vertical?: 'Catering' | 'Entregas';
    direccionPrincipal?: string;
    isVip?: boolean;
    email?: string;
    respProjectManager?: string;
    respProjectManagerPhone?: string;
    respProjectManagerMail?: string;
};

export type MaterialOrder = {
    id: string;
    osId: string;
    type: 'Almacen' | 'Bodega' | 'Bio' | 'Alquiler';
    status: 'Asignado' | 'En preparación' | 'Listo';
    items: OrderItem[];
    days: number;
    total: number;
    contractNumber: string;
    deliveryDate?: string;
    deliverySpace?: string;
    deliveryLocation?: string;
    solicita?: 'Sala' | 'Cocina';
};


export const DEPARTAMENTOS_PERSONAL = ['Sala', 'Pase', 'CPR', 'RRHH', 'Almacén', 'Comercial', 'Operaciones', 'Marketing', 'HQ'] as const;
export type DepartamentoPersonal = typeof DEPARTAMENTOS_PERSONAL[number];

export type Personal = {
    id: string; // DNI
    nombre: string;
    apellido1: string;
    apellido2: string;
    nombreCompleto: string;
    nombreCompacto: string;
    iniciales: string;
    departamento: string;
    categoria: string;
    telefono: string;
    email: string;
    precioHora: number;
}

export const TIPO_ESPACIO = ['Hotel', 'Espacio Singular', 'Finca', 'Restaurante', 'Auditorio', 'Corporativo', 'Centro de Congresos', 'Exterior'] as const;
export const ESTILOS_ESPACIO = ['Clásico', 'Industrial', 'Moderno', 'Rústico', 'Lujoso', 'Minimalista', 'Tecnológico', 'Exterior/Jardín'] as const;
export const TAGS_ESPACIO = ['Con Vistas', 'Terraza', 'Jardín', 'Piscina', 'Discoteca', 'Exclusividad Total', 'Pet-Friendly', 'Parking Propio', 'Luz Natural'] as const;
export const IDEAL_PARA = ['Bodas', 'Eventos Corporativos', 'Presentaciones de producto', 'Rodajes', 'Fiestas Privadas', 'Congresos', 'Ferias'] as const;
export type RelacionComercial = 'Exclusividad' | 'Homologado Preferente' | 'Homologado' | 'Puntual' | 'Sin Relación';


export type Sala = {
    id: string;
    nombreSala: string;
    m2?: number;
    dimensiones?: string;
    alturaMax?: number;
    alturaMin?: number;
    aforoTeatro?: number;
    aforoEscuela?: number;
    aforoCabaret?: number;
    aforoCocktailSala?: number;
    esDiafana: boolean;
    tieneLuzNatural: boolean;
};

export type ContactoEspacio = {
    id: string;
    nombre: string;
    cargo: string;
    telefono: string;
    email: string;
};

export type CuadroElectrico = {
    id: string;
    ubicacion: string;
    potencia: string;
};

export type ImagenEspacio = {
    id: string;
    url: string;
    isPrincipal: boolean;
}

export type MultimediaEspacio = {
    imagenes?: ImagenEspacio[];
    carpetaDRIVE?: string;
    visitaVirtual?: string;
}

export type MetricasOperativas = {
    dificultadMontaje: 1 | 2 | 3 | 4 | 5; // De Fácil a Muy Complejo
    penalizacionPersonalMontaje: number; // Porcentaje extra de personal estimado
    notasDificultadMontaje?: string;
    valoracionOperaciones: 1 | 2 | 3 | 4 | 5; // Calificación interna del equipo de operaciones
    factoresCriticosExito: string[]; // Qué debe salir bien sí o sí
    riesgosPotenciales: string[]; // Qué suele fallar o qué riesgos hay
    notasInternasOperaciones?: string;
};

export type FlowInvitado = {
    accesoPrincipal: string; // Ej: "Recepción principal del hotel", "Entrada directa desde la calle"
    recorridoInvitado: string; // Ej: "Subida en ascensor panorámico a planta 33"
    aparcamiento: string; // Ej: "Valet parking", "Parking público de pago a 200m", "Zona de fácil aparcamiento"
    transportePublico: string; // Paradas de metro/bus/tren cercanas
    accesibilidadAsistentes: string; // Ej: "Acceso y baños adaptados para sillas de ruedas"
    guardarropa: boolean;
    seguridadPropia: boolean;
};

export type Espacio = {
    id: string;

    identificacion: {
        nombreEspacio: string;
        tipoDeEspacio: (typeof TIPO_ESPACIO[number])[];
        descripcionCorta?: string;
        descripcionLarga?: string;
        ciudad: string;
        provincia: string;
        calle: string;
        codigoPostal: string;
        zona?: string;
        estilos: (typeof ESTILOS_ESPACIO[number])[];
        tags: (typeof TAGS_ESPACIO[number])[];
        idealPara: (typeof IDEAL_PARA[number])[];
    };

    capacidades: {
        aforoMaximoCocktail: number;
        aforoMaximoBanquete: number;
        salas: Sala[];
    };

    logistica: {
        accesoVehiculos?: string;
        horarioMontajeDesmontaje?: string;
        montacargas: boolean;
        dimensionesMontacargas?: string;
        accesoServicioIndependiente: boolean;
        potenciaTotal?: string;
        cuadrosElectricos?: CuadroElectrico[];
        tomasAgua?: string[];
        desagues?: string[];
        tipoCocina: 'Cocina completa' | 'Office de regeneración' | 'Sin cocina';
        equipamientoCocina?: string[];
        potenciaElectricaCocina?: string;
        tomasAguaCocina: boolean;
        desaguesCocina: boolean;
        extraccionHumos: boolean;
        descripcionOffice?: string;
        zonaAlmacenaje?: string;
        limitadorSonido: boolean;
        permiteMusicaExterior: boolean;
        politicaDecoracion?: string;
        puntosAnclaje: boolean;
        metricasOperativas?: {
            dificultadMontaje: number;
            penalizacionPersonalMontaje: number;
            notasDificultadMontaje?: string;
        };
    };

    evaluacionMICE: {
        proveedorId?: string;
        relacionComercial: RelacionComercial;
        valoracionComercial: number;
        puntosFuertes: string[];
        puntosDebiles: string[];
        perfilClienteIdeal?: string;
        argumentarioVentaRapido?: string[];
        exclusividadMusica: boolean;
        exclusividadAudiovisuales: boolean;
        otrosProveedoresExclusivos?: string;
        notasComerciales?: string;
        resumenEjecutivoIA?: string;
        valoracionOperaciones: number;
        factoresCriticosExito: string[];
        riesgosPotenciales: string[];
    };

    experienciaInvitado: {
        flow: FlowInvitado;
        equipamientoAudiovisuales?: string;
        pantalla?: string;
        sistemaSonido?: string;
        escenario?: string;
        conexionWifi?: string;
    };

    contactos: ContactoEspacio[];
    multimedia?: MultimediaEspacio;

    espacio: string;
    escaparateMICE?: string;
    carpetaDRIVE?: string;
    nombreContacto1?: string;
    telefonoContacto1?: string;
    emailContacto1?: string;
    canonEspacioPorcentaje?: number;
    canonEspacioFijo?: number;
    canonMcPorcentaje?: number;
    canonMcFijo?: number;
    comisionAlquilerMcPorcentaje?: number;
    precioOrientativoAlquiler?: string;
    horaLimiteCierre?: string;
    aforoCocktail?: number;
    aforoBanquete?: number;
    auditorio?: string;
    aforoAuditorio?: number;
    zonaExterior?: string;
    capacidadesPorSala?: string;
    directorio?: string;
    comentariosVarios?: string;
    cocina?: string;
    plato?: string;
    homologacion?: string;
    comentariosMarketing?: string;
};


export const ARTICULO_CATERING_CATEGORIAS = ['Bodega', 'Almacen', 'Bio', 'Hielo', 'Alquiler', 'Menaje', 'Decoracion', 'Servicios', 'Gastronomia', 'Otros'] as const;
export type ArticuloCateringCategoria = typeof ARTICULO_CATERING_CATEGORIAS[number];

export type ArticuloCatering = {
    id: string;
    erpId?: string | null;
    nombre: string;
    categoria: ArticuloCateringCategoria;
    familia?: string | null; // Nombre de la familia
    esHabitual?: boolean;
    precioVenta?: number | null;
    precioAlquiler?: number | null;
    precioReposicion?: number | null;
    unidadVenta?: number | null;
    stockSeguridad?: number | null;
    tipo?: string | null;
    loc?: string | null;
    imagen?: string | null;
    producidoPorPartner?: boolean;
    partnerId?: string | null;
    recetaId?: string | null;
    subcategoria?: string | null;
    tipoArticulo: 'micecatering' | 'entregas';
    // Campos nuevos para Entregas
    referenciaArticuloEntregas?: string | null;
    dptEntregas?: string | null;
    precioCoste?: number | null;
    precioCosteAlquiler?: number | null;
    precioVentaEntregas?: number | null;
    precioVentaEntregasIfema?: number | null;
    precioAlquilerIfema?: number | null;
    precioVentaIfema?: number | null;
    // Campos compartidos
    iva?: number | null;
    docDriveUrl?: string | null;
    alergenos?: any[];
    imagenes?: Array<{ id: string; url: string; esPrincipal: boolean; orden: number; descripcion?: string }> | null;
    pack?: any[];
    audit?: any[];
    createdAt?: string;
}

// Backwards-compatible alias: some files still import `AlquilerDBItem`
export type AlquilerDBItem = ArticuloCatering;


export type TipoServicio = {
    id: string;
    servicio: string;
}

export type ProveedorTransporte = {
    id: string;
    proveedorId: string;
    nombreProveedor: string;
    tipoTransporte: string; // Ej. "Furgoneta Isotermo"
    precio: number;
    tipo: 'Catering' | 'Entregas';
}

// Backwards-compatible alias: some files expect `TipoTransporte`
export type TipoTransporte = ProveedorTransporte;

export type CategoriaPersonal = {
    id: string;
    proveedorId: string;
    nombreProveedor: string;
    categoria: string;
    precioHora: number;
};

export type GastronomyOrderItem = {
    id: string; // Receta ID
    type: 'item' | 'separator';
    nombre: string;
    categoria?: string;
    costeMateriaPrima?: number; // Snapshot of the cost at the time of adding
    precioVenta?: number; // Snapshot of the price at the time of adding
    quantity?: number;
    comentarios?: string;
}
export type GastronomyOrderStatus = 'Pendiente' | 'En preparación' | 'Listo' | 'Incidencia';

export type ComercialBriefingItem = {
    id: string;
    fecha: string;
    horaInicio: string;
    horaFin: string;
    conGastronomia: boolean;
    descripcion: string;
    comentarios: string;
    sala: string;
    asistentes: number;
    precioUnitario: number;
    importeFijo?: number;
    bebidas?: string;
    matBebida?: string;
    materialGastro?: string;
    manteleria?: string;
};

export type ComercialBriefing = {
    osId: string;
    items: ComercialBriefingItem[];
}

export type GastronomyOrder = {
    id: string; // briefing item ID
    osId: string;
    status: GastronomyOrderStatus;
    items: GastronomyOrderItem[];
    total: number;
}

export type TransporteOrder = {
    id: string;
    osId: string;
    fecha: string;
    proveedorId: string;
    proveedorNombre: string;
    tipoTransporte: string;
    precio: number;
    lugarRecogida: string;
    horaRecogida: string;
    lugarEntrega: string;
    horaEntrega: string;
    observaciones?: string;
    status: 'Pendiente' | 'Confirmado' | 'En Ruta' | 'Entregado';
    firmaUrl?: string;
    firmadoPor?: string;
    dniReceptor?: string;
    fechaFirma?: string;
    hitosIds?: string[]; // For Entregas, to link multiple deliveries
}

export type HieloOrder = {
    id: string;
    osId: string;
    fecha: string;
    proveedorId: string;
    proveedorNombre: string;
    items: { id: string; producto: string; precio: number; cantidad: number }[];
    total: number;
    observaciones: string;
    status: 'Pendiente' | 'Confirmado' | 'En reparto' | 'Entregado';
};

export type DecoracionDBItem = {
    id: string;
    concepto: string;
    precio: number;
};

export type DecoracionOrder = {
    id: string;
    osId: string;
    fecha: string;
    concepto: string;
    precio: number;
    observaciones?: string;
};

export type AtipicoDBItem = {
    id: string;
    concepto: string;
    precio: number;
};

export type AtipicoOrder = {
    id: string;
    osId: string;
    fecha: string;
    concepto: string;
    observaciones?: string;
    precio: number;
    status: 'Pendiente' | 'Aprobado' | 'Rechazado';
};

export type PersonalMiceOrder = {
    id: string;
    osId: string;
    centroCoste: 'SALA' | 'COCINA' | 'LOGISTICA' | 'RRHH';
    nombre: string;
    dni: string;
    tipoServicio: 'Producción' | 'Montaje' | 'Servicio' | 'Recogida' | 'Descarga';
    horaEntrada: string;
    horaSalida: string;
    precioHora: number;
    horaEntradaReal: string;
    horaSalidaReal: string;
}

export type AsignacionPersonal = {
    id: string;
    nombre: string;
    dni?: string;
    telefono?: string;
    email?: string;
    comentarios?: string;
    rating?: number; // From 1 to 5
    comentariosMice?: string;
    horaEntradaReal: string;
    horaSalidaReal: string;
};

export type PersonalExternoTurno = {
    id: string;
    proveedorId: string;
    categoria: string;
    precioHora: number;
    fecha: string;
    horaEntrada: string;
    horaSalida: string;
    solicitadoPor: 'Sala' | 'Pase' | 'Otro';
    tipoServicio: 'Producción' | 'Montaje' | 'Servicio' | 'Recogida' | 'Descarga';
    observaciones?: string;
    statusPartner: 'Pendiente Asignación' | 'Gestionado';
    asignaciones?: AsignacionPersonal[];
    requiereActualizacion?: boolean;
};

export const ESTADO_PERSONAL_EXTERNO = ['Pendiente', 'Solicitado', 'Asignado', 'Cerrado'] as const;
export type EstadoPersonalExterno = typeof ESTADO_PERSONAL_EXTERNO[number];

export type PersonalExterno = {
    osId: string;
    turnos: PersonalExternoTurno[];
    status: EstadoPersonalExterno;
    observacionesGenerales?: string;
    hojaFirmadaUrl?: string;
};

// Backwards-compatible turno status constant/type expected by older code
export const ESTADO_TURNO_PERSONAL = ['Solicitado', 'Asignado', 'Cerrado'] as const;
export type EstadoTurnoPersonal = typeof ESTADO_TURNO_PERSONAL[number];

export const AJUSTE_CONCEPTO_OPCIONES = ['Dietas', 'Transporte', 'Parking', 'Gastos Adicionales', 'Otros'] as const;
export type AjusteConcepto = typeof AJUSTE_CONCEPTO_OPCIONES[number];

export type PersonalExternoAjuste = {
    id: string;
    proveedorId: string;
    concepto: AjusteConcepto | string;
    importe: number;
};

// Entregas - Personal Types
export type PersonalEntregaTurno = {
    id: string;
    proveedorId: string;
    categoria: string;
    precioHora: number;
    fecha: string;
    horaEntrada: string;
    horaSalida: string;
    observaciones?: string;
    statusPartner: 'Pendiente Asignación' | 'Gestionado';
    asignaciones?: AsignacionPersonal[];
    requiereActualizacion?: boolean;
};

export const ESTADO_PERSONAL_ENTREGA = ['Pendiente', 'Asignado'] as const;
export type EstadoPersonalEntrega = typeof ESTADO_PERSONAL_ENTREGA[number];

export type PersonalEntrega = {
    osId: string;
    turnos: PersonalEntregaTurno[];
    status: EstadoPersonalEntrega;
    observacionesGenerales?: string;
};


export type PruebaMenuItem = {
    id: string;
    type: 'header' | 'item';
    mainCategory: 'BODEGA' | 'GASTRONOMÍA';
    referencia: string;
    observaciones?: string;
};

export type PruebaMenuData = {
    osId: string;
    items: PruebaMenuItem[];
    observacionesGenerales: string;
    costePruebaMenu?: number;
};

export type CtaExplotacionObjetivos = {
    gastronomia: number;
    bodega: number;
    consumibles: number;
    hielo: number;
    almacen: number;
    alquiler: number;
    transporte: number;
    decoracion: number;
    atipicos: number;
    personalMice: number;
    personalExterno: number;
    costePruebaMenu: number;
}

export type ObjetivosGasto = CtaExplotacionObjetivos & {
    id: string;
    name: string;
    personalSolicitadoCpr?: number;
};

export type ComercialAjuste = {
    id: string;
    concepto: string;
    importe: number;
}
export type Precio = {
    id: string;
    categoria: string;
    producto: string;
    precioUd: number;
    precioAlquilerUd: number;
    unidad: string;
    observaciones: string;
    loc: string;
    imagen: string;
    unidadVenta?: number;
}

export const UNIDADES_MEDIDA = ['KG', 'L', 'UD'] as const;
export type UnidadMedida = typeof UNIDADES_MEDIDA[number];

export const articuloErpSchema = z.object({
    id: z.string(),
    idreferenciaerp: z.string().optional(),
    idProveedor: z.string().optional(),
    nombreProductoERP: z.string().min(1, 'El nombre del producto es obligatorio'),
    referenciaProveedor: z.string().optional(),
    nombreProveedor: z.string().optional(),
    familiaCategoria: z.string().optional(),
    precioCompra: z.coerce.number().min(0, "Debe ser un valor positivo."),
    descuento: z.coerce.number().min(0).max(100).optional(),
    unidadConversion: z.coerce.number().min(1).default(1),
    precio: z.coerce.number().min(0),
    precioAlquiler: z.coerce.number().min(0).optional(),
    unidad: z.enum(UNIDADES_MEDIDA),
    tipo: z.string().optional(),
    categoriaMice: z.string().optional(),
    alquiler: z.boolean().default(false),
    observaciones: z.string().optional(),
});

export type ArticuloERP = z.infer<typeof articuloErpSchema>;

export type FamiliaERP = {
    id: string;
    familiaCategoria: string;
    Familia: string;
    Categoria: string;
}

export const ALERGENOS = ['GLUTEN', 'CRUSTACEOS', 'HUEVOS', 'PESCADO', 'CACAHUETES', 'SOJA', 'LACTEOS', 'FRUTOS DE CASCARA', 'APIO', 'MOSTAZA', 'SESAMO', 'SULFITOS', 'ALTRAMUCES', 'MOLUSCOS'] as const;
export type Alergeno = typeof ALERGENOS[number];

export type IngredienteInterno = {
    id: string;
    nombreIngrediente: string;
    productoERPlinkId: string;
    alergenosPresentes: Alergeno[];
    alergenosTrazas: Alergeno[];
    historialRevisiones?: { fecha: string; responsable: string }[];
}

export type ComponenteElaboracion = {
    id: string;
    tipo: 'ingrediente' | 'elaboracion';
    componenteId: string; // ID of IngredienteInterno or another Elaboracion
    nombre: string;
    cantidad: number;
    costePorUnidad: number;
    merma: number;
}

export const PARTIDAS_PRODUCCION = ['FRIO', 'CALIENTE', 'PASTELERIA', 'EXPEDICION'] as const;
export type PartidaProduccion = typeof PARTIDAS_PRODUCCION[number];

export type Elaboracion = {
    id: string;
    nombre: string;
    produccionTotal: number;
    unidadProduccion: UnidadMedida;
    partidaProduccion: PartidaProduccion;
    componentes: ComponenteElaboracion[];
    instruccionesPreparacion: string;
    fotosProduccionURLs?: { value: string }[];
    videoProduccionURL?: string;
    formatoExpedicion: string;
    ratioExpedicion: number;
    tipoExpedicion: 'REFRIGERADO' | 'CONGELADO' | 'SECO';
    costePorUnidad?: number;
    alergenos?: Alergeno[];
    requiereRevision?: boolean;
    comentarioRevision?: string;
    fechaRevision?: string;
}

export type ElaboracionEnReceta = {
    id: string;
    elaboracionId: string;
    nombre: string;
    cantidad: number;
    coste: number;
    gramaje: number;
    alergenos?: Alergeno[];
    unidad: UnidadMedida;
    merma: number;
}

export const SABORES_PRINCIPALES = ['DULCE', 'SALADO', 'ÁCIDO', 'AMARGO', 'UMAMI'] as const;
export type SaborPrincipal = typeof SABORES_PRINCIPALES[number];

export const TECNICAS_COCCION = ['Horneado / Asado', 'Fritura', 'Guiso / Estofado', 'Plancha / Salteado', 'Vapor / Hervido', 'Crudo / Marinado', 'Baja Temperatura / Sous-vide'] as const;
export type TecnicaCoccion = typeof TECNICAS_COCCION[number];


export interface ImagenReceta {
    id: string;
    url: string;
    esPrincipal: boolean;
    descripcion?: string;
    orden: number;
}

export type Receta = {
    id: string;
    numeroReceta?: string;
    nombre: string;
    nombre_en?: string;
    visibleParaComerciales: boolean;
    isArchived?: boolean;
    descripcionComercial: string;
    descripcionComercial_en?: string;
    responsableEscandallo: string;
    categoria: string;
    partidaProduccion?: string; // Calculated field
    gramajeTotal?: number;
    estacionalidad: 'INVIERNO' | 'VERANO' | 'MIXTO';
    tipoDieta: 'VEGETARIANO' | 'VEGANO' | 'AMBOS' | 'NINGUNO';
    porcentajeCosteProduccion: number;
    elaboraciones: ElaboracionEnReceta[];
    menajeAsociado: { id: string; menajeId: string; descripcion: string; ratio: number }[];
    instruccionesMiseEnPlace: string;
    fotosMiseEnPlace: ImagenReceta[];
    instruccionesRegeneracion: string;
    fotosRegeneracion: ImagenReceta[];
    instruccionesEmplatado: string;
    fotosEmplatado: ImagenReceta[];
    fotosComerciales: ImagenReceta[];
    perfilSaborPrincipal?: SaborPrincipal;
    perfilSaborSecundario?: string[];
    perfilTextura?: string[];
    tipoCocina?: string[];
    recetaOrigen?: string;
    temperaturaServicio?: 'CALIENTE' | 'TIBIO' | 'AMBIENTE' | 'FRIO' | 'HELADO';
    tecnicaCoccionPrincipal?: TecnicaCoccion;
    potencialMiseEnPlace?: 'COMPLETO' | 'PARCIAL' | 'AL_MOMENTO';
    formatoServicioIdeal?: string[];
    equipamientoCritico?: string[];
    dificultadProduccion?: number; // 1-5
    estabilidadBuffet?: number; // 1-5
    escalabilidad?: 'FACIL' | 'MEDIA' | 'DIFICIL';
    etiquetasTendencia?: string[];
    costeMateriaPrima?: number;
    precioVenta?: number;
    alergenos?: Alergeno[];
    requiereRevision?: boolean;
    comentarioRevision?: string;
    fechaRevision?: string;
}

export type OrdenFabricacion = {
    id: string;
    fechaCreacion: string;
    fechaProduccionPrevista: string;
    fechaAsignacion?: string;
    fechaInicioProduccion?: string;
    fechaFinalizacion?: string;
    elaboracionId: string;
    elaboracionNombre: string;
    cantidadTotal: number;
    cantidadReal?: number;
    necesidadTotal?: number;
    unidad: UnidadMedida;
    partidaAsignada: PartidaProduccion;
    responsable?: string;
    estado: 'Pendiente' | 'Asignada' | 'En Proceso' | 'Finalizado' | 'Validado' | 'Incidencia';
    osIDs: string[];
    incidencia: boolean;
    incidenciaObservaciones?: string;
    okCalidad: boolean;
    responsableCalidad?: string;
    fechaValidacionCalidad?: string;
    tipoExpedicion: 'REFRIGERADO' | 'CONGELADO' | 'SECO';
    consumosReales?: { componenteId: string; cantidadReal: number }[];
}

export type PickingItemState = {
    itemCode: string;
    checked: boolean;
    pickedQuantity: number;
    incidentComment?: string;
    resolved?: boolean;
};

export type MaterialOrderType = 'Almacen' | 'Bodega' | 'Bio' | 'Alquiler';

export type PickingSheet = {
    id: string; // Composite key: osId + fechaNecesidad
    osId: string;
    fechaNecesidad: string;
    items: (OrderItem & { type: MaterialOrderType })[];
    status: 'Pendiente' | 'En Proceso' | 'Listo';
    checkedItems?: string[];
    itemStates?: Record<string, Omit<PickingItemState, 'itemCode'>>;
    os?: ServiceOrder;
    solicita?: 'Sala' | 'Cocina';
};

export type ReturnItemState = {
    returnedQuantity: number;
    incidentComment?: string;
    isReviewed?: boolean;
};

export type ReturnSheet = {
    id: string; // osId
    osId: string;
    items: (OrderItem & { sentQuantity: number; orderId: string; type: MaterialOrderType; })[];
    status: 'Pendiente' | 'Procesando' | 'Completado';
    itemStates: Record<string, ReturnItemState>; // Key is `${orderId}_${itemCode}`
    os?: ServiceOrder;
}

export type ContenedorIsotermo = {
    id: string;
    tipo: 'REFRIGERADO' | 'CONGELADO' | 'SECO';
    numero: number;
}
export type LoteAsignado = {
    allocationId: string;
    ofId: string;
    containerId: string;
    quantity: number;
    hitoId: string
}
export type ContenedorDinamico = {
    id: string;
    hitoId: string;
    tipo: 'REFRIGERADO' | 'CONGELADO' | 'SECO';
    numero: number;
}
export type PickingStatus = 'Pendiente' | 'Preparado' | 'Enviado' | 'Entregado' | 'Retornado';
export type PickingState = {
    osId: string;
    status: PickingStatus;
    assignedContainers: ContenedorDinamico[];
    itemStates: LoteAsignado[];
};
export type PedidoPlantillaItem = {
    itemCode: string;
    quantity: number;
    description: string;
};
export type PedidoPlantilla = {
    id: string;
    nombre: string;
    tipo: MaterialOrderType;
    items: PedidoPlantillaItem[];
};
export type FormatoExpedicion = {
    id: string;
    nombre: string;
};

export type StockLote = {
    ofId: string;
    cantidad: number;
    fechaCaducidad: string;
};

export type StockElaboracion = {
    elaboracionId: string;
    cantidadTotal: number;
    unidad: UnidadMedida;
    lotes: StockLote[];
}

export type ExcedenteProduccion = {
    ofId: string;
    fechaProduccion: string;
    diasCaducidad?: number;
    cantidadAjustada: number;
    motivoAjuste: string;
    fechaAjuste: string;
}

// ---- NUEVA VERTICAL DE ENTREGAS ----

export const CATEGORIAS_PRODUCTO_VENTA = ['Gastronomía', 'Bodega', 'Consumibles', 'Almacen', 'Packs', 'Transporte', 'Otros'] as const;
export type CategoriaProductoVenta = typeof CATEGORIAS_PRODUCTO_VENTA[number];

export type ImagenProducto = {
    id: string;
    url: string;
    isPrincipal: boolean;
}

export type ProductoVentaComponente = {
    erpId: string;
    nombre: string;
    cantidad: number;
    coste?: number;
};

export type ProductoVenta = {
    id: string;
    nombre: string;
    nombre_en?: string;
    categoria: CategoriaProductoVenta;
    ubicacion?: string;
    imagenes: ImagenProducto[];
    pvp: number;
    pvpIfema?: number;
    iva: number;
    producidoPorPartner: boolean;
    partnerId?: string;
    recetaId?: string;
    erpId?: string;
    exclusivoIfema?: boolean;
    componentes?: ProductoVentaComponente[];
}

export type PedidoEntregaItem = {
    id: string; // ProductoVenta ID
    nombre: string;
    quantity: number;
    pvp: number;
    coste: number;
    categoria: CategoriaProductoVenta;
};
export type EntregaHito = {
    id: string;
    fecha: string;
    hora: string;
    lugarEntrega: string;
    localizacion?: string;
    contacto?: string;
    telefono?: string;
    email?: string;
    observaciones?: string;
    items: PedidoEntregaItem[];
    portes?: number;
    horasCamarero?: number;
}
export type PedidoEntrega = {
    osId: string;
    hitos: EntregaHito[];
};
export type Entrega = ServiceOrder & {
    vertical: 'Entregas';
    tarifa: 'Empresa' | 'IFEMA';
};
export type PedidoPartner = {
    id: string; // hitoId-productoId
    osId: string;
    serviceNumber: string;
    expedicionNumero: string;
    cliente: string;
    fechaEntrega: string; // En CPR MICE
    horaEntrega: string;  // En CPR MICE
    elaboracionId: string;
    elaboracionNombre: string;
    cantidad: number;
    unidad: UnidadMedida;
}
export type PedidoPartnerStatus = 'Pendiente' | 'En Producción' | 'Listo para Entrega';
export type PickingIncidencia = {
    itemId: string;
    comment: string;
    timestamp: string;
};
export type PickingEntregaState = {
    hitoId: string;
    status: 'Pendiente' | 'En Proceso' | 'Preparado';
    checkedItems: Set<string>;
    incidencias: PickingIncidencia[];
    fotoUrl: string | null;
    ordenItems?: string[];
};

export const TIPO_PROVEEDOR_OPCIONES = ['Transporte', 'Hielo', 'Gastronomia', 'Personal', 'Atipicos', 'Decoracion', 'Servicios', 'Otros', 'Alquiler'] as const;
export type TipoProveedor = typeof TIPO_PROVEEDOR_OPCIONES[number];

export type Proveedor = {
    id: string;
    cif: string;
    IdERP?: string;
    nombreFiscal?: string;
    nombreComercial: string;
    direccionFacturacion: string;
    codigoPostal: string;
    ciudad: string;
    provincia: string;
    pais: string;
    emailContacto: string;
    telefonoContacto: string;
    contacto?: string; // Name of contact person
    iban?: string;
    formaDePagoHabitual?: string;
};

export type PersonalExternoDB = {
    id: string; // DNI
    proveedorId: string;
    nombre: string;
    apellido1: string;
    apellido2: string;
    nombreCompleto: string;
    nombreCompacto: string;
    telefono?: string;
    email?: string;
}

export type PortalUserRole = 'Admin' | 'Comercial' | 'CPR' | 'Pase' | 'Dirección' | 'Almacen' | 'Operaciones' | 'Project Manager' | 'Partner Gastronomia' | 'Partner Personal' | 'Transporte';

export const PORTAL_ROLES: PortalUserRole[] = ['Admin', 'Comercial', 'CPR', 'Pase', 'Dirección', 'Almacen', 'Operaciones', 'Project Manager', 'Partner Gastronomia', 'Partner Personal', 'Transporte'];

export type PortalUser = {
    id: string;
    nombre: string;
    email: string;
    roles: PortalUserRole[];
    proveedorId?: string;
};

export type ActivityLog = {
    id: string;
    timestamp: string;
    userId: string;
    userName: string;
    userRole: PortalUserRole;
    action: string;
    details: string;
    entityId: string; // e.g., osId, turnoId, etc.
};


export type MenajeDB = {
    id: string;
    descripcion: string;
};

export type CategoriaReceta = {
    id: string;
    nombre: string;
    snack?: boolean;
};

export type TipoCocina = {
    id: string;
    nombre: string;
};

export type HistoricoPreciosERP = {
    id: string; // Composite key: articuloErpId + fecha
    articuloErpId: string;
    fecha: string; // ISO Date
    precioCalculado: number;
    proveedorId?: string;
}

export type CosteFijoCPR = {
    id: string;
    concepto: string;
    importeMensual: number;
}

export type ObjetivoMensualCPR = {
    mes: string; // YYYY-MM
    presupuestoVentas: number;
    presupuestoCesionPersonal?: number;
    presupuestoGastosMP: number;
    presupuestoGastosPersonalMice?: number;
    presupuestoGastosPersonalExterno?: number;
    presupuestoOtrosGastos?: number;
    presupuestoPersonalSolicitadoCpr?: number;
}

export const ESTADO_SOLICITUD_PERSONAL_CPR = ['Solicitado', 'Aprobada', 'Rechazada', 'Asignada', 'Confirmado', 'Solicitada Cancelacion', 'Cerrado'] as const;
export type EstadoSolicitudPersonalCPR = typeof ESTADO_SOLICITUD_PERSONAL_CPR[number];

export type AsignacionPersonalCPR = {
    idPersonal: string;
    nombre: string;
    horaEntradaReal?: string;
    horaSalidaReal?: string;
    rating?: number;
    comentariosMice?: string;
};

export type SolicitudPersonalCPR = {
    id: string;
    fechaSolicitud: string; // ISO Date
    solicitadoPor: string;
    fechaServicio: string; // ISO Date
    horaInicio: string;
    horaFin: string;
    partida: PartidaProduccion;
    categoria: string;
    cantidad: number;
    motivo: string;
    estado: EstadoSolicitudPersonalCPR;
    proveedorId?: string; // ID del tipo de personal (que incluye el proveedor)
    costeImputado?: number;
    observacionesRRHH?: string;
    personalAsignado?: AsignacionPersonalCPR[];
};

export const ESTADO_CESION_PERSONAL = ['Solicitado', 'Aprobado', 'Asignado', 'Cerrado', 'Rechazado'] as const;
export type EstadoCesionPersonal = typeof ESTADO_CESION_PERSONAL[number];
export const CENTRO_COSTE_OPCIONES = ['SALA', 'COCINA', 'LOGISTICA', 'RRHH', 'ALMACEN', 'COMERCIAL', 'DIRECCION', 'MARKETING', 'PASE', 'CPR'] as const;
export type CentroCoste = typeof CENTRO_COSTE_OPCIONES[number];

export type CesionStorage = {
    id: string;
    fecha: string;
    centroCoste: CentroCoste;
    nombre: string;
    dni?: string;
    tipoServicio?: string;
    horaEntrada: string;
    horaSalida: string;
    precioHora: number;
    horaEntradaReal?: string;
    horaSalidaReal?: string;
    comentarios?: string;
    estado: EstadoCesionPersonal;
};


export * from './espacios';
