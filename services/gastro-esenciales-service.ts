import { SupabaseClient } from '@supabase/supabase-js';

export interface GastroEsencial {
  id: string;
  receta_id: string;
  orden: number;
  created_at: string;
  updated_at: string;
  // Joins
  receta?: {
    id: string;
    nombre: string;
    categoria: string;
  };
}

export async function getGastroEsenciales(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('gastro_esenciales')
    .select(`
      *,
      receta:recetas(id, nombre, categoria)
    `)
    .order('orden', { ascending: true });

  if (error) {
    // If table doesn't exist yet, return empty array to avoid crashing UI before migration
    if (error.code === '42P01') return [];
    throw error;
  }
  return data as GastroEsencial[];
}

export async function addGastroEsencial(supabase: SupabaseClient, recetaId: string) {
  // Get max order
  const { data: maxOrderData } = await supabase
    .from('gastro_esenciales')
    .select('orden')
    .order('orden', { ascending: false })
    .limit(1);

  const nextOrder = (maxOrderData?.[0]?.orden ?? -1) + 1;

  const { data, error } = await supabase
    .from('gastro_esenciales')
    .insert({
      receta_id: recetaId,
      orden: nextOrder
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeGastroEsencial(supabase: SupabaseClient, id: string) {
  const { error } = await supabase
    .from('gastro_esenciales')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function updateGastroEsencialOrdenes(supabase: SupabaseClient, updates: { id: string, orden: number }[]) {
  // Perform multiple updates (usually for reordering)
  const { error } = await supabase
    .from('gastro_esenciales')
    .upsert(updates.map(u => ({ id: u.id, orden: u.orden })));

  if (error) throw error;
}

export async function getAllRecetas(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('recetas')
    .select('id, nombre, categoria')
    .eq('visible_para_comerciales', true)
    .order('nombre');

  if (error) throw error;
  return data;
}
