'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { resolveOsId } from '@/lib/supabase';

export interface LocationOption {
  value: string;
  label: string;
  capacity?: number;
  tipo?: string;
}

/**
 * Hook para obtener todas las localizaciones disponibles de un OS
 * Lee del briefing para saber en qué espacios/salas habrá servicio
 * Solo retorna localizaciones que tienen briefing items
 */
export function useLocationOptions(osId?: string) {
  return useQuery({
    queryKey: ['location-options', osId],
    queryFn: async () => {
      if (!osId) return [];

      const resolvedOsId = await resolveOsId(osId);
      if (!resolvedOsId) throw new Error('OS no encontrado');

      // Obtener el evento para acceder al briefing
      const { data: evento, error: eventoError } = await supabase
        .from('eventos')
        .select(
          `
          id,
          comercial_briefings(id, items)
        `
        )
        .eq('id', resolvedOsId)
        .single();

      if (eventoError) throw eventoError;
      if (!evento) return [];

      // Extraer localizaciones únicas del briefing
      const localizaciones = new Set<string>();
      const locationDetails: Record<string, LocationOption> = {};

      const briefings = evento.comercial_briefings || [];
      for (const briefing of briefings) {
        const items = briefing.items || [];
        for (const item of items) {
          if (item.localizacion) {
            localizaciones.add(item.localizacion);
            // Guardar detalles si hay
            locationDetails[item.localizacion] = {
              value: item.localizacion,
              label: item.localizacion,
              capacity: item.asistentes,
              tipo: 'Espacio', // O detectar dinámicamente si existe
            };
          }
        }
      }

      // Si no hay briefing items con localización, retornar opciones genéricas
      if (localizaciones.size === 0) {
        return [
          { value: 'Salón', label: 'Salón', tipo: 'Espacio' },
          { value: 'Cocina', label: 'Cocina', tipo: 'Cocina' },
          { value: 'Barra', label: 'Barra', tipo: 'Espacio' },
          { value: 'Terraza', label: 'Terraza', tipo: 'Espacio' },
        ];
      }

      return Array.from(localizaciones)
        .map(loc => locationDetails[loc])
        .filter(Boolean);
    },
    enabled: !!osId,
  });
}

/**
 * Hook para obtener todas las localizaciones con pedidos pendientes
 * Útil para agrupar por localización en la UI
 */
export function useLocalizationsWithPedidos(osId?: string) {
  return useQuery({
    queryKey: ['localizations-with-pedidos', osId],
    queryFn: async () => {
      if (!osId) return [];

      const resolvedOsId = await resolveOsId(osId);
      if (!resolvedOsId) throw new Error('OS no encontrado');

      const { data, error } = await supabase
        .from('os_pedidos_pendientes')
        .select('localizacion')
        .eq('os_id', resolvedOsId)
        .neq('localizacion', null);

      if (error) throw error;

      // Extraer localizaciones únicas y ordenar
      const localizaciones = Array.from(
        new Set((data || []).map(d => d.localizacion))
      ).sort();

      return localizaciones;
    },
    enabled: !!osId,
  });
}
