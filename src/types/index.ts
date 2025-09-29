import { z } from "zod";

export type CateringItem = {
  itemCode: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  imageHint: string;
  category: string;
};

export type OrderItem = CateringItem & {
  quantity: number;
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
    spacePercentage: number;
    facturacion: number;
    plane: string;
    comments: string;
    status: 'Borrador' | 'Pendiente' | 'Confirmado';
    deliveryTime?: string;
    deliveryLocations?: string[];
    objetivoGastoId?: string;
    vertical?: 'Catering' | 'Entregas';
};

export type MaterialOrder = {
    id: string;
    osId: string;
    type: 'Almacén' | 'Bodega' | 'Bio' | 'Alquiler';
    status: 'Asignado' | 'En preparación' | 'Listo';
    items: OrderItem[];
    days: number;
    total: number;
    contractNumber: string;
    deliveryDate?: string;
    deliverySpace?: string;
    deliveryLocation?: string;
};


export type Personal = {
    id: string;
    nombre: string;
    departamento: string;
    categoria: string;
    telefono: string;
    mail: string;
    dni: string;
    precioHora: number;
}

export type Espacio = {
    id: string;
    espacio: string;
    escaparateMICE: string;
    carpetaDRIVE: string;
    calle: string;
    nombreContacto1: string;
    telefonoContacto1: string;
    emailContacto1: string;
    canonEspacioPorcentaje: number;
    canonEspacioFijo: number;
    canonMcPorcentaje: number;
    canonMcFijo: number;
    comisionAlquilerMcPorcentaje: number;
    precioOrientativoAlquiler: string;
    horaLimiteCierre: string;
    aforoCocktail: number;
    aforoBanquete: number;
    auditorio: string;
    aforoAuditorio: number;
    zonaExterior: string;
    capacidadesPorSala: string;
    numeroDeSalas: number;
    tipoDeEspacio: string;
    tipoDeEventos: string;
    ciudad: string;
    directorio: string;
    descripcion: string;
    comentariosVarios: string;
    equipoAudiovisuales: string;
    cocina: string;
    accesibilidadAsistentes: string;
    pantalla: string;
    plato: string;
aparcamiento: string;
  accesoVehiculos: string;
  conexionWifi: string;
  homologacion: string;
  comentariosMarketing: string;
}

export const PRECIO_CATEGORIAS = ['Bebida', 'Menaje', 'Vajilla', 'Cristalería', 'Mantelería', 'Mobiliario', 'Decoración', 'Maquinaria', 'Transporte'] as const;
export type PrecioCategoria = typeof PRECIO_CATEGORIAS[number];

export type Precio = {
    id: string;
    producto: string;
    categoria: PrecioCategoria;
    loc: string;
    precioUd: number;
    precioAlquilerUd: number;
    pvp: number;
    iva: number;
    imagen: string;
    isDeliveryProduct?: boolean;
}

export type AlquilerDBItem = {
  id: string;
  concepto: string;
  precioAlquiler: number;
  precioReposicion: number;
  imagen: string;
};

export type TipoServicio = {
    id: string;
    servicio: string;
}

export type ProveedorTransporte = {
    id: string;
    nombreProveedor: string;
    tipoTransporte: string;
    precio: number;
}

export type ProveedorHielo = {
    id: string;
    nombreProveedor: string;
    producto: string;
    precio: number;
}

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

export type GastronomyOrderStatus = 'Pendiente' | 'En preparación' | 'Listo' | 'Incidencia';

export type GastronomyOrderItem = {
    id: string; // Receta ID
    type: 'item' | 'separator';
    nombre: string;
    categoria?: string;
    costeMateriaPrima?: number;
    quantity?: number;
}

export type GastronomyOrder = {
    id: string; // briefing item ID
    osId: string;
    status: GastronomyOrderStatus;
    descripcion: string;
    fecha: string;
    horaInicio: string;
    asistentes: number;
    comentarios?: string;
    sala?: string;
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

export type ProveedorPersonal = {
  id: string;
  nombreProveedor: string;
  categoria: string;
  precioHora: number;
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
    horaEntradaReal?: string;
    horaSalidaReal?: string;
}

export type PersonalExternoOrder = {
  id: string;
  osId: string;
  proveedorId: string;
  categoria: string;
  cantidad: number;
  precioHora: number;
  fecha: string;
  horaEntrada: string;
  horaSalida: string;
  centroCoste: 'SALA' | 'COCINA' | 'LOGISTICA' | 'RRHH';
  tipoServicio: 'Producción' | 'Montaje' | 'Servicio' | 'Recogida' | 'Descarga';
  observaciones?: string;
  horaEntradaReal?: string;
  horaSalidaReal?: string;
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
};

export type PersonalExternoAjuste = {
    id: string;
    concepto: string;
    ajuste: number;
}
export const UNIDADES_MEDIDA = ['UNIDAD', 'KILO', 'LITRO', 'GRAMO', 'BOTELLA', 'CAJA', 'PACK'] as const;
export type UnidadMedida = typeof UNIDADES_MEDIDA[number];

export const ingredienteErpSchema = z.object({
  id: z.string(),
  IdERP: z.string(),
  nombreProductoERP: z.string().min(1, 'El nombre del producto es obligatorio'),
  referenciaProveedor: z.string(),
  nombreProveedor: z.string(),
  familiaCategoria: z.string(),
  precio: z.coerce.number().min(0),
  unidad: z.enum(UNIDADES_MEDIDA),
});

export type IngredienteERP = z.infer<typeof ingredienteErpSchema>;

export const ALERGENOS = ['GLUTEN', 'CRUSTACEOS', 'HUEVOS', 'PESCADO', 'CACAHUETES', 'SOJA', 'LACTEOS', 'FRUTOS_DE_CASCARA', 'APIO', 'MOSTAZA', 'SESAMO', 'SULFITOS', 'ALTRAMUCES', 'MOLUSCOS'] as const;
export type Alergeno = typeof ALERGENOS[number];

export type IngredienteInterno = {
    id: string;
    nombreIngrediente: string;
    productoERPlinkId: string;
    mermaPorcentaje: number;
    alergenosPresentes: Alergeno[];
    alergenosTrazas: Alergeno[];
}

export type ComponenteElaboracion = {
    id: string;
    tipo: 'ingrediente' | 'elaboracion';
    componenteId: string; // ID of IngredienteInterno or another Elaboracion
    nombre: string;
    cantidad: number;
    costePorUnidad: number;
}

export type Elaboracion = {
    id: string;
    nombre: string;
    produccionTotal: number;
    unidadProduccion: UnidadMedida;
    partidaProduccion: PartidaProduccion;
    componentes: ComponenteElaboracion[];
    instruccionesPreparacion: string;
    fotosProduccionURLs?: string[];
    videoProduccionURL?: string;
    formatoExpedicion: string;
    ratioExpedicion: number;
    tipoExpedicion: 'REFRIGERADO' | 'CONGELADO' | 'SECO';
    costePorUnidad?: number;
    alergenos?: Alergeno[];
}

export type ElaboracionEnReceta = {
  id: string;
  elaboracionId: string;
  nombre: string;
  cantidad: number;
  coste: number;
  gramaje: number;
  alergenos?: Alergeno[];
  unidad: 'KILO' | 'LITRO' | 'UNIDAD';
  merma: number;
}

export type MenajeDB = {
    id: string;
    descripcion: string;
    fotoURL?: string;
}

export type MenajeEnReceta = {
    id: string;
    menajeId: string;
    descripcion: string;
    ratio: number;
}

export const SABORES_PRINCIPALES = ['DULCE', 'SALADO', 'ÁCIDO', 'AMARGO', 'UMAMI'] as const;
export type SaborPrincipal = typeof SABORES_PRINCIPALES[number];

export const PARTIDAS_PRODUCCION = ['FRIO', 'CALIENTE', 'PASTELERIA', 'EXPEDICION'] as const;
export type PartidaProduccion = typeof PARTIDAS_PRODUCCION[number];

export type Receta = {
    id: string;
    nombre: string;
    visibleParaComerciales: boolean;
    descripcionComercial: string;
    responsableEscandallo: string;
    categoria: string;
    partidaProduccion?: string; // Calculated field
    gramajeTotal?: number;
    estacionalidad: 'INVIERNO' | 'VERANO' | 'MIXTO';
    tipoDieta: 'VEGETARIANO' | 'VEGANO' | 'AMBOS' | 'NINGUNO';
    porcentajeCosteProduccion: number;
    elaboraciones: ElaboracionEnReceta[];
    menajeAsociado: MenajeEnReceta[];
    instruccionesMiseEnPlace: string;
    instruccionesRegeneracion: string;
    instruccionesEmplatado: string;
    fotosEmplatadoURLs?: string[];
    perfilSaborPrincipal?: SaborPrincipal;
    perfilSaborSecundario?: string[];
    perfilTextura?: string[];
    tipoCocina?: string;
    temperaturaServicio?: 'CALIENTE' | 'TIBIO' | 'AMBIENTE' | 'FRIO' | 'HELADO';
    tecnicaCoccionPrincipal?: string;
    potencialMiseEnPlace?: 'COMPLETO' | 'PARCIAL' | 'AL_MOMENTO';
    formatoServicioIdeal?: string[];
    equipamientoCritico?: string[];
    dificultadProduccion?: number; // 1-5
    estabilidadBuffet?: number; // 1-5
    escalabilidad?: 'FACIL' | 'MEDIA' | 'DIFICIL';
    etiquetasTendencia?: string[];
    // Calculated fields
    costeMateriaPrima?: number;
    precioVenta?: number;
    alergenos?: Alergeno[];
    requiereRevision?: boolean;
}

export type CategoriaReceta = {
    id: string;
    nombre: string;
}
export type TipoCocina = {
    id: string;
    nombre: string;
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
    hitoId: string;
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
export type MaterialOrderType = 'Almacén' | 'Bodega' | 'Bio' | 'Alquiler';
export type FormatoExpedicion = {
  id: string;
  nombre: string;
};

export type ExcedenteProduccion = {
    ofId: string;
    fechaProduccion: string;
    diasCaducidad?: number;
    cantidadAjustada: number;
    motivoAjuste: string;
    fechaAjuste: string;
}

// ---- NUEVA VERTICAL DE ENTREGAS ----

export const CATEGORIAS_PRODUCTO_VENTA = ['Gastronomía', 'Bodega', 'Consumibles', 'Almacen', 'Personal', 'Transporte', 'Otros'] as const;
export type CategoriaProductoVenta = typeof CATEGORIAS_PRODUCTO_VENTA[number];

export type ComponenteProductoVenta = {
    erpId: string;
    nombre: string;
    cantidad: number;
    coste: number;
}

export type ImagenProducto = {
  id: string;
  url: string;
  isPrincipal: boolean;
}

export type ProductoVenta = {
    id: string;
    nombre: string;
    categoria: CategoriaProductoVenta;
    ubicacion?: string;
    imagenes: ImagenProducto[];
    pvp: number;
    pvpIfema?: number;
    iva: number;
    producidoPorPartner: boolean;
    recetaId?: string;
    componentes: ComponenteProductoVenta[];
    exclusivoIfema?: boolean;
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
    id: string; // osId-elaboracionId
    osId: string;
    serviceNumber: string;
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
};