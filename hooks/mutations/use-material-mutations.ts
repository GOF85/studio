import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';;
import type { OrderItem } from '@/types';



/**
 * Upsert a material order (creates new or merges with existing pending order)
 */
export function useUpsertMaterialOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: {
            osId: string;
            type?: string;
            items: any[];
            days?: number;
            deliveryDate?: string;
            deliverySpace?: string;
            deliveryLocation?: string;
            solicita?: string;
        }) => {
            const response = await fetch('/api/material-orders/upsert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to upsert order');
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['materialOrders'] });
        },
    });
}

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
        mutationFn: async ({ id, updates, orderId }: { id: string; updates: Partial<OrderItem>, orderId: string }) => {
            console.log('\n🟢 [MUTATION] Iniciando update:');
            console.log(`   itemCode: ${id}`);
            console.log(`   orderId: ${orderId}`);
            
            // Extract field and value from updates (expects single key-value pair)
            const entries = Object.entries(updates);
            if (entries.length !== 1) {
                throw new Error('Updates must contain exactly one field');
            }
            
            const [field, value] = entries[0];
            console.log(`   field: ${field} → ${value}`);

            // Use API route to handle the update
            console.log(`📤 Enviando POST a /api/material-orders/update-item`);
            const response = await fetch('/api/material-orders/update-item', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId,
                    itemCode: id,
                    field,
                    value
                })
            });

            console.log(`📥 Response status: ${response.status}`);
            const result = await response.json();

            if (!response.ok) {
                console.error(`❌ API Error (${response.status}):`, result);
                throw new Error(result.error || 'Failed to update item');
            }

            console.log(`✅ Update exitoso`);
            return result.data;
        },
        onSuccess: () => {
            console.log(`🔄 Invalidando queries...`);
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
                    .from('os_material_orders')
                    .select('items')
                    .eq('id', orderId)
                    .single();
                
                if (fetchError) throw fetchError;

                const newItems = order.items.filter((item: any) => item.itemCode !== id);

                if (newItems.length === 0) {
                    const { error } = await supabase
                        .from('os_material_orders')
                        .delete()
                        .eq('id', orderId);
                    if (error) throw error;
                    return;
                }

                const { error } = await supabase
                    .from('os_material_orders')
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
