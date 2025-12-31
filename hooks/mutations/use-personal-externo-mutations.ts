import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';;
import type { PersonalExterno, PersonalExternoAjuste } from '@/types';

export function useCreatePersonalExterno() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (personal: Partial<PersonalExterno>) => {
            const { data, error } = await supabase
                .from('personal_externo_eventos')
                .insert({
                    evento_id: personal.osId,
                    turnos: personal.turnos || [],
                    data: {
                        status: personal.status || 'Pendiente',
                        observacionesGenerales: personal.observacionesGenerales,
                        hojaFirmadaUrl: personal.hojaFirmadaUrl,
                    }
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['personalExterno', variables.osId] });
        }
    });
}

export function useUpdatePersonalExterno() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ osId, updates }: { osId: string; updates: Partial<PersonalExterno> }) => {
            const { data, error } = await supabase
                .from('personal_externo_eventos')
                .update({
                    turnos: updates.turnos,
                    data: {
                        status: updates.status,
                        observacionesGenerales: updates.observacionesGenerales,
                        hojaFirmadaUrl: updates.hojaFirmadaUrl,
                    }
                })
                .eq('evento_id', osId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['personalExterno', variables.osId] });
        }
    });
}

export function useDeletePersonalExterno() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (osId: string) => {
            const { error } = await supabase
                .from('personal_externo_eventos')
                .delete()
                .eq('evento_id', osId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['personalExterno'] });
        }
    });
}

// Ajustes

export function useSyncPersonalExternoAjustes() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ osId, ajustes }: { osId: string, ajustes: Partial<PersonalExternoAjuste>[] }) => {
            // 1. Delete existing adjustments for this OS
            const { error: deleteError } = await supabase
                .from('personal_externo_ajustes')
                .delete()
                .eq('evento_id', osId);

            if (deleteError) throw deleteError;

            if (ajustes.length === 0) return [];

            // 2. Insert new adjustments
            const { data, error: insertError } = await supabase
                .from('personal_externo_ajustes')
                .insert(ajustes.map(a => ({
                    evento_id: osId,
                    concepto: a.concepto,
                    importe: a.importe,
                    data: {
                        proveedorId: a.proveedorId,
                    }
                })))
                .select();

            if (insertError) throw insertError;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['personalExternoAjustes', variables.osId] });
        }
    });
}
