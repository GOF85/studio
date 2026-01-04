import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, resolveOsId, buildOsOr } from '@/lib/supabase';
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
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(osId);
      const targetId = await resolveOsId(osId);
      const orExpr = buildOsOr(osId, targetId);
      let result;
      if (isUuid) {
        result = await supabase.from('objetivos_gasto').select('*').eq('os_id', osId).maybeSingle();
      } else if (targetId && targetId !== osId) {
        result = await supabase.from('objetivos_gasto').select('*').or(orExpr).maybeSingle();
      } else {
        result = await supabase.from('objetivos_gasto').select('*').eq('numero_expediente', osId).maybeSingle();
      }
      const { data, error } = result;
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
