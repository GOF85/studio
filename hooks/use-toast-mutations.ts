/**
 * Custom hooks that wrap mutations with toast notifications
 * Provides automatic success/error feedback to users
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import type { ServiceOrder } from '@/types';

/**
 * Create evento with toast notifications
 */
export function useCreateEventoWithToast() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (evento: Partial<ServiceOrder>) => {
            const { data, error } = await supabase
                .from('eventos')
                .insert({
                    numero_expediente: evento.serviceNumber,
                    nombre_evento: evento.client,
                    fecha_inicio: evento.startDate,
                    fecha_fin: evento.endDate,
                    estado: evento.status === 'Confirmado' ? 'CONFIRMADO' : 'BORRADOR',
                    comensales: evento.asistentes || 0,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['eventos'] });
            toast({
                title: '✅ Evento creado',
                description: `El evento "${data.nombre_evento}" se ha creado correctamente.`,
            });
        },
        onError: (error: any) => {
            toast({
                title: '❌ Error al crear evento',
                description: error.message || 'No se pudo crear el evento. Intenta de nuevo.',
                variant: 'destructive',
            });
        },
    });
}

/**
 * Update evento with toast notifications
 */
export function useUpdateEventoWithToast() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<ServiceOrder> & { id: string }) => {
            const { data, error } = await supabase
                .from('eventos')
                .update({
                    nombre_evento: updates.client,
                    fecha_inicio: updates.startDate,
                    fecha_fin: updates.endDate,
                    estado: updates.status === 'Confirmado' ? 'CONFIRMADO' : 'BORRADOR',
                    comensales: updates.asistentes,
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eventos'] });
            toast({
                title: '✅ Evento actualizado',
                description: 'Los cambios se han guardado correctamente.',
            });
        },
        onError: (error: any) => {
            toast({
                title: '❌ Error al actualizar',
                description: error.message || 'No se pudieron guardar los cambios.',
                variant: 'destructive',
            });
        },
    });
}

/**
 * Delete evento with toast notifications
 */
export function useDeleteEventoWithToast() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('eventos').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eventos'] });
            toast({
                title: '✅ Evento eliminado',
                description: 'El evento se ha eliminado correctamente.',
            });
        },
        onError: (error: any) => {
            toast({
                title: '❌ Error al eliminar',
                description: error.message || 'No se pudo eliminar el evento.',
                variant: 'destructive',
            });
        },
    });
}

/**
 * Create receta with toast notifications
 */
export function useCreateRecetaWithToast() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (receta: any) => {
            const { data, error } = await supabase
                .from('recetas')
                .insert({
                    nombre: receta.nombre,
                    descripcion_comercial: receta.descripcionComercial,
                    precio_venta: receta.precioVenta,
                    coste_teorico: receta.costeTeorico,
                    estado: receta.estado || 'BORRADOR',
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['recetas'] });
            toast({
                title: '✅ Receta creada',
                description: `La receta "${data.nombre}" se ha creado correctamente.`,
            });
        },
        onError: (error: any) => {
            toast({
                title: '❌ Error al crear receta',
                description: error.message || 'No se pudo crear la receta.',
                variant: 'destructive',
            });
        },
    });
}

/**
 * Generic mutation with toast
 * Use this for quick mutations without creating a specific hook
 */
export function useMutationWithToast<TData, TVariables>(
    mutationFn: (variables: TVariables) => Promise<TData>,
    options: {
        successTitle?: string;
        successDescription?: string;
        errorTitle?: string;
        errorDescription?: string;
        invalidateKeys?: string[][];
    } = {}
) {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn,
        onSuccess: () => {
            if (options.invalidateKeys) {
                options.invalidateKeys.forEach(key => {
                    queryClient.invalidateQueries({ queryKey: key });
                });
            }

            toast({
                title: options.successTitle || '✅ Operación exitosa',
                description: options.successDescription || 'Los cambios se han guardado correctamente.',
            });
        },
        onError: (error: any) => {
            toast({
                title: options.errorTitle || '❌ Error',
                description: error.message || options.errorDescription || 'Ha ocurrido un error.',
                variant: 'destructive',
            });
        },
    });
}
