

import type { OsFormValues } from "@/app/os/page";

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

// We need to allow string dates because they come from localStorage
export type ServiceOrder = Omit<OsFormValues, 'startDate' | 'endDate'> & {
    id: string;
    startDate: string; 
    endDate: string;
    deliveryLocations?: string[];
    objetivoGastoId?: string;
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
    accesoVehiculos: string;
    aparcamiento: string;
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
};

export type GastronomiaDBItem = {
    id: string;
    referencia: string;
    categoria: string;
    imagenRef: string; // url
    imagenEmpl: string; // url
    precio: number;
    gramaje: number;
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
    bebidas: string;
    matBebida: string;
    materialGastro: string;
    manteleria: string;
};

export type ComercialBriefing = {
    osId: string;
    items: ComercialBriefingItem[];
};

export type GastronomyOrderStatus = 'Pendiente' | 'En preparación' | 'Incidencia' | 'Listo';

export type GastronomyOrderItem = {
    id: string; // from GastronomiaDBItem
    referencia: string;
    categoria: string;
    precio: number;
    gramaje: number;
    quantity: number;
}
export type GastronomyOrder = Omit<ComercialBriefingItem, 'precioUnitario' | 'conGastronomia'> & {
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
    status: 'Pendiente' | 'Confirmado' | 'En Ruta' | 'Finalizado';
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
    horaEntradaReal: string;
    horaSalidaReal: string;
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

export const ALERGENOS = ['GLUTEN', 'CRUSTACEOS', 'HUEVOS', 'PESCADO', 'CACAHUETES', 'SOJA', 'LACTEOS', 'FRUTOS_DE_CASCARA', 'APIO', 'MOSTAZA', 'SESAMO', 'SULFITOS', 'ALTRAMUCES', 'MOLUSCOS'] as const;
export type Alergeno = typeof ALERGENOS[number];

export type UnidadMedida = 'KILO' | 'LITRO' | 'UNIDAD';

export type IngredienteERP = {
    id: string;
    nombreProductoERP: string;
    referenciaProveedor: string;
    nombreProveedor: string;
    familiaCategoria: string;
    precio: number;
    unidad: UnidadMedida;
};

export type IngredienteInterno = {
    id: string;
    nombreIngrediente: string;
    productoERPlinkId: string;
    mermaPorcentaje: number;
    alergenos: Alergeno[];
};

export type ComponenteElaboracion = {
    // Polimórfico: puede ser un ingrediente o una sub-elaboración
    id: string;
    tipo: 'ingrediente' | 'elaboracion';
    componenteId: string; // ID de IngredienteInterno o de Elaboracion
    cantidad: number;
};

export type Elaboracion = {
    id: string;
    nombre: string;
    // tipo: 'BASE' | 'COMPUESTA'; // No es necesario si `componentes` es polimórfico
    componentes: ComponenteElaboracion[];
    produccionTotal: number; // Ej: 1.5 (se producen 1.5 Kilos)
    unidadProduccion: UnidadMedida;
    costePorUnidad: number; // Calculado: coste total de componentes / produccionTotal
    alergenos: Alergeno[]; // Calculado
    instruccionesPreparacion: string;
    fotosProduccionURLs: string[];
    videoProduccionURL?: string;
    // --- Campos de Expedición ---
    formatoExpedicion: string;
    ratioExpedicion: number; // Ej: 1.5 (kg por barqueta)
    tipoExpedicion: 'REFRIGERADO' | 'CONGELADO' | 'SECO';
};

export type Receta = {
    id: string;
    nombre: string;
    descripcionComercial: string;
    responsableEscandallo: string;
    categoria: string;
    partidaProduccion: 'FRIO' | 'CALIENTE' | 'PASTELERIA' | 'EXPEDICION';
    estacionalidad: 'INVIERNO' | 'VERANO' | 'MIXTO';
    tipoDieta: 'VEGETARIANO' | 'VEGANO' | 'AMBOS' | 'NINGUNO';
    gramajeTotal: number; // en gramos
    elaboraciones: { elaboracionId: string; cantidad: number; }[];
    menajeAsociado: { menajeId: string; ratio: number; }[];
    instruccionesMiseEnPlace: string;
    instruccionesRegeneracion: string;
    instruccionesEmplatado: string;
    fotosEmplatadoURLs: string[];
    // --- Campos de Coste ---
    porcentajeCosteProduccion: number;
    costeMateriaPrima: number; // Calculado
    precioVentaRecomendado: number; // Calculado
    alergenos: Alergeno[]; // Calculado
};
