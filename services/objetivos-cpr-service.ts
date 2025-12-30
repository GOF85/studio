import { SupabaseClient } from '@supabase/supabase-js';
import { ObjetivoMensualCPR } from '@/types';

export async function getObjetivosCPR(supabase: SupabaseClient): Promise<ObjetivoMensualCPR[]> {
  const { data, error } = await supabase
    .from('cpr_objetivos')
    .select('*')
    .order('mes', { ascending: false });

  if (error) {
    console.error('Error fetching objetivos CPR:', error);
    return [];
  }

  return (data || []).map(o => ({
    mes: o.mes,
    presupuestoVentas: o.presupuesto_ventas,
    presupuestoCesionPersonal: o.presupuesto_cesion_personal,
    presupuestoGastosMP: o.presupuesto_gastos_mp,
    presupuestoGastosPersonalMice: o.presupuesto_gastos_personal_mice,
    presupuestoGastosPersonalExterno: o.presupuesto_gastos_personal_externo,
    presupuestoOtrosGastos: o.presupuesto_otros_gastos,
  }));
}
