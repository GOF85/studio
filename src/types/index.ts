import type { OsFormValues } from "@/app/os/page";
import { z } from "zod";

export type CateringItem = {
  itemCode: string;
  description: string;
  price: number; // per day
  stock: number; // available stock
  imageUrl: string;
  imageHint: string;
  category: string;
};

export type OrderItem = CateringItem & {
  quantity: number;
};

export type MaterialOrderStatus = 'Asignado' | 'En preparación' | 'Listo';
export type MaterialOrderType = 'Almacén' | 'Bodega' | 'Bio' | 'Alquiler';

export type MaterialOrder = {
  id: string;
  osId: string;
  type: MaterialOrderType;
  items: OrderItem[];
  days: number;
  total: number;
  contractNumber: string;
  status: MaterialOrderStatus;
  deliveryDate?: string;
  deliverySpace?: string;
  deliveryLocation?: string;
};

export const VERTICALES = ['Recurrente', 'Grandes Eventos', 'Grandes Cuentas', 'Premium', 'Entregas'] as const;
export type Vertical = typeof VERTICALES[number];

// We need to allow string dates because they come from localStorage
export type ServiceOrder = Omit<OsFormValues, 'startDate' | 'endDate'> & {
    id: string;
    startDate: string; 
    endDate: string;
    deliveryLocations?: string[];
    objetivoGastoId?: string;
    vertical: Vertical;
    deliveryTime?: string;
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
};

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
};

export const PRECIO_CATEGORIAS = ['BODEGA', 'BIO', 'ALMACEN', 'UNIFORMIDAD', 'OTROS'] as const;
export type PrecioCategoria = typeof PRECIO_CATEGORIAS[number];

export type Precio = {
    id: string;
    producto: string;
    categoria: PrecioCategoria;
    loc: string; // localización
    precioUd: number;
    precioAlquilerUd: number;
    imagen: string; // url
    isDeliveryProduct?: boolean;
};

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
    bebidas: string;
    matBebida: string;
    materialGastro: string;
    manteleria: string;
    alergenos?: string;
};

export type ComercialBriefing = {
    osId: string;
    items: ComercialBriefingItem[];
};

export type ComercialAjuste = {
  id: string;
  concepto: string;
  importe: number;
};

export type GastronomyOrderStatus = 'Pendiente' | 'En preparación' | 'Incidencia' | 'Listo';

export type GastronomyOrderItem = {
    id: string; 
    type: 'item' | 'separator';
    nombre: string;
    categoria?: string;
    costeMateriaPrima?: number;
    quantity?: number;
}
export type GastronomyOrder = Omit<ComercialBriefingItem, 'precioUnitario' | 'conGastronomia' | 'importeFijo'> & {
    osId: string;
    status: GastronomyOrderStatus;
    items?: GastronomyOrderItem[]; // The actual food items ordered
    total?: number;
};

export type AlquilerDBItem = {
    id: string;
    concepto: string;
    precioAlquiler: number;
    precioReposicion: number;
    imagen: string; // url
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
    observaciones: string;
    status: 'Pendiente' | 'Confirmado' | 'En Ruta' | 'Entregado';
    firmaUrl?: string; // URL de la imagen de la firma
    firmadoPor?: string; // Nombre de quien firma
}
    
export type ProveedorHielo = {
    id: string;
    nombreProveedor: string;
    producto: string;
    precio: number;
}

export type HieloOrderItem = {
    id: string; // from ProveedorHielo
    producto: string;
    precio: number;
    cantidad: number;
}

export type HieloOrder = {
    id: string;
    osId: string;
    fecha: string;
    proveedorId: string;
    proveedorNombre: string;
    items: HieloOrderItem[];
    total: number;
    observaciones: string;
    status: 'Pendiente' | 'Confirmado' | 'En reparto' | 'Entregado';
}

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
};

export type ObjetivosGasto = CtaExplotacionObjetivos & {
    id: string;
    name: string;
}

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
    observaciones: string;
    precio: number;
    status: 'Pendiente' | 'Aprobado' | 'Rechazado';
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
    observaciones?: string;
    precio: number;
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
};

export type ProveedorPersonal = {
    id: string;
    nombreProveedor: string;
    categoria: string;
    precioHora: number;
};

export type PersonalExternoAjuste = {
    id: string;
    concepto: string;
    ajuste: number;
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
    observaciones: string;
    horaEntradaReal?: string;
    horaSalidaReal?: string;
    ajustes?: PersonalExternoAjuste[];
};

export type PruebaMenuItem = {
    id: string;
    type: 'header' | 'item';
    referencia: string;
    observaciones: string;
    mainCategory: 'BODEGA' | 'GASTRONOMÍA';
};

export type PruebaMenuData = {
    osId: string;
    items: PruebaMenuItem[];
    observacionesGenerales?: string;
    costePruebaMenu?: number;
}

// --- BOOK GASTRONOMICO ---
export type PartidaProduccion = 'FRIO' | 'CALIENTE' | 'PASTELERIA' | 'EXPEDICION';

export const ALERGENOS = ['GLUTEN', 'CRUSTACEOS', 'HUEVOS', 'PESCADO', 'CACAHUETES', 'SOJA', 'LACTEOS', 'FRUTOS_DE_CASCARA', 'APIO', 'MOSTAZA', 'SESAMO', 'SULFITOS', 'ALTRAMUCES', 'MOLUSCOS'] as const;
export type Alergeno = typeof ALERGENOS[number];

export const UNIDADES_MEDIDA = ['KILO', 'LITRO', 'UNIDAD'] as const;
export type UnidadMedida = typeof UNIDADES_MEDIDA[number];

export const ingredienteErpSchema = z.object({
  id: z.string(),
  IdERP: z.string(),
  nombreProductoERP: z.string().min(1, 'El nombre del producto es obligatorio'),
  referenciaProveedor: z.string(),
  nombreProveedor: z.string(),
  familiaCategoria: z.string(),
  precio: z.coerce.number(),
  unidad: z.enum(UNIDADES_MEDIDA),
});

export type IngredienteERP = z.infer<typeof ingredienteErpSchema>;


export type IngredienteInterno = {
    id: string;
    nombreIngrediente: string;
    productoERPlinkId: string;
    alergenosPresentes: Alergeno[];
    alergenosTrazas: Alergeno[];
    mermaPorcentaje: number;
};

export type ComponenteElaboracion = {
    id: string;
    tipo: 'ingrediente' | 'elaboracion';
    componenteId: string;
    nombre: string;
    cantidad: number;
    costePorUnidad?: number;
};

export type FormatoExpedicion = {
    id: string;
    nombre: string;
}

export type Elaboracion = {
    id: string;
    nombre: string;
    produccionTotal: number; 
    unidadProduccion: UnidadMedida;
    partidaProduccion: PartidaProduccion;
    componentes: ComponenteElaboracion[];
    instruccionesPreparacion: string;
    fotosProduccionURLs: string[];
    videoProduccionURL?: string;
    // --- Campos de Expedición ---
    formatoExpedicion: string;
    ratioExpedicion: number;
    tipoExpedicion: 'REFRIGERADO' | 'CONGELADO' | 'SECO';
    producidoPor?: 'CPR MICE' | 'Partner Externo';
    // --- Campos calculados (pueden no estar en el form) ---
    costePorUnidad?: number; 
    alergenosPresentes?: Alergeno[];
    alergenosTrazas?: Alergeno[];
};


export type ElaboracionEnReceta = {
  id: string; // elab.id
  elaboracionId: string;
  nombre: string;
  cantidad: number; // en la unidad de la elaboración
  coste: number; // Coste original de la elaboración por su unidad
  gramaje: number;
  alergenos?: Alergeno[];
  unidad: UnidadMedida;
  merma: number; // Porcentaje de merma en el emplatado/servicio
};

export type MenajeEnReceta = {
  id: string; // menaje.id
  menajeId: string;
  descripcion: string;
  ratio: number; // Ej: 1 (uno por comensal), 0.5 (uno cada dos comensales)
}

export const SABORES_PRINCIPALES = ['SALADO', 'DULCE', 'ACIDO', 'AMARGO', 'UMAMI'] as const;
export type SaborPrincipal = typeof SABORES_PRINCIPALES[number];

export type Receta = {
    id: string;
    nombre: string;
    visibleParaComerciales: boolean;
    descripcionComercial: string;
    responsableEscandallo: string;
    categoria: string;
    partidaProduccion?: string;
    estacionalidad: 'INVIERNO' | 'VERANO' | 'MIXTO';
    tipoDieta: 'VEGETARIANO' | 'VEGANO' | 'AMBOS' | 'NINGUNO';
    gramajeTotal: number; // en gramos
    elaboraciones: ElaboracionEnReceta[];
    menajeAsociado: MenajeEnReceta[];
    instruccionesMiseEnPlace?: string;
    instruccionesRegeneracion?: string;
    instruccionesEmplatado?: string;
    fotosEmplatadoURLs?: string[];
    requiereRevision?: boolean;
    // --- Campos de Coste ---
    porcentajeCosteProduccion: number;
    costeMateriaPrima: number; // Calculado
    precioVenta: number; // Calculado
    alergenos: Alergeno[];
    pvpBandeja?: number;
    // --- Atributos Gastronómicos ---
    perfilSaborPrincipal?: SaborPrincipal;
    perfilSaborSecundario?: string[];
    perfilTextura?: string[];
    tipoCocina?: string;
    temperaturaServicio?: 'CALIENTE' | 'TIBIO' | 'AMBIENTE' | 'FRIO' | 'HELADO';
    tecnicaCoccionPrincipal?: string;
    // --- Atributos Logísticos ---
    potencialMiseEnPlace?: 'COMPLETO' | 'PARCIAL' | 'AL_MOMENTO';
    formatoServicioIdeal?: string[];
    equipamientoCritico?: string[];
    dificultadProduccion?: number; // 1-5
    estabilidadBuffet?: number; // 1-5
    escalabilidad?: 'FACIL' | 'MEDIA' | 'DIFICIL';
    // --- Atributos Comerciales ---
    etiquetasTendencia?: string[];
};

export type MenajeDB = {
    id: string;
    descripcion: string;
    fotoURL?: string;
}

export type CategoriaReceta = {
    id: string;
    nombre: string;
}

export type TipoCocina = {
    id: string;
    nombre: string;
}

// --- CPR ---

export type OrdenFabricacion = {
    id: string; // Lote único
    fechaCreacion: string;
    fechaProduccionPrevista: string;
    elaboracionId: string;
    elaboracionNombre: string;
    cantidadTotal: number;
    necesidadTotal?: number;
    unidad: UnidadMedida;
    partidaAsignada: PartidaProduccion;
    tipoExpedicion: 'REFRIGERADO' | 'CONGELADO' | 'SECO';
    estado: 'Pendiente' | 'Asignada' | 'En Proceso' | 'Finalizado' | 'Validado' | 'Incidencia';
    incidencia: boolean;
    incidenciaObservaciones?: string;
    okCalidad: boolean;
    responsable?: string;
    responsableCalidad?: string;
    cantidadReal?: number | null;
    osIDs: string[]; // Referencia a las OS que necesitan esta elaboración
    // Timestamps for productivity
    fechaAsignacion?: string;
    fechaInicioProduccion?: string;
    fechaFinalizacion?: string;
    fechaValidacionCalidad?: string;
}

export type PedidoPlantilla = {
    id: string;
    nombre: string;
    tipo: MaterialOrderType;
    items: {
        itemCode: string;
        quantity: number;
        description: string;
    }[];
}

export type ContenedorIsotermo = {
    id: string;
    nombre: string;
}

export type ContenedorDinamico = {
    id: string; // 'cont-timestamp'
    hitoId: string;
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

export type PickingStatus = 'Pendiente' | 'Preparado' | 'Enviado' | 'Entregado' | 'Retornado';

export type PickingState = {
    osId: string;
    status: PickingStatus;
    assignedContainers: ContenedorDinamico[];
    itemStates: LoteAsignado[];
}

export type ExcedenteProduccion = {
    ofId: string; // Lote de origen
    fechaProduccion: string;
    diasCaducidad?: number;
    cantidadAjustada: number; // Cantidad real que queda
    motivoAjuste?: string;
    fechaAjuste?: string;
}

// --- ENTREGAS ---

export type PackDeVenta = {
    id: string;
    nombre: string;
    pvp: number;
    componentes: {
        itemCode: string; // Corresponds to `id` in `Precio`
        description: string;
        quantity: number;
    }[];
}

export type MargenCategoria = {
    id: string;
    categoria: string; // e.g. BODEGA, BIO, ALMACEN, GASTRONOMIA_ENTREGAS
    margen: number; // Porcentaje
}

export type PedidoEntregaItem = {
    id: string; // Can be Receta.id, PackDeVenta.id, or Precio.id
    type: 'receta' | 'pack' | 'producto';
    nombre: string;
    quantity: number;
    coste: number;
    pvp: number;
    categoria?: string; // For margin calculation
}

export type PedidoEntrega = {
    osId: string;
    items: PedidoEntregaItem[];
}

export type PedidoPartner = {
    id: string; // Composite key
    osId: string;
    serviceNumber: string;
    cliente: string;
    fechaEntrega: string;
    horaEntrega: string;
    elaboracionId: string;
    elaboracionNombre: string;
    cantidad: number;
    unidad: UnidadMedida;
    status: 'Pendiente' | 'En Producción' | 'Listo para Entrega en CPR';
};
