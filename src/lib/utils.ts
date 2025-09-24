import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { UnidadMedida } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0,00 €';
  return value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

export function formatNumber(value: number | null | undefined, decimals = 0): string {
    if (value === null || value === undefined) return '0';
    return value.toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatUnit(unit: UnidadMedida | string): string {
    switch (unit) {
        case 'KILO': return 'Kg';
        case 'LITRO': return 'L';
        case 'UNIDAD': return 'Ud';
        default: return unit;
    }
}
