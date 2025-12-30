import { SupabaseClient } from '@supabase/supabase-js';

export type ProveedorTipo = {
  proveedor_id: string;
  id_erp: string;
  nombre_comercial: string;
  tipos: string[];
};

export async function getProveedoresTipos(supabase: SupabaseClient): Promise<ProveedorTipo[]> {
  // Fetch both in parallel
  const [proveedoresRes, tiposRes] = await Promise.all([
    supabase.from('proveedores').select('id, id_erp, nombre_comercial').order('nombre_comercial'),
    supabase.from('proveedores_tipos_servicio').select('proveedor_id, tipos')
  ]);

  if (proveedoresRes.error) {
    console.error('Error fetching proveedores:', proveedoresRes.error);
    return [];
  }

  const proveedores = proveedoresRes.data || [];
  const tiposServicio = tiposRes.data || [];
  const tiposMap = new Map(tiposServicio.map(t => [t.proveedor_id, t.tipos]));

  return proveedores.map(p => ({
    proveedor_id: p.id,
    id_erp: p.id_erp || '',
    nombre_comercial: p.nombre_comercial,
    tipos: tiposMap.get(p.id) || []
  }));
}
