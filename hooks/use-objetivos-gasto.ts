import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, resolveOsId } from '@/lib/supabase';
import type { ObjetivosGasto } from '@/types';

// Hook para plantillas de objetivos de gasto
export const useObjetivosGastoPlantillas = () => {
  return useQuery({
    queryKey: ['objetivos-gasto-plantillas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('objetivos_gasto')
        .select('*')
        .is('os_id', null)
        .order('nombre');
      if (error) throw error;
      return (data || []) as ObjetivosGasto[];
    }
  });
};

export const useSaveObjetivoGastoPlantilla = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (plantilla: Partial<ObjetivosGasto>) => {
      const dataToSave = {
        ...plantilla,
        name: plantilla.nombre, // Sync name with nombre for the NOT NULL constraint
        os_id: null // Ensure it's a template
      };
      
      const { data, error } = await supabase
        .from('objetivos_gasto')
        .upsert(dataToSave, { onConflict: 'name' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objetivos-gasto-plantillas'] });
    }
  });
};

export const useDeleteObjetivosGastoPlantillasBulk = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('objetivos_gasto')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objetivos-gasto-plantillas'] });
    }
  });
};

// Hook para objetivos de gasto por OS
export const useObjetivosGasto = (osId?: string) => {
  return useQuery({
    queryKey: ['objetivosGasto', osId],
    queryFn: async () => {
      if (!osId) return null;
      const targetId = await resolveOsId(osId);
      const { data, error } = await supabase
        .from('objetivos_gasto')
        .select('*')
        .or(`os_id.eq.${targetId},os_id.eq.${osId}`)
        .maybeSingle();
      if (error) throw error;
      return data as ObjetivosGasto | null;
    },
    enabled: !!osId
  });
};

export const useUpdateObjetivoGasto = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ osId, objetivo }: { osId: string, objetivo: ObjetivosGasto }) => {
      const targetId = await resolveOsId(osId);
      const { data, error } = await supabase
        .from('objetivos_gasto')
        .upsert({ ...objetivo, os_id: targetId }, { onConflict: 'os_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['objetivosGasto', variables.osId] });
    }
  });
};
