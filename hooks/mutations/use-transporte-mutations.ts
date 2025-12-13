import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';;
import type { TransporteOrder } from '@/types';



/**
 * Hook to create a new transport order
 */
export function useCreateTransporteOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (order: Partial<TransporteOrder> & { contactoRecogida?: string; contactoEntrega?: string }) => {
            const { data, error } = await supabase
                .from('pedidos_transporte')
                .insert({
                    evento_id: order.osId,
                    tipo_transporte: order.tipoTransporte,
                    fecha: order.fecha,
                    hora_recogida: order.horaRecogida,
                    hora_entrega: order.horaEntrega,
                    proveedor_id: order.proveedorId,
                    precio: order.precio,
                    observaciones: order.observaciones,
                    estado: order.status || 'Pendiente',
                    data: {
                        lugarRecogida: order.lugarRecogida,
                        lugarEntrega: order.lugarEntrega,
                        contactoRecogida: order.contactoRecogida,
                        contactoEntrega: order.contactoEntrega,
                        // Store any other fields not in the schema
                    }
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            // Invalidate and refetch transport orders
            queryClient.invalidateQueries({ queryKey: ['transporte'] });
        }
    });
}

/**
 * Hook to update an existing transport order
 */
export function useUpdateTransporteOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<TransporteOrder> & { contactoRecogida?: string; contactoEntrega?: string } }) => {
            const { data, error } = await supabase
                .from('pedidos_transporte')
                .update({
                    tipo_transporte: updates.tipoTransporte,
                    fecha: updates.fecha,
                    hora_recogida: updates.horaRecogida,
                    hora_entrega: updates.horaEntrega,
                    proveedor_id: updates.proveedorId,
                    precio: updates.precio,
                    observaciones: updates.observaciones,
                    estado: updates.status,
                    data: {
                        lugarRecogida: updates.lugarRecogida,
                        lugarEntrega: updates.lugarEntrega,
                        contactoRecogida: updates.contactoRecogida,
                        contactoEntrega: updates.contactoEntrega,
                    }
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transporte'] });
        }
    });
}

/**
 * Hook to delete a transport order
 */
export function useDeleteTransporteOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('pedidos_transporte')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transporte'] });
        }
    });
}

/**
 * Hook to update transport order status
 */
export function useUpdateTransporteStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const { data, error } = await supabase
                .from('pedidos_transporte')
                .update({ estado: status })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transporte'] });
        }
    });
}
