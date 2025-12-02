import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';;
import type { Entrega } from '@/types';



export function useCreateEntrega() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (entrega: Partial<Entrega>) => {
            const { data, error } = await supabase
                .from('entregas')
                .insert({
                    evento_id: entrega.osId,
                    nombre: entrega.nombre,
                    fecha: entrega.fecha,
                    hora: entrega.hora,
                    direccion: entrega.direccion,
                    observaciones: entrega.observaciones,
                    estado: entrega.status || 'Pendiente',
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['entregas'] });
        }
    });
}

export function useUpdateEntrega() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<Entrega> }) => {
            const { data, error } = await supabase
                .from('entregas')
                .update({
                    nombre: updates.nombre,
                    fecha: updates.fecha,
                    hora: updates.hora,
                    direccion: updates.direccion,
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
            queryClient.invalidateQueries({ queryKey: ['entregas'] });
        }
    });
}

export function useDeleteEntrega() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('entregas')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['entregas'] });
        }
    });
}

export function useUpdateEntregaStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const { data, error } = await supabase
                .from('entregas')
                .update({ estado: status })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['entregas'] });
        }
    });
}
