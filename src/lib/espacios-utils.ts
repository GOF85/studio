import { EspacioV2 } from '@/types/espacios';

/**
 * Calculates the completeness percentage of an Espacio profile.
 * Based on weighted sections:
 * - Identity (25%)
 * - Media (15%)
 * - Capacity (15%)
 * - Commercial (15%)
 * - Logistics & Details (20%)
 * - Contacts (10%)
 */
export function calculateEspacioCompleteness(espacio: EspacioV2): number {
    let score = 0;

    // 1. Identity (Max 25 points)
    if (espacio.nombre) score += 5;
    if (espacio.ciudad) score += 5;
    if (espacio.provincia) score += 5;
    if (espacio.tiposEspacio && espacio.tiposEspacio.length > 0) score += 5;
    if (espacio.descripcionCorta) score += 5;

    // 2. Media (Max 15 points)
    // Check for main image or images array
    if (espacio.imagenPrincipalUrl || (espacio.imagenes && espacio.imagenes.length > 0)) {
        score += 15;
    }

    // 3. Capacity (Max 15 points)
    if (espacio.aforoMaxCocktail || espacio.aforoMaxBanquete) score += 5;
    if (espacio.salas && espacio.salas.length > 0) {
        score += 10;
    }

    // 4. Commercial (Max 15 points)
    if (espacio.relacionComercial) score += 5;
    if (espacio.precioOrientativoAlquiler || espacio.canonEspacioFijo || espacio.canonEspacioPorcentaje) {
        score += 10;
    }

    // 5. Logistics & Details (Max 20 points)
    let logisticsScore = 0;
    if (espacio.tipoCocina) logisticsScore += 4;
    if (espacio.accesoVehiculos) logisticsScore += 4;
    if (espacio.aparcamiento || espacio.transportePublico) logisticsScore += 4;
    if (espacio.accesibilidadAsistentes) logisticsScore += 4;
    if (espacio.conexionWifi) logisticsScore += 4;
    score += Math.min(logisticsScore, 20);

    // 6. Contacts (Max 10 points)
    if (espacio.contactos && espacio.contactos.length > 0) {
        score += 10;
    }

    return Math.min(score, 100);
}

export function getCompletenessColor(percentage: number): string {
    if (percentage < 50) return 'text-red-500';
    if (percentage < 80) return 'text-yellow-500';
    return 'text-green-500';
}

export function getCompletenessBadgeColor(percentage: number): string {
    if (percentage < 50) return 'bg-red-100 text-red-800 hover:bg-red-100';
    if (percentage < 80) return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
    return 'bg-green-100 text-green-800 hover:bg-green-100';
}
