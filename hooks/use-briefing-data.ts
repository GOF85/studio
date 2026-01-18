import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, resolveOsId, buildFieldOr, buildOsOr } from '@/lib/supabase';
import type { ComercialBriefing, ComercialAjuste, GastronomyOrder, GastronomyOrderItem } from '@/types';

export interface GastronomyStaffOrder {
    id?: string;
    osId: string;
    fecha: string;
    items: GastronomyOrderItem[];
    total: number;
    sinComida?: boolean;
}

// Hook para manejar Briefings Comerciales
export const useComercialBriefing = (osId?: string) => {
    return useQuery({
        queryKey: ['comercialBriefing', osId],
        queryFn: async () => {
            if (!osId) return { osId: '', items: [] };
            
            const targetId = await resolveOsId(osId);
            const orExpr = buildOsOr(osId, targetId);
            
            const { data, error } = await supabase
                .from('comercial_briefings')
                .select('*')
                .or(orExpr)
                .maybeSingle();

            if (error) throw error;
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
            const orExpr = buildOsOr(osId, targetId);
            
            const { data, error } = await supabase
                .from('comercial_ajustes')
                .select('*')
                .or(orExpr);

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

// Hook para artículos esenciales
export const useGastroEsenciales = () => {
    return useQuery({
        queryKey: ['gastroEsenciales'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('gastro_esenciales')
                .select(`
                    *,
                    receta:recetas(*)
                `)
                .order('orden', { ascending: true });

            if (error) {
                if (error.code === '42P01') return []; // Table not created yet
                throw error;
            }
            return data;
        }
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
            const orExpr = buildOsOr(osId, targetId);
            
            let query = supabase.from('gastronomia_orders').select('*');
            
            if (orExpr.includes(',')) {
                query = query.or(orExpr);
            } else {
                query = query.eq('os_id', targetId || osId);
            }
            
            const { data, error } = await query.order('updated_at', { ascending: false });

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
                itemsEsenciales: o.items_esenciales || [],
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
            const orExpr = buildOsOr(osId, targetId);
            
            let query = supabase.from('gastronomia_orders').select('*').eq('briefing_item_id', briefingItemId);
            
            if (orExpr.includes(',')) {
                query = query.or(orExpr);
            } else {
                query = query.eq('os_id', targetId || osId);
            }
            
            const { data, error } = await query.order('updated_at', { ascending: false }).limit(1).maybeSingle();

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
                itemsEsenciales: data.items_esenciales || [],
            } as GastronomyOrder : { id: briefingItemId, osId: targetId, status: 'Pendiente', items: [], total: 0, asistentesAlergenos: 0, itemsAlergenos: [], totalAlergenos: 0, comentariosAlergenos: '', itemsEsenciales: [] };
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
                items_esenciales: order.itemsEsenciales || [],
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
            const targetId = await resolveOsId(osId);
            const orExpr = buildOsOr(osId, targetId);
            
            let query = supabase.from('gastronomia_orders').delete().eq('briefing_item_id', briefingItemId);
            
            if (orExpr.includes(',')) {
                query = query.or(orExpr);
            } else {
                query = query.eq('os_id', targetId || osId);
            }
            
            const { error } = await query;
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
            return (data || []).map(o => {
                const items = o.items || [];
                const sinComida = items.some((i: any) => i.id === 'SIN_COMIDA_SYSTEM');
                return {
                    id: o.id,
                    osId: o.os_id,
                    fecha: o.fecha,
                    items: items.filter((i: any) => i.id !== 'SIN_COMIDA_SYSTEM'),
                    total: o.total,
                    sinComida,
                };
            }) as GastronomyStaffOrder[];
        },
        enabled: !!osId
    });
};

export const useUpdateStaffOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (order: GastronomyStaffOrder) => {
            const targetId = await resolveOsId(order.osId);
            
            // Si está marcado como sin comida, añadir ítem especial para persistencia en JSONB
            const items = order.sinComida 
                ? [...order.items.filter((i: any) => i.id !== 'SIN_COMIDA_SYSTEM'), { id: 'SIN_COMIDA_SYSTEM', type: 'system', nombre: 'Sin comida personal', quantity: 1 }] 
                : order.items.filter((i: any) => i.id !== 'SIN_COMIDA_SYSTEM');

            const payload = {
                os_id: targetId,
                fecha: order.fecha,
                items,
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
