'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { PedidoItem } from '@/types';

interface UpdateSubpedidoCompletePayload {
  pedidoId: string;
  osId: string;
  updates: {
    fechaEntrega?: string;
    horaEntrega?: string; // NEW
    localizacion?: string;
    solicita?: 'Sala' | 'Cocina';
    fechaRecogida?: string; // NEW
    horaRecogida?: string; // NEW
    lugarRecogida?: 'Evento' | 'Instalaciones'; // NEW
    items?: PedidoItem[];
  };
}

/**
 * Hook para actualizar un sub-pedido COMPLETAMENTE en una sola escritura
 * Consolida cambios de contexto (fecha, localización, solicita) + items
 * Invalida queries de pendientes y CTA
 */
export function useUpdateSubpedidoComplete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pedidoId, osId, updates }: UpdateSubpedidoCompletePayload) => {
      // Construir objeto de actualización con TODOS los campos (undefined = no actualizar)
      const updatePayload: Record<string, any> = {};
      
      if (updates.fechaEntrega !== undefined) updatePayload.fecha_entrega = updates.fechaEntrega;
      if (updates.horaEntrega !== undefined) updatePayload.hora_entrega = updates.horaEntrega;
      if (updates.localizacion !== undefined) updatePayload.localizacion = updates.localizacion;
      if (updates.solicita !== undefined) updatePayload.solicita = updates.solicita;
      if (updates.fechaRecogida !== undefined) updatePayload.fecha_recogida = updates.fechaRecogida;
      if (updates.horaRecogida !== undefined) updatePayload.hora_recogida = updates.horaRecogida;
      if (updates.lugarRecogida !== undefined) updatePayload.lugar_recogida = updates.lugarRecogida;
      if (updates.items !== undefined) updatePayload.items = updates.items;
      
      // Actualizar el sub-pedido PENDIENTE con todos los cambios
      const { data, error } = await supabase
        .from('os_pedidos_pendientes')
        .update(updatePayload)
        .eq('id', pedidoId)
        .select();

      if (error) throw new Error(`Update failed: ${error.message}`);
      return pedidoId;
    },
    onSuccess: (_, { osId }) => {
      // Invalidar TODAS las queries relevantes para que se recalcule todo
      queryClient.invalidateQueries({ queryKey: ['pedidos-pendientes', osId] });
      queryClient.invalidateQueries({ queryKey: ['materialOrders', osId] });
      queryClient.invalidateQueries({ queryKey: ['objetivo-gasto', osId] });
      // Esto forzará que se recalcule el "Planificado" en CTA
    },
  });
}
