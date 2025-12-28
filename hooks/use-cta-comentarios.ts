import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, resolveOsId } from '@/lib/supabase';

export const useCtaComentarios = (osId?: string) => {
  return useQuery({
    queryKey: ['ctaComentarios', osId],
    queryFn: async () => {
      if (!osId) return {};
      const targetId = await resolveOsId(osId);
      const { data, error } = await supabase
        .from('cta_comentarios')
        .select('*')
        .or(`os_id.eq.${targetId},os_id.eq.${osId}`)
        .maybeSingle();
      if (error) throw error;
      return data ? data.comentarios || {} : {};
    },
    enabled: !!osId
  });
};

export const useUpdateCtaComentarios = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ osId, comentarios }: { osId: string, comentarios: Record<string, string> }) => {
      const targetId = await resolveOsId(osId);
      const { data, error } = await supabase
        .from('cta_comentarios')
        .upsert({ os_id: targetId, comentarios }, { onConflict: 'os_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ctaComentarios', variables.osId] });
    }
  });
};
