import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, resolveOsId } from '@/lib/supabase';

export const useCtaRealCosts = (osId?: string) => {
  return useQuery({
    queryKey: ['ctaRealCosts', osId],
    queryFn: async () => {
      if (!osId) return {};
      const targetId = await resolveOsId(osId);
      const { data, error } = await supabase
        .from('cta_real_costs')
        .select('*')
        .or(`os_id.eq.${targetId},os_id.eq.${osId}`)
        .maybeSingle();
      if (error) throw error;
      return data ? data.costs || {} : {};
    },
    enabled: !!osId
  });
};

export const useUpdateCtaRealCosts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ osId, costs }: { osId: string, costs: Record<string, number | undefined> }) => {
      const targetId = await resolveOsId(osId);
      const { data, error } = await supabase
        .from('cta_real_costs')
        .upsert({ os_id: targetId, costs }, { onConflict: 'os_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ctaRealCosts', variables.osId] });
    }
  });
};
