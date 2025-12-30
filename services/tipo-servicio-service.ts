import { SupabaseClient } from '@supabase/supabase-js';

export type TipoServicio = {
  id: string;
  nombre: string;
  descripcion?: string;
  created_at?: string;
};


export async function getTiposServicio(supabase: SupabaseClient): Promise<TipoServicio[]> {
  const { data, error } = await supabase
    .from('tipos_servicio_briefing')
    .select('*')
    .order('nombre');

  if (error) {
    console.error('Error fetching tipos de servicio:', error);
    return [];
  }

  return data || [];
}
