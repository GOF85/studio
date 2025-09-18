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
};

export type Personal = {
    id: string;
    nombre: string;
    departamento: string;
    categoria: string;
    telefono: string;
    mail: string;
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

export type GastronomyOrder = ComercialBriefingItem & {
    osId: string;
    status: GastronomyOrderStatus;
};

export type AlquilerDBItem = {
    id: string;
    concepto: string;
    precioAlquiler: number;
    precioReposicion: number;
    imagen: string; // url
};
