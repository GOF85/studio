import { SupabaseClient } from '@supabase/supabase-js';

export interface DecoracionCatalogo {
  id: string;
  nombre: string;
  precio_referencia: number;
  descripcion: string | null;
}

export async function getDecoracionCatalogoPaginated(
  supabase: SupabaseClient,
  options: {
    page: number;
    pageSize: number;
    searchTerm?: string;
  }
) {
  const { page, pageSize, searchTerm } = options;
  
  let query = supabase
    .from('decoracion_catalogo')
    .select('*', { count: 'exact' });

  if (searchTerm) {
    query = query.or(`nombre.ilike.%${searchTerm}%,descripcion.ilike.%${searchTerm}%`);
  }

  const { data, count, error } = await query
    .order('nombre')
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (error) throw error;

  return {
    items: (data || []) as DecoracionCatalogo[],
    totalCount: count || 0,
  };
}
