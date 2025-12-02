import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';;
import type { DecoracionOrder } from '@/types';



export function useCreateDecoracionOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (order: Partial<DecoracionOrder>) => {
            const { data, error } = await supabase
                .from('pedidos_decoracion')
                .insert({
                    evento_id: order.osId,
                    articulo_id: order.articuloId,
                    cantidad: order.cantidad,
                    precio_unitario: order.precioUnitario,
                    total: order.total,
                    observaciones: order.observaciones,
                    estado: order.status || 'Pendiente',
                    data: {
                        // Store any extra fields
                    }
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['decoracion'] });
        }
    });
}

export function useUpdateDecoracionOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<DecoracionOrder> }) => {
            const { data, error } = await supabase
                .from('pedidos_decoracion')
                .update({
                    articulo_id: updates.articuloId,
                    cantidad: updates.cantidad,
                    precio_unitario: updates.precioUnitario,
                    total: updates.total,
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
            queryClient.invalidateQueries({ queryKey: ['decoracion'] });
        }
    });
}

export function useDeleteDecoracionOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('pedidos_decoracion')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['decoracion'] });
        }
    });
}

export function useUpdateDecoracionStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const { data, error } = await supabase
                .from('pedidos_decoracion')
                .update({ estado: status })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['decoracion'] });
        }
    });
}
