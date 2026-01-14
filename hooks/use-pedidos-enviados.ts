'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  PedidoEnviado,
  GeneratePDFRequest,
  GeneratePDFResponse,
} from '@/types';

/**
 * Hook para obtener todos los pedidos enviados/consolidados de un OS
 * Estos son los órdenes ya consolidados y listos para PDF
 */
export function usePedidosEnviados(osId?: string) {
  return useQuery({
    queryKey: ['pedidos-enviados', osId],
    queryFn: async () => {
      if (!osId) return [];

      // osId puede ser UUID (desde middleware) o numero_expediente
      // os_pedidos_enviados.os_id almacena numero_expediente (VARCHAR)
      // Por lo tanto, si recibimos UUID, necesitamos convertir a numero_expediente
      
      let searchOsId = osId;
      const isUUID = osId?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      
      if (isUUID) {
        // osId es UUID, necesitamos convertir a numero_expediente
        const { data: evento } = await supabase
          .from('eventos')
          .select('numero_expediente')
          .eq('id', osId)
          .maybeSingle();

        if (evento?.numero_expediente) {
          searchOsId = evento.numero_expediente;  // Use numero_expediente for query
        }
      }

      const { data, error } = await supabase
        .from('os_pedidos_enviados')
        .select('*')
        .eq('os_id', searchOsId)  // Use numero_expediente
        .order('fecha_entrega', { ascending: true })
        .order('localizacion', { ascending: true });

      if (error) throw error;
      return data as PedidoEnviado[];
    },
    enabled: !!osId,
  });
}

/**
 * Hook para generar PDF consolidado de múltiples pedidos pendientes
 * Consolida por (fecha, localización), ignorando solicita
 * Genera un único PDF para enviar al proveedor
 */
export function useGeneratePDFMulti() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: GeneratePDFRequest) => {
      console.log('[useGeneratePDFMulti] Iniciando mutación:', request);
      
      // IMPORTANTE: NO resolver osId aquí. El API lo manejará.
      // El osId puede ser UUID o numero_expediente, el API se encarga de resolverlo
      // Si resolvemos aquí a UUID, la FK constraint fallará
      console.log('[useGeneratePDFMulti] osId recibido:', request.osId);

      // Llamar a API route para consolidar y generar PDF
      console.log('[useGeneratePDFMulti] Llamando a /api/pedidos/generate-pdf');
      
      const response = await fetch('/api/pedidos/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          osId: request.osId,  // ✅ Pasar osId original, el API lo resuelve
          selectedPedidoIds: request.selectedPedidoIds,
          generatedBy: request.generatedBy,
          comentario: request.comentario,  // ✅ Incluir comentario
        }),
      });

      console.log('[useGeneratePDFMulti] Respuesta recibida:', {
        status: response.status,
        ok: response.ok,
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[useGeneratePDFMulti] Error en respuesta:', error);
        throw new Error(error.message || 'Error generando PDF');
      }

      const data = (await response.json()) as GeneratePDFResponse;
      console.log('[useGeneratePDFMulti] ✅ Datos recibidos:', data);
      
      return data;
    },
    onSuccess: (data) => {
      console.log('[useGeneratePDFMulti] onSuccess - Invalidando queries for osId:', data.osId);
      
      // Invalidar TODAS las queries de pedidos para forzar refresh
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === 'pedidos-pendientes' || key === 'pedidos-enviados';
        },
      });
      
      console.log('[useGeneratePDFMulti] ✅ Queries invalidadas');
    },
    onError: (error: any) => {
      console.error('[useGeneratePDFMulti] onError:', error.message);
    },
  });
}

/**
 * Hook para marcar pedidos enviados como confirmados/entregados
 * Seguimiento post-envío
 */
export function useUpdatePedidoEnviadoStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pedidoEnviadoId,
      status,
    }: {
      pedidoEnviadoId: string;
      status: 'Enviado' | 'Confirmado' | 'Entregado' | 'Cancelado';
    }) => {
      const { data, error } = await supabase
        .from('os_pedidos_enviados')
        .update({ estado: status })
        .eq('id', pedidoEnviadoId)
        .select()
        .single();

      if (error) throw error;
      return data as PedidoEnviado;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['pedidos-enviados', data.os_id],
      });
    },
  });
}
