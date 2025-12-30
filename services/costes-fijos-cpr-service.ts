import { SupabaseClient } from '@supabase/supabase-js';

export interface CosteFijoCPR {
  id: string;
  concepto: string;
  importeMensual: number;
  created_at?: string;
}

export async function getCostesFijosCPR(supabase: SupabaseClient): Promise<CosteFijoCPR[]> {
  const { data, error } = await supabase
    .from('costes_fijos_cpr')
    .select('*')
    .order('concepto');

  if (error) {
    console.error('Error fetching costes fijos CPR:', error);
    return [];
  }

  return data || [];
}
