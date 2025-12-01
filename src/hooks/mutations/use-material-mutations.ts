import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';;
import type { OrderItem } from '@/types';



/**
 * Create a material order item
 * Note: Material orders are stored as individual items in the database
 */
export function useCreateMaterialOrderItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (item: { osId: string; categoria: string; item: OrderItem }) => {
            const { data, error } = await supabase
                .from('pedidos_material')
                .insert({
                    evento_id: item.osId,
                    categoria: item.categoria,
                    articulo_id: item.item.itemCode,
                    nombre_articulo: item.item.description,
                    cantidad: item.item.quantity,
                    precio_unitario: item.item.price,
                    total: item.item.price * item.item.quantity,
                    estado: 'Asignado',
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['material'] });
        }
    });
}

export function useUpdateMaterialOrderItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<OrderItem> }) => {
            const { data, error } = await supabase
                .from('pedidos_material')
                .update({
                    cantidad: updates.quantity,
                    precio_unitario: updates.price,
                    total: updates.price && updates.quantity ? updates.price * updates.quantity : undefined,
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['material'] });
        }
    });
}

export function useDeleteMaterialOrderItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('pedidos_material')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['material'] });
        }
    });
}

export function useUpdateMaterialOrderStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ osId, categoria, status }: { osId: string; categoria: string; status: string }) => {
            const { data, error } = await supabase
                .from('pedidos_material')
                .update({ estado: status })
                .eq('evento_id', osId)
                .eq('categoria', categoria)
                .select();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['material'] });
        }
    });
}
