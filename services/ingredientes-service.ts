import { SupabaseClient } from '@supabase/supabase-js';
import { IngredienteInterno, ArticuloERP } from '@/types';
import { isBefore, subMonths, startOfToday } from 'date-fns';

export interface IngredienteConERP extends IngredienteInterno {
  erp?: ArticuloERP;
  needsReview: boolean;
}

export async function getIngredientesData(supabase: SupabaseClient) {
  const sixMonthsAgo = subMonths(startOfToday(), 6);

  // 1. Fetch ERP Articles
  const { data: erpData, error: erpError } = await supabase
    .from('articulos_erp')
    .select('*');

  if (erpError) {
    console.error("Error fetching ERP articles:", erpError);
  }

  const mappedERP = (erpData || []).map((row: any) => ({
    id: row.id,
    idreferenciaerp: row.erp_id || row.erpId || '',
    idProveedor: row.proveedor_id || row.proveedorId || '',
    nombreProveedor: row.nombre_proveedor || row.nombreProveedor || 'Sin proveedor',
    nombreProductoERP: row.nombre || row.nombreProducto || '',
    referenciaProveedor: row.referencia_proveedor || '',
    unidadConversion: row.unidad_conversion || 1,
    precioCompra: row.precio_compra || 0,
    descuento: row.descuento || 0,
    unidad: row.unidad_medida || 'UD',
    tipo: row.tipo || '',
    categoriaMice: row.categoria_mice || '',
  })) as ArticuloERP[];

  const erpMap = new Map(mappedERP.map(item => [item.idreferenciaerp, item]));

  // 2. Fetch Internal Ingredients
  const { data: ingData, error: ingError } = await supabase
    .from('ingredientes_internos')
    .select('*')
    .order('nombre_ingrediente', { ascending: true });

  if (ingError) {
    console.error("Error fetching ingredients:", ingError);
  }

  const mappedIngredientes = (ingData || []).map((row: any) => {
    let history = [];
    try {
      history = typeof row.historial_revisiones === 'string'
        ? JSON.parse(row.historial_revisiones)
        : row.historial_revisiones || [];
    } catch (e) {
      console.error("Error parsing history", e);
    }

    const latestRevision = history.length > 0 ? history[history.length - 1] : null;
    const needsReview = !latestRevision || isBefore(new Date(latestRevision.fecha), sixMonthsAgo);

    return {
      id: row.id,
      nombreIngrediente: row.nombre_ingrediente || row.nombreIngrediente || 'NOMBRE DESCONOCIDO',
      productoERPlinkId: row.producto_erp_link_id || row.productoERPlinkId || '',
      alergenosPresentes: typeof row.alergenos_presentes === 'string' ? JSON.parse(row.alergenos_presentes) : (row.alergenos_presentes || []),
      alergenosTrazas: typeof row.alergenos_trazas === 'string' ? JSON.parse(row.alergenos_trazas) : (row.alergenos_trazas || []),
      historialRevisiones: history,
      erp: erpMap.get(row.producto_erp_link_id || row.productoERPlinkId),
      needsReview
    };
  });

  return {
    ingredientes: mappedIngredientes as IngredienteConERP[],
    articulosERP: mappedERP
  };
}
