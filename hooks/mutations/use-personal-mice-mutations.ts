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
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['personalMiceOrders', variables.osId] });
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
                    categoria: updates.tipoServicio,
                    hora_entrada: updates.horaEntrada,
                    hora_salida: updates.horaSalida,
                    hora_entrada_real: updates.horaEntradaReal,
                    hora_salida_real: updates.horaSalidaReal,
                    precio_hora: updates.precioHora,
                    data: {
                        centroCoste: updates.centroCoste,
                        nombre: updates.nombre,
                        dni: updates.dni,
                    }
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            // We don't have osId here easily unless we pass it or invalidate all
            queryClient.invalidateQueries({ queryKey: ['personalMiceOrders'] });
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
            queryClient.invalidateQueries({ queryKey: ['personalMiceOrders'] });
        }
    });
}

export function useSyncPersonalMiceAssignments() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ osId, assignments }: { osId: string, assignments: Partial<PersonalMiceOrder>[] }) => {
            // 1. Delete existing assignments for this OS
            const { error: deleteError } = await supabase
                .from('personal_mice_asignaciones')
                .delete()
                .eq('evento_id', osId);

            if (deleteError) throw deleteError;

            if (assignments.length === 0) return [];

            // 2. Insert new assignments
            const { data, error: insertError } = await supabase
                .from('personal_mice_asignaciones')
                .insert(assignments.map(a => ({
                    evento_id: osId,
                    personal_id: a.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(a.id) ? a.id : null,
                    categoria: a.tipoServicio,
                    hora_entrada: a.horaEntrada,
                    hora_salida: a.horaSalida,
                    hora_entrada_real: a.horaEntradaReal,
                    hora_salida_real: a.horaSalidaReal,
                    precio_hora: a.precioHora,
                    data: {
                        centroCoste: a.centroCoste,
                        nombre: a.nombre,
                        dni: a.dni,
                    }
                })))
                .select();

            if (insertError) throw insertError;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['personalMiceOrders', variables.osId] });
        }
    });
}
