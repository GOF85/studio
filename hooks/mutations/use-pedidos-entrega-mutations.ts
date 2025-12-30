import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, resolveOsId } from '@/lib/supabase';
import type { PedidoEntrega } from '@/types';

export function useSyncPedidosEntrega() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ osId, hitos }: { osId: string; hitos: any[] }) => {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(osId);
            
            let query = supabase.from('entregas').select('*');
            if (isUuid) {
                query = query.eq('id', osId);
            } else {
                query = query.eq('numero_expediente', osId);
            }

            const { data: entrega, error: fetchError } = await query.maybeSingle();

            if (fetchError) throw fetchError;
            if (!entrega) throw new Error('No se encontró la entrega');

            const { data, error } = await supabase
                .from('entregas')
                .update({
                    data: {
                        ...(typeof entrega.data === 'string' ? JSON.parse(entrega.data) : (entrega.data || {})),
                        hitos
                    }
                })
                .eq('id', entrega.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['entregas'] });
            queryClient.invalidateQueries({ queryKey: ['pedidosEntrega'] });
        }
    });
}

export function useUpdateHitoPickingState() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ osId, hitoId, pickingState }: { osId: string; hitoId: string; pickingState: any }) => {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(osId);
            
            let query = supabase.from('entregas').select('*');
            if (isUuid) {
                query = query.eq('id', osId);
            } else {
                query = query.eq('numero_expediente', osId);
            }

            const { data: entrega, error: fetchError } = await query.maybeSingle();

            if (fetchError) throw fetchError;
            if (!entrega) throw new Error('No se encontró la entrega');

            const extraData = typeof entrega.data === 'string' ? JSON.parse(entrega.data) : (entrega.data || {});
            const hitos = extraData.hitos || [];
            const updatedHitos = hitos.map((h: any) => {
                if (h.id === hitoId) {
                    return { ...h, pickingState };
                }
                return h;
            });

            const { data, error: updateError } = await supabase
                .from('entregas')
                .update({ 
                    data: { 
                        ...extraData, 
                        hitos: updatedHitos 
                    } 
                })
                .eq('id', entrega.id)
                .select()
                .single();

            if (updateError) throw updateError;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['entregas'] });
            queryClient.invalidateQueries({ queryKey: ['pedidosEntrega'] });
        }
    });
}

export function useUpdatePartnerStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ osId, hitoId, articuloId, status, comentarios }: { osId: string; hitoId: string; articuloId: string; status: string; comentarios?: string }) => {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(osId);
            
            let query = supabase.from('entregas').select('*');
            if (isUuid) {
                query = query.eq('id', osId);
            } else {
                query = query.eq('numero_expediente', osId);
            }

            const { data: entrega, error: fetchError } = await query.maybeSingle();

            if (fetchError) throw fetchError;
            if (!entrega) throw new Error('No se encontró la entrega');

            const extraData = typeof entrega.data === 'string' ? JSON.parse(entrega.data) : (entrega.data || {});
            const hitos = extraData.hitos || [];
            const updatedHitos = hitos.map((h: any) => {
                if (h.id === hitoId) {
                    const updatedArticulos = (h.articulos || []).map((a: any) => {
                        if (a.id === articuloId) {
                            return { ...a, statusPartner: status, comentariosPartner: comentarios };
                        }
                        return a;
                    });
                    return { ...h, articulos: updatedArticulos };
                }
                return h;
            });

            const { data, error: updateError } = await supabase
                .from('entregas')
                .update({ 
                    data: { 
                        ...extraData, 
                        hitos: updatedHitos 
                    } 
                })
                .eq('id', entrega.id)
                .select()
                .single();

            if (updateError) throw updateError;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['entregas'] });
            queryClient.invalidateQueries({ queryKey: ['pedidosEntrega'] });
        }
    });
}
