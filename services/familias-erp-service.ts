import { SupabaseClient } from '@supabase/supabase-js';

export interface FamiliaERP {
  id: string;
  familiaCategoria: string;
  Familia: string;
  Categoria: string;
}

export async function getFamiliasERP(supabase: SupabaseClient): Promise<FamiliaERP[]> {
  const { data, error } = await supabase
    .from('familias')
    .select('*')
    .order('nombre');

  if (error) {
    console.error('Error fetching familias ERP:', error);
    return [];
  }

  return (data || []).map(f => ({
    id: f.id,
    familiaCategoria: f.codigo || '',
    Familia: f.nombre,
    Categoria: f.categoria_padre || ''
  }));
}
