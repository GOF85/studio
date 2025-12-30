import { SupabaseClient } from '@supabase/supabase-js';

export type TipoPersonal = {
  id: string;
  proveedorId: string;
  nombreProveedor?: string;
  categoria: string;
  precioHora: number;
};

export async function getTiposPersonal(supabase: SupabaseClient): Promise<TipoPersonal[]> {
  const { data, error } = await supabase
    .from('personal_externo_tipos')
    .select(`
      *,
      proveedores:proveedorId (
        nombre_comercial
      )
    `)
    .order('categoria');

  if (error) {
    console.error('Error fetching tipos de personal:', error);
    return [];
  }

  return (data || []).map(item => ({
    id: item.id,
    proveedorId: item.proveedorId,
    nombreProveedor: item.proveedores?.nombre_comercial || 'N/A',
    categoria: item.categoria,
    precioHora: item.precioHora || 0,
  }));
}
