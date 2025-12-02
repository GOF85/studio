import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';;
import type { PersonalEntrega } from '@/types';



export function useCreatePersonalEntrega() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (personal: Partial<PersonalEntrega>) => {
            const { data, error } = await supabase
                .from('personal_entrega')
                .insert({
                    entrega_id: personal.osId,
                    turnos: personal.turnos || [],
                    data: {
                        status: personal.status || 'Pendiente',
                        observacionesGenerales: personal.observacionesGenerales,
                    }
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['personal-entrega'] });
        }
    });
}

export function useUpdatePersonalEntrega() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ entregaId, updates }: { entregaId: string; updates: Partial<PersonalEntrega> }) => {
            const { data, error } = await supabase
                .from('personal_entrega')
                .update({
                    turnos: updates.turnos,
                    data: {
                        status: updates.status,
                        observacionesGenerales: updates.observacionesGenerales,
                    }
                })
                .eq('entrega_id', entregaId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['personal-entrega'] });
        }
    });
}

export function useDeletePersonalEntrega() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (entregaId: string) => {
            const { error } = await supabase
                .from('personal_entrega')
                .delete()
                .eq('entrega_id', entregaId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['personal-entrega'] });
        }
    });
}
