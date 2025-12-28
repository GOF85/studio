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
                    precio_unitario: item.item.price || 0,
                    total: (item.item.price || 0) * item.item.quantity,
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
        mutationFn: async ({ id, updates, orderId }: { id: string; updates: Partial<OrderItem>, orderId?: string }) => {
            // If orderId is provided, we are updating an item inside a material_order (JSONB)
            if (orderId) {
                const { data: order, error: fetchError } = await supabase
                    .from('material_orders')
                    .select('items')
                    .eq('id', orderId)
                    .single();
                
                if (fetchError) throw fetchError;

                const newItems = order.items.map((item: any) => {
                    if (item.itemCode === id) {
                        return { ...item, ...updates };
                    }
                    return item;
                });

                const { data, error } = await supabase
                    .from('material_orders')
                    .update({ 
                        items: newItems,
                        total: newItems.reduce((acc: number, curr: any) => acc + (curr.price * curr.quantity), 0)
                    })
                    .eq('id', orderId)
                    .select()
                    .single();

                if (error) throw error;
                return data;
            }

            // Legacy support for pedidos_material table
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
            queryClient.invalidateQueries({ queryKey: ['materialOrders'] });
            queryClient.invalidateQueries({ queryKey: ['material'] });
        }
    });
}

export function useDeleteMaterialOrderItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, orderId }: { id: string, orderId?: string }) => {
            if (orderId) {
                const { data: order, error: fetchError } = await supabase
                    .from('material_orders')
                    .select('items')
                    .eq('id', orderId)
                    .single();
                
                if (fetchError) throw fetchError;

                const newItems = order.items.filter((item: any) => item.itemCode !== id);

                if (newItems.length === 0) {
                    const { error } = await supabase
                        .from('material_orders')
                        .delete()
                        .eq('id', orderId);
                    if (error) throw error;
                    return;
                }

                const { error } = await supabase
                    .from('material_orders')
                    .update({ 
                        items: newItems,
                        total: newItems.reduce((acc: number, curr: any) => acc + (curr.price * curr.quantity), 0)
                    })
                    .eq('id', orderId);

                if (error) throw error;
                return;
            }

            const { error } = await supabase
                .from('pedidos_material')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['materialOrders'] });
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
