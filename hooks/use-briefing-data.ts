import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, resolveOsId } from '@/lib/supabase';
import type { ComercialBriefing, ComercialAjuste, GastronomyOrder } from '@/types';

// Hook para manejar Briefings Comerciales
export const useComercialBriefing = (osId?: string) => {
    return useQuery({
        queryKey: ['comercialBriefing', osId],
        queryFn: async () => {
            if (!osId) return { osId: '', items: [] };
            
            const targetId = await resolveOsId(osId);
            
            const { data, error } = await supabase
                .from('comercial_briefings')
                .select('*')
                .or(`os_id.eq.${targetId},os_id.eq.${osId}`)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data ? {
                osId: data.os_id,
                items: data.items || []
            } as ComercialBriefing : { osId: targetId, items: [] };
        },
        enabled: !!osId
    });
};

export const useUpdateComercialBriefing = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (briefing: ComercialBriefing) => {
            const targetId = await resolveOsId(briefing.osId);
            const { data, error } = await supabase
                .from('comercial_briefings')
                .upsert({
                    os_id: targetId,
                    items: briefing.items
                }, { onConflict: 'os_id' })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['comercialBriefing', variables.osId] });
        }
    });
};

// Hook para manejar Ajustes Comerciales
export const useComercialAjustes = (osId?: string) => {
    return useQuery({
        queryKey: ['comercialAjustes', osId],
        queryFn: async () => {
            if (!osId) return [];
            
            const targetId = await resolveOsId(osId);
            
            const { data, error } = await supabase
                .from('comercial_ajustes')
                .select('*')
                .or(`os_id.eq.${targetId},os_id.eq.${osId}`);

            if (error) throw error;
            return (data || []).map(a => ({
                id: a.id,
                concepto: a.concepto,
                importe: a.importe
            })) as ComercialAjuste[];
        },
        enabled: !!osId
    });
};

export const useAddComercialAjuste = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ osId, concepto, importe }: { osId: string, concepto: string, importe: number }) => {
            const targetId = await resolveOsId(osId);
            const { data, error } = await supabase
                .from('comercial_ajustes')
                .insert({
                    os_id: targetId,
                    concepto,
                    importe
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['comercialAjustes', variables.osId] });
        }
    });
};

export const useDeleteComercialAjuste = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, osId }: { id: string, osId: string }) => {
            const { error } = await supabase
                .from('comercial_ajustes')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['comercialAjustes', variables.osId] });
        }

    });
};


// Hook para manejar Pedidos de Gastronomía
export const useGastronomyOrders = (osId?: string) => {
    return useQuery({
        queryKey: ['gastronomyOrders', osId],
        queryFn: async () => {
            if (!osId) return [];
            
            const targetId = await resolveOsId(osId);
            
            const { data, error } = await supabase
                .from('gastronomia_orders')
                .select('*')
                .or(`os_id.eq.${targetId},os_id.eq.${osId}`);

            if (error) throw error;
            return (data || []).map(o => ({
                id: o.briefing_item_id,
                osId: o.os_id,
                status: o.status,
                items: o.items || [],
                total: o.total
            })) as GastronomyOrder[];
        },
        enabled: !!osId
    });
};

export const useGastronomyOrder = (osId: string, briefingItemId: string) => {
    return useQuery({
        queryKey: ['gastronomyOrder', osId, briefingItemId],
        queryFn: async () => {
            const targetId = await resolveOsId(osId);
            const { data, error } = await supabase
                .from('gastronomia_orders')
                .select('*')
                .or(`os_id.eq.${targetId},os_id.eq.${osId}`)
                .eq('briefing_item_id', briefingItemId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data ? {
                id: data.briefing_item_id,
                osId: data.os_id,
                status: data.status,
                items: data.items || [],
                total: data.total
            } as GastronomyOrder : { id: briefingItemId, osId: targetId, status: 'Pendiente', items: [], total: 0 };
        },
        enabled: !!osId && !!briefingItemId
    });
};

export const useUpdateGastronomyOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (order: GastronomyOrder) => {
            const targetId = await resolveOsId(order.osId);
            const { data, error } = await supabase
                .from('gastronomia_orders')
                .upsert({
                    briefing_item_id: order.id,
                    os_id: targetId,
                    status: order.status,
                    items: order.items,
                    total: order.total
                }, { onConflict: 'os_id,briefing_item_id' })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['gastronomyOrders', variables.osId] });
            queryClient.invalidateQueries({ queryKey: ['gastronomyOrder', variables.osId, variables.id] });
        }
    });
};

export const useDeleteGastronomyOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ osId, briefingItemId }: { osId: string, briefingItemId: string }) => {
            const targetId = await resolveOsId(osId);
            const { error } = await supabase
                .from('gastronomia_orders')
                .delete()
                .or(`os_id.eq.${targetId},os_id.eq.${osId}`)
                .eq('briefing_item_id', briefingItemId);

            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['gastronomyOrders', variables.osId] });
            queryClient.invalidateQueries({ queryKey: ['gastronomyOrder', variables.osId, variables.briefingItemId] });
        }
    });
};
