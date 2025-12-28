import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';;
import type { PedidoEntrega } from '@/types';



export function useCreatePedidoEntrega() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (pedido: Partial<PedidoEntrega> & { entregaId?: string; tipo?: string; cantidad?: number; observaciones?: string; status?: string }) => {
            const { data, error } = await supabase
                .from('pedidos_entrega')
                .insert({
                    entrega_id: pedido.entregaId,
                    evento_id: pedido.osId,
                    tipo: pedido.tipo,
                    cantidad: pedido.cantidad,
                    observaciones: pedido.observaciones,
                    estado: pedido.status || 'Pendiente',
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pedidos-entrega'] });
        }
    });
}

export function useUpdatePedidoEntrega() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<PedidoEntrega> & { tipo?: string; cantidad?: number; observaciones?: string; status?: string } }) => {
            const { data, error } = await supabase
                .from('pedidos_entrega')
                .update({
                    tipo: updates.tipo,
                    cantidad: updates.cantidad,
                    observaciones: updates.observaciones,
                    estado: updates.status,
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pedidos-entrega'] });
        }
    });
}

export function useDeletePedidoEntrega() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('pedidos_entrega')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pedidos-entrega'] });
        }
    });
}

export function useUpdatePedidoEntregaStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const { data, error } = await supabase
                .from('pedidos_entrega')
                .update({ estado: status })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pedidos-entrega'] });
        }
    });
}

export function useSyncPedidosEntrega() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ osId, hitos }: { osId: string; hitos: any[] }) => {
            const { data, error } = await supabase
                .from('pedidos_entrega')
                .upsert({
                    evento_id: osId,
                    data: { hitos },
                    updated_at: new Date().toISOString()
                }, { onConflict: 'evento_id' })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pedidos-entrega'] });
        }
    });
}

export function useUpdateHitoPickingState() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ osId, hitoId, pickingState }: { osId: string; hitoId: string; pickingState: any }) => {
            const { data: pedido, error: fetchError } = await supabase
                .from('pedidos_entrega')
                .select('*')
                .eq('evento_id', osId)
                .single();

            if (fetchError) throw fetchError;

            const hitos = pedido.data?.hitos || [];
            const updatedHitos = hitos.map((h: any) => {
                if (h.id === hitoId) {
                    return { ...h, pickingState };
                }
                return h;
            });

            const { data, error: updateError } = await supabase
                .from('pedidos_entrega')
                .update({ data: { ...pedido.data, hitos: updatedHitos } })
                .eq('id', pedido.id)
                .select()
                .single();

            if (updateError) throw updateError;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pedidosEntrega'] });
        }
    });
}

export function useUpdatePartnerStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ osId, hitoId, articuloId, status, comentarios }: { osId: string; hitoId: string; articuloId: string; status: string; comentarios?: string }) => {
            const { data: pedido, error: fetchError } = await supabase
                .from('pedidos_entrega')
                .select('*')
                .eq('evento_id', osId)
                .single();

            if (fetchError) throw fetchError;

            const hitos = pedido.data?.hitos || [];
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
                .from('pedidos_entrega')
                .update({ data: { ...pedido.data, hitos: updatedHitos } })
                .eq('id', pedido.id)
                .select()
                .single();

            if (updateError) throw updateError;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pedidosEntrega'] });
        }
    });
}
