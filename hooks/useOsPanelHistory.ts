'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { resolveOsId } from '@/lib/supabase';
import type { OsPanelChangeLog } from '@/types/os-panel';

interface UseOsPanelHistoryOptions {
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

export function useOsPanelHistory(
  osId: string | undefined,
  options?: UseOsPanelHistoryOptions
) {
  const { limit = 10, offset = 0, enabled = true } = options || {};

  return useQuery({
    queryKey: ['osPanelHistory', osId, limit, offset],
    queryFn: async () => {
      console.debug('[useOsPanelHistory] Query function called:', { osId });
      
      if (!osId) {
        console.debug('[useOsPanelHistory] No osId provided, returning empty');
        return {
          cambios: [] as OsPanelChangeLog[],
          total: 0,
          limit,
          offset,
        };
      }

      const targetId = await resolveOsId(osId);
      console.debug('[useOsPanelHistory] Resolved osId to targetId:', { osId, targetId });

      const { data, error, count } = await supabase
        .from('os_panel_cambios')
        .select('*', { count: 'exact' })
        .eq('os_id', targetId)
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      console.debug('[useOsPanelHistory] Query result:', {
        resultCount: data?.length || 0,
        totalCount: count,
        error: error?.message,
      });

      if (error) throw error;

      return {
        cambios: (data || []) as OsPanelChangeLog[],
        total: count || 0,
        limit,
        offset,
      };
    },
    enabled: enabled && !!osId,
  });
}

/**
 * Format change log entry for display
 */
export function formatChangeLogEntry(log: OsPanelChangeLog): string {
  const usuario = log.usuario_email?.split('@')[0] || log.usuario_id || 'Sistema';
  const pestaña = log.pestaña;
  const timestamp = new Date(log.timestamp);
  const timeStr = timestamp.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const dateStr = timestamp.toLocaleDateString('es-ES', {
    month: 'short',
    day: 'numeric',
  });

  if (log.cambios.length === 0) {
    return `${usuario} visitó ${pestaña} — ${timeStr}, ${dateStr}`;
  }

  if (log.cambios.length === 1) {
    const cambio = log.cambios[0];
    return `${usuario} cambió ${cambio.campo} en ${pestaña} — ${timeStr}, ${dateStr}`;
  }

  return `${usuario} cambió ${log.cambios.length} campos en ${pestaña} — ${timeStr}, ${dateStr}`;
}

/**
 * Group changes by date
 */
export function groupChangesByDate(logs: OsPanelChangeLog[]): Map<string, OsPanelChangeLog[]> {
  const grouped = new Map<string, OsPanelChangeLog[]>();

  logs.forEach((log) => {
    const date = new Date(log.timestamp);
    const key = date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(log);
  });

  return grouped;
}

/**
 * Get icon for tab name
 */
export function getTabIcon(pestaña: string): string {
  const iconMap: Record<string, string> = {
    'Espacio': '🏢',
    'Sala': '🍽️',
    'Cocina': '👨‍🍳',
    'Logística': '📦',
    'Personal': '👥',
  };
  return iconMap[pestaña] || '📝';
}

/**
 * Format field name for display
 */
export function formatFieldName(fieldName: string): string {
  const fieldMap: Record<string, string> = {
    // Sala
    'produccion_sala': 'Producción Sala',
    'revision_pm': 'Revisión PM',
    'metre_responsable': 'Metre Responsable',
    'metres': 'Metres',
    'logistica_evento': 'Logística Evento',
    'camareros_ext': 'Camareros Externos',
    'logisticos_ext': 'Logísticos Externos',
    'pedido_ett': 'Pedido ETT',
    'ped_almacen_bio_bod': 'Almacén Bio-Bod',
    'pedido_walkies': 'Pedido Walkies',
    'pedido_hielo': 'Pedido Hielo',
    'pedido_transporte': 'Pedido Transporte',
    
    // Cocina
    'produccion_cocina_cpr': 'Producción Cocina',
    'jefe_cocina': 'Jefe de Cocina',
    'cocina': 'Personal Cocina',
    'cocineros_ext': 'Cocineros Externos',
    'logisticos_ext_cocina': 'Logísticos Cocina',
    'gastro_actualizada': 'Gastro Actualizada',
    'pedido_gastro': 'Pedido Gastro',
    'pedido_cocina': 'Pedido Cocina',
    'personal_cocina': 'Personal Cocina',
    'servicios_extra': 'Servicios Extra',
    
    // Logística
    'edo_almacen': 'Estado Almacén',
    'mozo': 'Mozo',
    'estado_logistica': 'Estado',
    'carambucos': 'Carambucos',
    'jaulas': 'Jaulas',
    'pallets': 'Pallets',
    'proveedor': 'Proveedores',
    'h_recogida_cocina': 'Hora Recogida Cocina',
    'transporte': 'Transporte',
    'h_recogida_pre_evento': 'Hora Recogida Pre-Evento',
    'h_descarga_evento': 'Hora Descarga Evento',
    'h_recogida_pos_evento': 'Hora Recogida Post-Evento',
    'h_descarga_pos_evento': 'Hora Descarga Post-Evento',
    'alquiler_lanzado': 'Alquiler Lanzado',
  };

  return fieldMap[fieldName] || fieldName;
}

/**
 * Format field value for display (booleans, dates, etc)
 */
export function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? '✓ Sí' : '○ No';
  if (Array.isArray(value)) return value.join(', ') || '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
