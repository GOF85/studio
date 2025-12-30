import { SupabaseClient } from '@supabase/supabase-js';

export interface TipoTransporte {
  id: string;
  nombre: string;
  precio_base: number;
  descripcion: string | null;
  proveedor_id: string | null;
  proveedor?: {
    nombre_comercial: string;
  } | null;
}

export async function getTiposTransporte(supabase: SupabaseClient): Promise<TipoTransporte[]> {
  const { data, error } = await supabase
    .from('transporte_tipos')
    .select('*, proveedor:proveedores(nombre_comercial)')
    .order('nombre');

  if (error) {
    console.error('Error fetching tipos transporte:', error);
    return [];
  }

  return data || [];
}
