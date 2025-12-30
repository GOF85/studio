import { SupabaseClient } from '@supabase/supabase-js';

export type AtipicoCatalogo = {
  id: string;
  nombre: string;
  precio_referencia: number;
  descripcion: string | null;
};

export async function getAtipicosCatalogoPaginated(
  supabase: SupabaseClient,
  options: {
    page: number;
    pageSize: number;
    searchTerm?: string;
  }
) {
  const { page, pageSize, searchTerm } = options;

  let query = supabase
    .from('atipicos_catalogo')
    .select('*', { count: 'exact' });

  if (searchTerm) {
    query = query.or(`nombre.ilike.%${searchTerm}%,descripcion.ilike.%${searchTerm}%`);
  }

  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order('nombre', { ascending: true })
    .range(from, to);

  if (error) throw error;

  return {
    items: (data || []) as AtipicoCatalogo[],
    totalCount: count || 0,
  };
}
