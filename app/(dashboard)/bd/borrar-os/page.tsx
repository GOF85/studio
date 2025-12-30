'use server';

import { createClient } from '@/lib/supabase-server';
import { getTableCounts } from '@/services/borrar-os-service';
import { BorrarOsClient } from './components/BorrarOsClient';

const TABLES_TO_COUNT = [
    'eventos', 'entregas', 'comercial_briefings', 'comercial_ajustes', 
    'gastronomia_orders', 'material_orders', 'pedidos_transporte', 
    'pedidos_hielo', 'pedidos_decoracion', 'atipico_orders', 
    'pruebas_menu', 'hojas_picking', 'hojas_retorno', 'pedidos_material', 
    'personal_mice_asignaciones', 'personal_externo_eventos', 
    'personal_externo_ajustes', 'personal_entrega', 'pedidos_entrega', 
    'cta_real_costs', 'cta_comentarios', 'cpr_ordenes_fabricacion', 
    'cpr_stock_elaboraciones', 'cpr_picking_states', 'cpr_solicitudes_personal', 
    'cpr_cesiones_personal', 'os_mermas', 'os_devoluciones', 'activity_logs',
    'recetas', 'elaboraciones', 'articulos_erp', 'ingredientes_internos', 
    'personal', 'proveedores'
];

export default async function BorrarOsPage() {
    const supabase = await createClient();
    const initialCounts = await getTableCounts(supabase, TABLES_TO_COUNT);

    return <BorrarOsClient initialCounts={initialCounts} />;
}
