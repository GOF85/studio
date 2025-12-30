import { SupabaseClient } from '@supabase/supabase-js';
import { PedidoPlantilla } from '@/types';

export async function getPlantillasPedidos(supabase: SupabaseClient): Promise<PedidoPlantilla[]> {
  const { data, error } = await supabase
    .from('pedido_plantillas')
    .select('*')
    .order('nombre');

  if (error) {
    console.error('Error fetching plantillas pedidos:', error);
    return [];
  }

  return (data || []) as PedidoPlantilla[];
}
