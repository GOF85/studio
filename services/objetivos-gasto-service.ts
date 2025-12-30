import { SupabaseClient } from '@supabase/supabase-js';
import { ObjetivosGasto } from '@/types';

export async function getObjetivosGastoPlantillas(supabase: SupabaseClient): Promise<ObjetivosGasto[]> {
  const { data, error } = await supabase
    .from('objetivos_gasto')
    .select('*')
    .is('os_id', null)
    .order('nombre');

  if (error) {
    console.error('Error fetching objetivos gasto plantillas:', error);
    return [];
  }

  return (data || []) as ObjetivosGasto[];
}
