import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { HistoricoPreciosERP } from '@/types';

/**
 * Hook to fetch price history for a specific ERP article
 */
export function usePrecioHistory(articuloErpId?: string) {
    return useQuery({
        queryKey: ['precioHistory', articuloErpId],
        queryFn: async () => {
            if (!articuloErpId) return [];

            const { data, error } = await supabase
                .from('historico_precios_erp')
                .select('*')
                .eq('articulo_erp_id', articuloErpId)
                .order('fecha', { ascending: false });

            if (error) throw error;

            return (data || []).map(h => ({
                id: h.id,
                articuloErpId: h.articulo_erp_id,
                fecha: h.fecha,
                precioCalculado: h.precio_calculado,
                proveedorId: h.proveedor_id,
            })) as HistoricoPreciosERP[];
        },
        enabled: !!articuloErpId,
    });
}

/**
 * Hook to insert a new price history entry
 */
export function useInsertPrecioHistory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (entry: Omit<HistoricoPreciosERP, 'id'>) => {
            const { data, error } = await supabase
                .from('historico_precios_erp')
                .insert({
                    articulo_erp_id: entry.articuloErpId,
                    fecha: entry.fecha,
                    precio_calculado: entry.precioCalculado,
                    proveedor_id: entry.proveedorId,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            // Invalidate queries to refetch fresh data
            queryClient.invalidateQueries({ queryKey: ['precioHistory', variables.articuloErpId] });
            queryClient.invalidateQueries({ queryKey: ['priceAlerts'] });
        },
    });
}

/**
 * Hook to delete a price history entry
 */
export function useDeletePrecioHistory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('historico_precios_erp')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            // Invalidate all price history queries since we don't know the article ID easily here
            // or we could pass it in variables if we wanted to be more specific
            queryClient.invalidateQueries({ queryKey: ['precioHistory'] });
            queryClient.invalidateQueries({ queryKey: ['allPrecioHistory'] });
        },
    });
}

/**
 * Hook to fetch all price history (with limit)
 */
export function useAllPrecioHistory(limit: number | null = 1000) {
    return useQuery({
        queryKey: ['allPrecioHistory', limit],
        queryFn: async () => {
            let query = supabase
                .from('historico_precios_erp')
                .select('*')
                .order('fecha', { ascending: false });

            if (limit) {
                query = query.limit(limit);
            }

            const { data, error } = await query;

            if (error) throw error;

            return (data || []).map(h => ({
                id: h.id,
                articuloErpId: h.articulo_erp_id,
                fecha: h.fecha,
                precioCalculado: h.precio_calculado,
                proveedorId: h.proveedor_id,
            })) as HistoricoPreciosERP[];
        },
    });
}

/**
 * Hook to get historical price for a specific article on a specific date
 */
export function useHistoricalPrice(articuloErpId: string, targetDate: Date) {
    return useQuery({
        queryKey: ['historicalPrice', articuloErpId, targetDate.toISOString()],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('historico_precios_erp')
                .select('*')
                .eq('articulo_erp_id', articuloErpId)
                .lte('fecha', targetDate.toISOString())
                .order('fecha', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

            return data ? {
                id: data.id,
                articuloErpId: data.articulo_erp_id,
                fecha: data.fecha,
                precioCalculado: data.precio_calculado,
                proveedorId: data.proveedor_id,
            } as HistoricoPreciosERP : null;
        },
        enabled: !!articuloErpId && !!targetDate,
    });
}
