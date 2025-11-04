

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
    GLUTEN: { abbr: "GLU", color: "#f59e0b" }, // amber-500
    CRUSTACEOS: { abbr: "CRU", color: "#0ea5e9" }, // sky-500
    HUEVOS: { abbr: "HUE", color: "#facc15" }, // yellow-400
    PESCADO: { abbr: "PES", color: "#3b82f6" }, // blue-600
    CACAHUETES: { abbr: "CAC", color: "#a16207" }, // yellow-700
    SOJA: { abbr: "SOJ", color: "#16a34a" }, // green-600
    LACTEOS: { abbr: "LAC", color: "#92400e" }, // amber-800
    'FRUTOS DE CASCARA': { abbr: "FDC", color: "#dc2626" }, // red-600
    APIO: { abbr: "API", color: "#84cc16" }, // lime-500
    MOSTAZA: { abbr: "MOS", color: "#eab308" }, // yellow-500
    SESAMO: { abbr: "SES", color: "#6b7280" }, // gray-500
    SULFITOS: { abbr: "SUL", color: "#7e22ce" }, // purple-700
    ALTRAMUCES: { abbr: "ALT", color: "#ef4444" }, // red-500
    MOLUSCOS: { abbr: "MOL", color: "#22d3ee" }, // cyan-400
};
