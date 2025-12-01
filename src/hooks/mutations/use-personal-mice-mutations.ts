import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';;
import type { PersonalMiceOrder } from '@/types';



export function useCreatePersonalMiceAssignment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (assignment: Partial<PersonalMiceOrder>) => {
            const { data, error } = await supabase
                .from('personal_mice_asignaciones')
                .insert({
                    evento_id: assignment.osId,
                    personal_id: assignment.id,
                    categoria: assignment.tipoServicio,
                    hora_entrada: assignment.horaEntrada,
                    hora_salida: assignment.horaSalida,
                    hora_entrada_real: assignment.horaEntradaReal,
                    hora_salida_real: assignment.horaSalidaReal,
                    precio_hora: assignment.precioHora,
                    data: {
                        centroCoste: assignment.centroCoste,
                        nombre: assignment.nombre,
                        dni: assignment.dni,
                    }
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['personal-mice'] });
        }
    });
}

export function useUpdatePersonalMiceAssignment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<PersonalMiceOrder> }) => {
            const { data, error } = await supabase
                .from('personal_mice_asignaciones')
                .update({
                    hora_entrada: updates.horaEntrada,
                    hora_salida: updates.horaSalida,
                    hora_entrada_real: updates.horaEntradaReal,
                    hora_salida_real: updates.horaSalidaReal,
                    precio_hora: updates.precioHora,
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['personal-mice'] });
        }
    });
}

export function useDeletePersonalMiceAssignment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('personal_mice_asignaciones')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['personal-mice'] });
        }
    });
}
