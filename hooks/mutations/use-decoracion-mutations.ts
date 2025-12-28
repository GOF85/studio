import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { DecoracionOrder } from '@/types';



export function useCreateDecoracionOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (order: Partial<DecoracionOrder>) => {
            const { data, error } = await supabase
                .from('pedidos_decoracion')
                .insert({
                    evento_id: order.osId,
                    concepto: order.concepto,
                    precio: order.precio,
                    fecha: order.fecha,
                    observaciones: order.observaciones,
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
            queryClient.invalidateQueries({ queryKey: ['decoracionOrders'] });
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
                    concepto: updates.concepto,
                    precio: updates.precio,
                    fecha: updates.fecha,
                    observaciones: updates.observaciones,
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['decoracionOrders'] });
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
            queryClient.invalidateQueries({ queryKey: ['decoracionOrders'] });
        }
    });
}

export function useUpdateDecoracionStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            // If the table doesn't have an 'estado' column, we might want to store it in 'data' jsonb
            const { data, error } = await supabase
                .from('pedidos_decoracion')
                .update({ 
                    data: { status } // Assuming there is a 'data' jsonb column as seen in useCreateDecoracionOrder
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['decoracionOrders'] });
        }
    });
}
