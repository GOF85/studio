import { SupabaseClient } from '@supabase/supabase-js';

export interface FormatoExpedicion {
  id: string;
  nombre: string;
}

export async function getFormatosExpedicion(supabase: SupabaseClient): Promise<FormatoExpedicion[]> {
  const { data, error } = await supabase
    .from('formatos_expedicion')
    .select('*')
    .order('nombre');

  if (error) {
    console.error('Error fetching formatos expedicion:', error);
    return [];
  }

  return (data || []).map(f => ({
    id: f.id,
    nombre: f.nombre
  }));
}
