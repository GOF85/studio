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
    .from('categorias_personal')
    .select(`
      *,
      proveedor:proveedores (
        id,
        nombre_comercial
      )
    `)
    .order('nombre');

  if (error) {
    console.error('Error fetching tipos de personal:', error);
    return [];
  }

  return (data || []).map(item => ({
    id: item.id,
    proveedorId: item.proveedor_id,
    nombreProveedor: item.proveedor?.nombre_comercial || 'N/A',
    categoria: item.nombre,
    precioHora: item.precio_hora_base || 0,
  }));
}
