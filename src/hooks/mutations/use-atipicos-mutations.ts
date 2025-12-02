import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';;
import type { AtipicoOrder } from '@/types';



export function useCreateAtipicoOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (order: Partial<AtipicoOrder>) => {
            const { data, error } = await supabase
                .from('pedidos_atipicos')
                .insert({
                    evento_id: order.osId,
                    concepto: order.concepto,
                    precio: order.precio,
                    observaciones: order.observaciones,
                    fecha: order.fecha,
                    estado: order.status || 'Pendiente',
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['atipicos'] });
        }
    });
}

export function useUpdateAtipicoOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<AtipicoOrder> }) => {
            const { data, error } = await supabase
                .from('pedidos_atipicos')
                .update({
                    concepto: updates.concepto,
                    precio: updates.precio,
                    observaciones: updates.observaciones,
                    fecha: updates.fecha,
                    estado: updates.status,
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['atipicos'] });
        }
    });
}

export function useDeleteAtipicoOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('pedidos_atipicos')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['atipicos'] });
        }
    });
}

export function useUpdateAtipicoStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const { data, error } = await supabase
                .from('pedidos_atipicos')
                .update({ estado: status })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['atipicos'] });
        }
    });
}
