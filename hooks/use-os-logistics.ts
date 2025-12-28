import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Devolucion, Merma, IncidenciaMaterial, OSEstadoCierre } from '@/types';
import { useToast } from '@/hooks/use-toast';

export const useDevoluciones = () => {
    const { toast } = useToast();

    const loadDevoluciones = useCallback(async (osId: string) => {
        const { data, error } = await supabase
            .from('os_devoluciones')
            .select('*')
            .eq('os_id', osId)
            .order('fecha', { ascending: false });

        if (error) {
            console.error('Error loading devoluciones:', error);
            return [];
        }
        return data as Devolucion[];
    }, []);

    const saveDevolucion = useCallback(async (devolucion: Devolucion) => {
        const { data, error } = await supabase
            .from('os_devoluciones')
            .insert(devolucion)
            .select()
            .single();

        if (error) {
            toast({
                title: 'Error al registrar devolución',
                description: error.message,
                variant: 'destructive',
            });
            throw error;
        }
        return data as Devolucion;
    }, [toast]);

    return { loadDevoluciones, saveDevolucion };
};

export const useMermas = () => {
    const { toast } = useToast();

    const loadMermas = useCallback(async (osId: string) => {
        const { data, error } = await supabase
            .from('os_mermas')
            .select('*')
            .eq('os_id', osId)
            .order('fecha', { ascending: false });

        if (error) {
            console.error('Error loading mermas:', error);
            return [];
        }
        return data as Merma[];
    }, []);

    const saveMerma = useCallback(async (merma: Merma) => {
        const { data, error } = await supabase
            .from('os_mermas')
            .insert(merma)
            .select()
            .single();

        if (error) {
            toast({
                title: 'Error al registrar merma',
                description: error.message,
                variant: 'destructive',
            });
            throw error;
        }
        return data as Merma;
    }, [toast]);

    return { loadMermas, saveMerma };
};

export const useIncidenciasMaterial = () => {
    const { toast } = useToast();

    const loadIncidencias = useCallback(async (osId: string) => {
        const { data, error } = await supabase
            .from('os_incidencias_material')
            .select('*')
            .eq('os_id', osId)
            .order('fecha', { ascending: false });

        if (error) {
            console.error('Error loading incidencias:', error);
            return [];
        }
        return data as IncidenciaMaterial[];
    }, []);

    const saveIncidencia = useCallback(async (incidencia: IncidenciaMaterial) => {
        const { data, error } = await supabase
            .from('os_incidencias_material')
            .insert(incidencia)
            .select()
            .single();

        if (error) {
            toast({
                title: 'Error al registrar incidencia',
                description: error.message,
                variant: 'destructive',
            });
            throw error;
        }
        return data as IncidenciaMaterial;
    }, [toast]);

    return { loadIncidencias, saveIncidencia };
};

export const useOSEstadoCierre = () => {
    const { toast } = useToast();

    const loadEstadoCierre = useCallback(async (osId: string) => {
        const { data, error } = await supabase
            .from('os_estados_cierre')
            .select('*')
            .eq('os_id', osId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error loading estado cierre:', error);
            return null;
        }
        return data as OSEstadoCierre | null;
    }, []);

    const updateEstadoCierre = useCallback(async (estado: OSEstadoCierre) => {
        const { data, error } = await supabase
            .from('os_estados_cierre')
            .upsert(estado)
            .select()
            .single();

        if (error) {
            toast({
                title: 'Error al actualizar estado de cierre',
                description: error.message,
                variant: 'destructive',
            });
            throw error;
        }
        return data as OSEstadoCierre;
    }, [toast]);

    return { loadEstadoCierre, updateEstadoCierre };
};

export const useLogisticaLogs = () => {
    const loadLogs = useCallback(async (osId: string) => {
        const { data, error } = await supabase
            .from('os_logistica_logs')
            .select('*')
            .eq('os_id', osId)
            .order('fecha', { ascending: false });

        if (error) {
            console.error('Error loading logs:', error);
            return [];
        }
        return data;
    }, []);

    const saveLog = useCallback(async (osId: string, accion: string, detalles: any) => {
        const { error } = await supabase
            .from('os_logistica_logs')
            .insert({
                os_id: osId,
                accion,
                detalles,
                usuario_id: (await supabase.auth.getUser()).data.user?.id
            });

        if (error) console.error('Error saving log:', error);
    }, []);

    return { loadLogs, saveLog };
};
