import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, resolveOsId, buildOsOr } from '@/lib/supabase';

export const useCtaRealCosts = (osId?: string) => {
  return useQuery({
    queryKey: ['ctaRealCosts', osId],
    queryFn: async () => {
      if (!osId) return {};
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(osId);
      const targetId = await resolveOsId(osId);
      const orExpr = buildOsOr(osId, targetId);
      let result;
      if (isUuid) {
        result = await supabase.from('cta_real_costs').select('*').eq('os_id', osId).maybeSingle();
      } else if (targetId && targetId !== osId) {
        result = await supabase.from('cta_real_costs').select('*').or(orExpr).maybeSingle();
      } else {
        result = await supabase.from('cta_real_costs').select('*').eq('numero_expediente', osId).maybeSingle();
      }
      const { data, error } = result;
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
