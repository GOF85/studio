import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';;
import type { AtipicoOrder } from '@/types';



export function useCreateAtipicoOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (order: Partial<AtipicoOrder>) => {
            const { data, error } = await supabase
                .from('atipico_orders')
                .insert({
                    os_id: order.osId,
                    concepto: order.concepto,
                    precio: order.precio,
                    observaciones: order.observaciones,
                    fecha: order.fecha,
                    status: order.status || 'Pendiente',
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['atipicoOrders'] });
        }
    });
}

export function useUpdateAtipicoOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<AtipicoOrder> }) => {
            const { data, error } = await supabase
                .from('atipico_orders')
                .update({
                    concepto: updates.concepto,
                    precio: updates.precio,
                    observaciones: updates.observaciones,
                    fecha: updates.fecha,
                    status: updates.status,
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['atipicoOrders'] });
        }
    });
}

export function useDeleteAtipicoOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('atipico_orders')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['atipicoOrders'] });
        }
    });
}

export function useUpdateAtipicoStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const { data, error } = await supabase
                .from('atipico_orders')
                .update({ status: status })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['atipicoOrders'] });
        }
    });
}
