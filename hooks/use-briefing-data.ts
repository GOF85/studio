import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, resolveOsId, buildFieldOr, buildOsOr } from '@/lib/supabase';
import type { ComercialBriefing, ComercialAjuste, GastronomyOrder, GastronomyOrderItem } from '@/types';

export interface GastronomyStaffOrder {
    id?: string;
    osId: string;
    fecha: string;
    items: GastronomyOrderItem[];
    total: number;
}

// Hook para manejar Briefings Comerciales
export const useComercialBriefing = (osId?: string) => {
    return useQuery({
        queryKey: ['comercialBriefing', osId],
        queryFn: async () => {
            if (!osId) return { osId: '', items: [] };
            
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(osId);
            const targetId = await resolveOsId(osId);
            const orExpr = buildOsOr(osId, targetId);
            let result;
            if (isUuid) {
                result = await supabase.from('comercial_briefings').select('*').eq('os_id', osId).single();
            } else if (targetId && targetId !== osId) {
                // Some tables store the OS under `numero_expediente` instead of `os_id`.
                // If we resolved a UUID (targetId) different from the original osId (string),
                // include `numero_expediente` in the OR expression so we match both cases.
                const extendedOr = orExpr ? `${orExpr},numero_expediente.eq.${osId}` : `numero_expediente.eq.${osId}`;
                result = await supabase.from('comercial_briefings').select('*').or(extendedOr).single();
            } else {
                result = await supabase.from('comercial_briefings').select('*').eq('numero_expediente', osId).single();
            }
            const { data, error } = result;

            // debug logs removed for production

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
            
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(osId);
            const targetId = await resolveOsId(osId);
            const orExpr = buildOsOr(osId, targetId);
            const result = isUuid
                ? await supabase.from('comercial_ajustes').select('*').eq('os_id', osId)
                : (targetId && targetId !== osId
                    ? await (async () => {
                        const extendedOr = orExpr ? `${orExpr},numero_expediente.eq.${osId}` : `numero_expediente.eq.${osId}`;
                        return await supabase.from('comercial_ajustes').select('*').or(extendedOr);
                      })()
                    : await supabase.from('comercial_ajustes').select('*').eq('numero_expediente', osId));
            const { data, error } = result;

            // debug logs removed for production

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
            
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(osId);
            const targetId = await resolveOsId(osId);
            const orExpr = buildOsOr(osId, targetId);
            const result = isUuid
                ? await supabase.from('gastronomia_orders').select('*').eq('os_id', osId).order('updated_at', { ascending: false })
                : (targetId && targetId !== osId
                    ? await supabase.from('gastronomia_orders').select('*').or(orExpr).order('updated_at', { ascending: false })
                    : await supabase.from('gastronomia_orders').select('*').eq('os_id', osId).order('updated_at', { ascending: false }));
            const { data, error } = result;

            if (error) throw error;
            return (data || []).map(o => ({
                id: o.briefing_item_id,
                osId: o.os_id,
                status: o.status,
                items: o.items || [],
                total: o.total,
                asistentesAlergenos: o.asistentes_alergenos || 0,
                itemsAlergenos: o.items_alergenos || [],
                totalAlergenos: o.total_alergenos || 0,
                comentariosAlergenos: o.comentarios_alergenos || '',
            })) as GastronomyOrder[];
        },
        enabled: !!osId
    });
};

export const useGastronomyOrder = (osId: string, briefingItemId: string) => {
    return useQuery({
        queryKey: ['gastronomyOrder', osId, briefingItemId],
        queryFn: async () => {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(osId);
            const targetId = await resolveOsId(osId);
            const orExpr = buildOsOr(osId, targetId);
            let result;
            if (isUuid) {
                result = await supabase.from('gastronomia_orders').select('*').eq('os_id', osId).eq('briefing_item_id', briefingItemId).order('updated_at', { ascending: false }).limit(1).maybeSingle();
            } else if (targetId && targetId !== osId) {
                // Use buildFieldOr to check both original ID and resolved UUID
                const fieldOr = buildFieldOr('os_id', osId, targetId);
                result = await supabase.from('gastronomia_orders').select('*').or(fieldOr).eq('briefing_item_id', briefingItemId).order('updated_at', { ascending: false }).limit(1).maybeSingle();
            } else {
                result = await supabase.from('gastronomia_orders').select('*').eq('os_id', osId).eq('briefing_item_id', briefingItemId).order('updated_at', { ascending: false }).limit(1).maybeSingle();
            }
            const { data, error } = result;

            if (error && error.code !== 'PGRST116') throw error;
            return data ? {
                id: data.briefing_item_id,
                osId: data.os_id,
                status: data.status,
                items: data.items || [],
                total: data.total,
                asistentesAlergenos: data.asistentes_alergenos || 0,
                itemsAlergenos: data.items_alergenos || [],
                totalAlergenos: data.total_alergenos || 0,
                comentariosAlergenos: data.comentarios_alergenos || '',
            } as GastronomyOrder : { id: briefingItemId, osId: targetId, status: 'Pendiente', items: [], total: 0, asistentesAlergenos: 0, itemsAlergenos: [], totalAlergenos: 0, comentariosAlergenos: '' };
        },
        enabled: !!osId && !!briefingItemId
    });
};

export const useUpdateGastronomyOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (order: GastronomyOrder) => {
            const targetId = await resolveOsId(order.osId);
            const payload = {
                briefing_item_id: order.id,
                os_id: targetId,
                status: order.status,
                items: order.items,
                total: order.total,
                asistentes_alergenos: order.asistentesAlergenos || 0,
                items_alergenos: order.itemsAlergenos || [],
                total_alergenos: order.totalAlergenos || 0,
                comentarios_alergenos: order.comentariosAlergenos || '',
            };
            
            const { data, error } = await supabase
                .from('gastronomia_orders')
                .upsert(payload, { onConflict: 'os_id,briefing_item_id' })
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
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(osId);
            const targetId = await resolveOsId(osId);
            const orExpr = buildOsOr(osId, targetId);
            const result = isUuid
                ? await supabase.from('gastronomia_orders').delete().eq('os_id', osId).eq('briefing_item_id', briefingItemId)
                : (targetId && targetId !== osId
                    ? await supabase.from('gastronomia_orders').delete().or(orExpr).eq('briefing_item_id', briefingItemId)
                    : await supabase.from('gastronomia_orders').delete().eq('numero_expediente', osId).eq('briefing_item_id', briefingItemId));
            const { error } = result;

            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['gastronomyOrders', variables.osId] });
            queryClient.invalidateQueries({ queryKey: ['gastronomyOrder', variables.osId, variables.briefingItemId] });
        }
    });
};

export const useStaffOrders = (osId: string) => {
    return useQuery({
        queryKey: ['staffOrders', osId],
        queryFn: async () => {
            const targetId = await resolveOsId(osId);
            const { data, error } = await supabase
                .from('gastronomia_staff_orders')
                .select('*')
                .eq('os_id', targetId);

            if (error) throw error;
            return (data || []).map(o => ({
                id: o.id,
                osId: o.os_id,
                fecha: o.fecha,
                items: o.items || [],
                total: o.total,
            })) as GastronomyStaffOrder[];
        },
        enabled: !!osId
    });
};

export const useUpdateStaffOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (order: GastronomyStaffOrder) => {
            const targetId = await resolveOsId(order.osId);
            const payload = {
                os_id: targetId,
                fecha: order.fecha,
                items: order.items,
                total: order.total,
            };
            
            const { data, error } = await supabase
                .from('gastronomia_staff_orders')
                .upsert(payload, { onConflict: 'os_id,fecha' })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['staffOrders', variables.osId] });
        }
    });
};
