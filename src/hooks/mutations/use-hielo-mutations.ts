import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';;



/**
 * Create a hielo (ice) order item
 * Note: Ice orders are stored as individual items in the database
 */
export function useCreateHieloOrderItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (item: { osId: string; producto: string; cantidad: number; precio: number }) => {
            const { data, error } = await supabase
                .from('pedidos_hielo')
                .insert({
                    evento_id: item.osId,
                    tipo_hielo: item.producto,
                    cantidad_kg: item.cantidad,
                    precio_kg: item.precio,
                    total: item.cantidad * item.precio,
                    estado: 'Pendiente',
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hielo'] });
        }
    });
}

export function useUpdateHieloOrderItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: { cantidad?: number; precio?: number } }) => {
            const updateData: any = {};
            if (updates.cantidad !== undefined) updateData.cantidad_kg = updates.cantidad;
            if (updates.precio !== undefined) updateData.precio_kg = updates.precio;
            if (updates.cantidad && updates.precio) {
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
            queryClient.invalidateQueries({ queryKey: ['hielo'] });
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
            queryClient.invalidateQueries({ queryKey: ['hielo'] });
        }
    });
}

export function useUpdateHieloOrderStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ osId, status }: { osId: string; status: string }) => {
            const { data, error } = await supabase
                .from('pedidos_hielo')
                .update({ estado: status })
                .eq('evento_id', osId)
                .select();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hielo'] });
        }
    });
}
