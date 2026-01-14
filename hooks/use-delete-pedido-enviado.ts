'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, resolveOsId } from '@/lib/supabase';

/**
 * Hook para borrar pedidos enviados/consolidados
 * Importante: osId puede ser UUID o numero_expediente
 */
export function useDeletePedidoEnviado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pedidoId, osId }: { pedidoId: string; osId: string }) => {
      const resolvedOsId = await resolveOsId(osId);
      
      if (!resolvedOsId) throw new Error('OS no encontrado');

      // Obtener numero_expediente para usar en filtro
      const { data: evento } = await supabase
        .from('eventos')
        .select('numero_expediente')
        .eq('id', resolvedOsId)
        .maybeSingle();

      const searchOsId = evento?.numero_expediente || osId;

      const { error } = await supabase
        .from('os_pedidos_enviados')
        .delete()
        .eq('id', pedidoId)
        .eq('os_id', searchOsId);

      if (error) {
        console.error('[useDeletePedidoEnviado] Error:', error);
        throw error;
      }
      
      return { pedidoId, osId };
    },
    onSuccess: (result) => {
      // Invalidar la query de pedidos enviados
      queryClient.invalidateQueries({
        queryKey: ['pedidos-enviados'],
      });
      queryClient.invalidateQueries({
        queryKey: ['pedidos-enviados', result.osId],
      });
      
      // IMPORTANTE: Invalidar materialOrders para que se recalcule "Planificado" en CTA
      queryClient.invalidateQueries({
        queryKey: ['materialOrders'],
      });
      queryClient.invalidateQueries({
        queryKey: ['materialOrders', result.osId],
      });
    },
  });
}
