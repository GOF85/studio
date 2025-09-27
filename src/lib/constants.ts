import type { ObjetivosGasto } from './types';

export const GASTO_LABELS: Record<keyof Omit<ObjetivosGasto, 'id' | 'name'>, string> = {
    gastronomia: 'Gastronomía',
    bodega: 'Bodega',
    consumibles: 'Consumibles (Bio)',
    hielo: 'Hielo',
    almacen: 'Almacén',
    alquiler: 'Alquiler material',
    transporte: 'Transporte',
    decoracion: 'Decoración',
    atipicos: 'Atípicos',
    personalMice: 'Personal MICE',
    personalExterno: 'Personal Externo',
    costePruebaMenu: 'Coste Prueba de Menu',
};
