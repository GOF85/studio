import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, resolveOsId } from '@/lib/supabase';;

/**
 * Create a hielo (ice) order item
 * Note: Ice orders are stored as individual items in the database
 */
export function useCreateHieloOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (order: { 
            osId: string; 
            proveedorId: string; 
            items: { producto: string; cantidad: number; precio: number }[];
            deliveryTime?: string;
        }) => {
            const targetId = await resolveOsId(order.osId);
            
            const insertData = order.items.map(item => ({
                evento_id: targetId,
                tipo_hielo: order.deliveryTime ? `[${order.deliveryTime}] ${item.producto}` : item.producto,
                cantidad_kg: item.cantidad,
                precio_kg: item.precio,
                total: item.cantidad * item.precio,
            }));

            const { data, error } = await supabase
                .from('pedidos_hielo')
                .insert(insertData)
                .select();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hieloOrders'] });
        }
    });
}

export function useUpdateHieloOrderItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: { cantidad?: number; precio?: number; proveedorId?: string; status?: string } }) => {
            const updateData: any = {};
            if (updates.cantidad !== undefined) updateData.cantidad_kg = updates.cantidad;
            if (updates.precio !== undefined) updateData.precio_kg = updates.precio;
            if (updates.proveedorId !== undefined) updateData.proveedor_id = updates.proveedorId;
            if (updates.status !== undefined) updateData.status = updates.status;
            
            if (updates.cantidad !== undefined && updates.precio !== undefined) {
                updateData.total = updates.cantidad * updates.precio;
            }

            const { data, error } = await supabase
                .from('pedidos_hielo')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hieloOrders'] });
        }
    });
}

export function useDeleteHieloOrderItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('pedidos_hielo')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hieloOrders'] });
        }
    });
}
