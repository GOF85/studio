
import type { ObjetivosGasto, Alergeno } from '@/types';

export const GASTO_LABELS: Record<keyof Omit<ObjetivosGasto, 'id' | 'name'>, string> = {
    gastronomia: 'Gastronomía',
    bodega: 'Bodega',
    consumibles: 'Bio',
    hielo: 'Hielo',
    almacen: 'Almacén',
    alquiler: 'Alquiler',
    transporte: 'Transporte',
    decoracion: 'Decoración',
    atipicos: 'Atípicos',
    personalMice: 'Personal MICE',
    personalExterno: 'Personal Externo',
    costePruebaMenu: 'Coste Prueba de Menu',
};

export const ALERGENOS_INFO: Record<Alergeno, { abbr: string; color: string }> = {
    GLUTEN: { abbr: "GLU", color: "bg-orange-500" },
    CRUSTACEOS: { abbr: "CRU", color: "bg-sky-500" },
    HUEVOS: { abbr: "HUE", color: "bg-amber-400" },
    PESCADO: { abbr: "PES", color: "bg-indigo-800" },
    CACAHUETES: { abbr: "CAC", color: "bg-yellow-700" },
    SOJA: { abbr: "SOJ", color: "bg-green-600" },
    LACTEOS: { abbr: "LAC", color: "bg-amber-800" },
    'FRUTOS DE CASCARA': { abbr: "FDC", color: "bg-red-600" },
    APIO: { abbr: "API", color: "bg-lime-500" },
    MOSTAZA: { abbr: "MOS", color: "bg-yellow-500" },
    SESAMO: { abbr: "SES", color: "bg-gray-500" },
    SULFITOS: { abbr: "SUL", color: "bg-purple-800" },
    ALTRAMUCES: { abbr: "ALT", color: "bg-red-500" },
    MOLUSCOS: { abbr: "MOL", color: "bg-cyan-400" },
};
