

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { parse, differenceInMinutes } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined || isNaN(value)) {
    return (0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
  }
  return value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

export function formatNumber(value: number, decimals: number = 2) {
    if (isNaN(value)) return '0';
    return value.toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatUnit(unit: string) {
    const unitMap: Record<string, string> = {
        'KG': 'kg',
        'L': 'l',
        'UD': 'ud',
    }
    return unitMap[unit] || unit;
}

export function formatPercentage(value: number) {
  if (isNaN(value)) return '0,00%';
  return `${(value * 100).toFixed(2)}%`.replace('.',',');
}

export function calculateHours(start?: string, end?: string): number {
    if (!start || !end) return 0;
    try {
        const startTime = parse(start, 'HH:mm', new Date());
        const endTime = parse(end, 'HH:mm', new Date());

        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
            console.error('Invalid time format for calculating hours:', { start, end });
            return 0;
        }
        
        if (endTime < startTime) {
            endTime.setDate(endTime.getDate() + 1);
        }

        const diff = differenceInMinutes(endTime, startTime);
        return diff > 0 ? diff / 60 : 0;
    } catch (e) {
        console.error("Error calculating hours:", e);
        return 0;
    }
}

export function formatDuration(hours: number) {
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

