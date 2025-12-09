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
    return `${(value * 100).toFixed(2)}%`;
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

export function downloadCSVTemplate(headers: string[], filename: string) {
    const csv = headers.join(';');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Convierte una URL de imagen a una URL pública de Supabase Storage.
 * Si la URL ya es una URL completa (http/https), la devuelve tal cual.
 * Si es una ruta relativa, la convierte a una URL pública del bucket 'recetas'.
 */
export function getSupabaseImageUrl(url: string | null | undefined, bucket: string = 'recetas'): string | null {
    if (!url) return null;
    
    // Si ya es una URL completa, devolverla tal cual
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    
    // Si es una ruta relativa, construir la URL pública de Supabase
    // Las rutas en Supabase Storage son: bucket/path/to/file.jpg
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    if (!supabaseUrl) {
        console.warn('NEXT_PUBLIC_SUPABASE_URL no está definida');
        return url; // Devolver la URL original como fallback
    }
    
    // Limpiar la ruta (eliminar barras iniciales duplicadas)
    const cleanPath = url.replace(/^\/+/, '');
    
    // Construir la URL pública de Supabase Storage
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`;
}
