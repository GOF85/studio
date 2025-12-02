import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';;
import type { PedidoEntrega } from '@/types';



export function useCreatePedidoEntrega() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (pedido: Partial<PedidoEntrega>) => {
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
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<PedidoEntrega> }) => {
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
