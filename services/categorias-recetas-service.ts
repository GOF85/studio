import { SupabaseClient } from '@supabase/supabase-js';

export interface CategoriaReceta {
  id: string;
  nombre: string;
  snack: boolean;
}

export async function getCategoriasRecetas(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('categorias_recetas')
    .select('*')
    .order('nombre');
  if (error) throw error;
  return (data || []).map(c => ({
    id: c.id,
    nombre: c.nombre,
    snack: c.snack
  })) as CategoriaReceta[];
}

export async function upsertCategoriaReceta(supabase: SupabaseClient, item: Partial<CategoriaReceta>) {
  const { error } = await supabase
    .from('categorias_recetas')
    .upsert({
      id: item.id,
      nombre: item.nombre,
      snack: item.snack
    });
  if (error) throw error;
}

export async function deleteCategoriaReceta(supabase: SupabaseClient, id: string) {
  const { error } = await supabase
    .from('categorias_recetas')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function deleteCategoriasRecetasBulk(supabase: SupabaseClient, ids: string[]) {
  const { error } = await supabase
    .from('categorias_recetas')
    .delete()
    .in('id', ids);
  if (error) throw error;
}
