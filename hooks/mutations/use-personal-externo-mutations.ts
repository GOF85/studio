import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';;
import type { PersonalExterno, PersonalExternoTurno, PersonalExternoAjuste } from '@/types';



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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['personal-externo'] });
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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['personal-externo'] });
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
            queryClient.invalidateQueries({ queryKey: ['personal-externo'] });
        }
    });
}

// Ajustes
export function useCreatePersonalExternoAjuste() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (ajuste: Partial<PersonalExternoAjuste> & { osId: string }) => {
            const { data, error } = await supabase
                .from('personal_externo_ajustes')
                .insert({
                    evento_id: ajuste.osId,
                    concepto: ajuste.concepto,
                    importe: ajuste.importe,
                    data: {
                        proveedorId: ajuste.proveedorId,
                    }
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['personal-externo-ajustes'] });
        }
    });
}

export function useDeletePersonalExternoAjuste() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('personal_externo_ajustes')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['personal-externo-ajustes'] });
        }
    });
}
