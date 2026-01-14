'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { resolveOsId } from '@/lib/supabase';
import {
  PedidoPendiente,
  CreatePedidoPendienteRequest,
  UpdatePedidoPendienteRequest,
  MoveItemsRequest,
  AddItemsRequest,
  UpdatePedidoContextRequest,
  PedidoItem,
} from '@/types';
import { Proveedor } from '@/types';

/**
 * Hook para obtener todos los pedidos pendientes de un OS
 * Estos son las tarjetas editables que el usuario ve
 */
export function usePedidosPendientes(osId?: string) {
  return useQuery({
    queryKey: ['pedidos-pendientes', osId],
    queryFn: async () => {
      if (!osId) return [];

      const resolvedOsId = await resolveOsId(osId);
      if (!resolvedOsId) throw new Error('OS no encontrado');

      const { data, error } = await supabase
        .from('os_pedidos_pendientes')
        .select('*')
        .eq('os_id', resolvedOsId)
        .order('fecha_entrega', { ascending: true })
        .order('localizacion', { ascending: true })
        .order('solicita', { ascending: true });

      if (error) throw error;
      return data as PedidoPendiente[];
    },
    enabled: !!osId,
  });
}

/**
 * Hook para crear un nuevo pedido pendiente
 * Crea una nueva tarjeta con items iniciales
 */
export function useCreatePedidoPendiente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreatePedidoPendienteRequest) => {
      console.log('[useCreatePedidoPendiente] Starting with request:', request);
      
      const resolvedOsId = await resolveOsId(request.osId);
      console.log('[useCreatePedidoPendiente] Resolved OS ID:', resolvedOsId);
      if (!resolvedOsId) throw new Error('OS no encontrado');

      // Contar cantidad de artículos y unidades
      const cantidadArticulos = request.items.length;
      const cantidadUnidades = request.items.reduce(
        (sum, item) => sum + item.cantidad,
        0
      );

      const insertData = {
        os_id: resolvedOsId,
        fecha_entrega: request.fechaEntrega,
        hora_entrega: request.horaEntrega,
        localizacion: request.localizacion,
        solicita: request.solicita,
        proveedor_id: request.proveedor_id || null,
        proveedor: request.nombreComercialProveedor || null,
        items: request.items,
        cantidad_articulos: cantidadArticulos,
        cantidad_unidades: cantidadUnidades,
        estado: 'Pendiente',
      };
      
      console.log('[useCreatePedidoPendiente] Insert data:', insertData);

      const { data, error } = await supabase
        .from('os_pedidos_pendientes')
        .insert(insertData)
        .select()
        .single();

      console.log('[useCreatePedidoPendiente] Response - error:', error, 'data:', data);
      
      if (error) {
        console.error('[useCreatePedidoPendiente] Supabase error details:', {
          message: error.message,
          code: error.code,
          details: (error as any).details,
        });
        throw error;
      }
      return data as PedidoPendiente;
    },
    onSuccess: async (_, { osId }) => {
      console.log('[useCreatePedidoPendiente] onSuccess - invalidating queries with osId:', osId);
      // Resolve osId to ensure we invalidate the correct query
      const resolvedOsId = await resolveOsId(osId);
      console.log('[useCreatePedidoPendiente] Resolved osId:', resolvedOsId);
      // Invalidate both the specific query and all pedidos-pendientes queries
      queryClient.invalidateQueries({
        queryKey: ['pedidos-pendientes'],
      });
      if (resolvedOsId) {
        queryClient.invalidateQueries({
          queryKey: ['pedidos-pendientes', resolvedOsId],
        });
        queryClient.invalidateQueries({
          queryKey: ['pedidos-pendientes', osId],
        });
      }
      console.log('[useCreatePedidoPendiente] Queries invalidated');
    },
  });
}

/**
 * Hook para actualizar items en un pedido pendiente
 * Permite agregar/quitar/modificar artículos
 */
export function useUpdatePedidoPendiente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: UpdatePedidoPendienteRequest) => {
      // Recalcular métricas
      const cantidadArticulos = request.items.length;
      const cantidadUnidades = request.items.reduce(
        (sum, item) => sum + item.cantidad,
        0
      );

      const { data, error } = await supabase
        .from('os_pedidos_pendientes')
        .update({
          items: request.items,
          cantidad_articulos: cantidadArticulos,
          cantidad_unidades: cantidadUnidades,
        })
        .eq('id', request.pedidoId)
        .select()
        .single();

      if (error) throw error;
      return data as PedidoPendiente;
    },
    onSuccess: () => {
      console.log('[useUpdatePedidoPendiente] onSuccess - invalidating queries');
      // Invalidate ALL pedidos-pendientes queries
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === 'pedidos-pendientes';
        },
      });
    },
  });
}

/**
 * Hook para eliminar un pedido pendiente
 * Borra completamente la tarjeta
 */
export function useDeletePedidoPendiente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pedidoId, osId }: { pedidoId: string; osId: string }) => {
      const resolvedOsId = await resolveOsId(osId);
      if (!resolvedOsId) throw new Error('OS no encontrado');

      const { error } = await supabase
        .from('os_pedidos_pendientes')
        .delete()
        .eq('id', pedidoId)
        .eq('os_id', resolvedOsId);

      if (error) throw error;
      return pedidoId;
    },
    onSuccess: () => {
      // Invalidate all pedidos-pendientes queries
      queryClient.invalidateQueries({
        queryKey: ['pedidos-pendientes'],
      });
    },
  });
}

/**
 * Hook para cambiar el contexto (solicita) de un pedido pendiente
 * Maneja la lógica de cambiar Sala ↔ Cocina
 */
export function useChangePedidoContext() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pedidoId,
      newSolicita,
    }: {
      pedidoId: string;
      newSolicita: 'Sala' | 'Cocina';
    }) => {
      const { data, error } = await supabase
        .from('os_pedidos_pendientes')
        .update({ solicita: newSolicita })
        .eq('id', pedidoId)
        .select()
        .single();

      if (error) throw error;
      return data as PedidoPendiente;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === 'pedidos-pendientes';
        },
      });
    },
  });
}

/**
 * Hook para cambiar el estado de un pedido pendiente
 * Estados: Pendiente → Listo → (se envía)
 */
export function useUpdatePedidoStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pedidoId,
      status,
    }: {
      pedidoId: string;
      status: 'Pendiente' | 'Listo' | 'Cancelado';
    }) => {
      const { data, error } = await supabase
        .from('os_pedidos_pendientes')
        .update({ estado: status })
        .eq('id', pedidoId)
        .select()
        .single();

      if (error) throw error;
      return data as PedidoPendiente;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === 'pedidos-pendientes';
        },
      });
    },
  });
}

/**
 * Hook para mover artículos entre tarjetas pendientes
 * Permite reorganizar items de un card a otro
 */
export function useMoveItemsBetweenCards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: MoveItemsRequest) => {
      // Implementar lógica de mover items entre tarjetas
      // Esto es complejo - requiere:
      // 1. Leer ambos pedidos
      // 2. Quitar items del origen
      // 3. Agregar items al destino
      // 4. Actualizar ambos

      // Para ahora, retornar estructura básica
      // La implementación detallada será en API route
      return { success: true };
    },
    onSuccess: () => {
      // Invalidate all pedidos-pendientes queries
      queryClient.invalidateQueries({
        queryKey: ['pedidos-pendientes'],
      });
    },
  });
}

/**
 * Hook para obtener proveedores de alquiler
 * Filtra solo proveedores con tipo de servicio 'Alquiler'
 */
export function useProveedoresAlquiler() {
  return useQuery({
    queryKey: ['proveedores-alquiler'],
    queryFn: async () => {
      // Primero obtener IDs de proveedores que tengan tipo 'Alquiler'
      const { data: tiposServicio, error: errorTipos } = await supabase
        .from('proveedores_tipos_servicio')
        .select('proveedor_id, tipos')
        .not('tipos', 'is', null);

      if (errorTipos) throw errorTipos;

      // Filtrar solo los que tienen 'Alquiler' en el array tipos
      const proveedorIds = (tiposServicio || [])
        .filter((ts: any) => {
          const tipos = ts.tipos || [];
          return Array.isArray(tipos) && tipos.includes('Alquiler');
        })
        .map((ts: any) => ts.proveedor_id);

      if (proveedorIds.length === 0) {
        return [];
      }

      // Luego obtener los datos completos de esos proveedores
      const { data: proveedores, error: errorProveedores } = await supabase
        .from('proveedores')
        .select('id, nombre_comercial, nombre_fiscal, email_contacto, telefono_contacto')
        .in('id', proveedorIds)
        .order('nombre_comercial', { ascending: true });

      if (errorProveedores) throw errorProveedores;

      return (proveedores as any[]) || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

/**
 * Hook para buscar artículos de un proveedor específico
 * Retorna artículos de alquiler del proveedor desde articulos tabla
 */
export function useBuscarArticulosProveedor(proveedorId?: string) {
  return useQuery({
    queryKey: ['articulos-proveedor', proveedorId],
    queryFn: async () => {
      if (!proveedorId) return [];

      // Obtener artículos del proveedor de la tabla articulos
      const { data: articulos, error } = await supabase
        .from('articulos')
        .select('*')
        .eq('partner_id', proveedorId)
        .eq('categoria', 'Alquiler')
        .order('nombre', { ascending: true });

      if (error) throw error;

      // Mapear a formato PedidoItem
      return (articulos || []).map((art: any) => ({
        itemCode: art.id,
        description: art.nombre || '',
        price: parseFloat(art.precio_alquiler || '0'),
        priceSnapshot: parseFloat(art.precio_alquiler || '0'),
        cantidad: 1,
        subcategoria: art.subcategoria || undefined,
        imageUrl: art.imagenes && Array.isArray(art.imagenes) && art.imagenes.length > 0 ? art.imagenes[0] : undefined,
      }));
    },
    enabled: !!proveedorId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

/**
 * Hook para agregar items a un pedido existente
 * Suma automáticamente items duplicados (mismo itemCode)
 */
export function useAgregarItemsAPedido() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: AddItemsRequest) => {
      // Obtener el pedido actual
      const { data: pedido, error: errorFetch } = await supabase
        .from('os_pedidos_pendientes')
        .select('*')
        .eq('id', request.pedidoId)
        .single();

      if (errorFetch) throw errorFetch;

      const currentItems = (pedido?.items || []) as PedidoItem[];

      // Combinar items nuevos con items existentes
      // Auto-suma items con mismo itemCode
      const combinedItems = [...currentItems];

      for (const newItem of request.newItems) {
        const existingIndex = combinedItems.findIndex(
          (item) => item.itemCode === newItem.itemCode
        );

        if (existingIndex >= 0) {
          // Item ya existe - sumar cantidad
          combinedItems[existingIndex] = {
            ...combinedItems[existingIndex],
            cantidad: combinedItems[existingIndex].cantidad + newItem.cantidad,
          };
        } else {
          // Item nuevo - agregarlo
          combinedItems.push(newItem);
        }
      }

      // Actualizar el pedido
      const cantidadArticulos = combinedItems.length;
      const cantidadUnidades = combinedItems.reduce(
        (sum, item) => sum + item.cantidad,
        0
      );

      const { data: updated, error: errorUpdate } = await supabase
        .from('os_pedidos_pendientes')
        .update({
          items: combinedItems,
          cantidad_articulos: cantidadArticulos,
          cantidad_unidades: cantidadUnidades,
        })
        .eq('id', request.pedidoId)
        .select()
        .single();

      if (errorUpdate) throw errorUpdate;
      return updated as PedidoPendiente;
    },
    onSuccess: (data) => {
      console.log('[useAgregarItemsAPedido] onSuccess - updated pedido:', data.id);
      console.log('[useAgregarItemsAPedido] New items count:', data.items?.length || 0);
      
      // STRATEGY 1: Update cache directly with new data
      queryClient.setQueryData(
        ['pedidos-pendientes', data.os_id],
        (old: PedidoPendiente[] | undefined) => {
          if (!old) return [data];
          // Replace the updated pedido in the array
          return old.map(p => p.id === data.id ? data : p);
        }
      );
      
      // STRATEGY 2: Invalidate to trigger background refetch
      console.log('[useAgregarItemsAPedido] Invalidating queries for refetch...');
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === 'pedidos-pendientes';
        },
      });
      
      console.log('[useAgregarItemsAPedido] Cache updated and queries invalidated');
    },
  });
}

/**
 * Hook para actualizar contexto de un pedido (fecha, localización, solicita)
 */
export function useUpdatePedidoContexto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: UpdatePedidoContextRequest) => {
      const updates: any = {};
      if (request.fechaEntrega) updates.fecha_entrega = request.fechaEntrega;
      if (request.localizacion) updates.localizacion = request.localizacion;
      if (request.solicita) updates.solicita = request.solicita;

      const { data, error } = await supabase
        .from('os_pedidos_pendientes')
        .update(updates)
        .eq('id', request.pedidoId)
        .select()
        .single();

      if (error) throw error;
      return data as PedidoPendiente;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === 'pedidos-pendientes';
        },
      });
    },
  });
}

