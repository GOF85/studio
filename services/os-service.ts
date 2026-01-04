import { SupabaseClient } from '@supabase/supabase-js';
import { ServiceOrder } from '@/types';

export function mapEvento(data: any): Partial<ServiceOrder> {
  let responsables: any = {};
  try {
    responsables = typeof data.responsables === 'string'
      ? JSON.parse(data.responsables)
      : (data.responsables || {});
  } catch (err) {
    console.error('Error parsing responsables:', err);
  }

  return {
    id: data.id,
    serviceNumber: data.numero_expediente || '',
    isVip: data.is_vip || false,
    client: data.client || '',
    tipoCliente: data.tipo_cliente || 'Empresa',
    finalClient: data.final_client || '',
    startDate: data.start_date,
    endDate: data.end_date,
    status: (data.status || 'Borrador') as any,
    asistentes: data.asistentes || 0,
    vertical: data.vertical || 'Catering',
    cateringVertical: data.catering_vertical,
    comercial: data.comercial || '',
    comercialPhone: data.comercial_phone || '',
    comercialMail: data.comercial_mail || '',
    comercialAsiste: data.comercial_asiste || false,
    space: data.space || '',
    spaceAddress: data.space_address || '',
    spaceContact: data.space_contact || '',
    spacePhone: data.space_phone || '',
    spaceMail: data.space_mail || '',
    contact: data.contact || '',
    phone: data.phone || '',
    email: data.email || '',
  };
}

export async function getEventosPaginated(
  supabase: SupabaseClient,
  options: {
    page: number;
    pageSize: number;
    searchTerm?: string;
  }
) {
  const { page, pageSize, searchTerm } = options;

  let query = supabase
    .from('eventos')
    .select('*', { count: 'exact' });

  if (searchTerm) {
    query = query.or(`numero_expediente.ilike.%${searchTerm}%,cliente.ilike.%${searchTerm}%,cliente_final.ilike.%${searchTerm}%`);
  }

  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order('start_date', { ascending: false })
    .range(from, to);

  if (error) throw error;

  return {
    eventos: (data || []).map(mapEvento),
    totalCount: count || 0
  };
}

export async function deleteEvento(supabase: SupabaseClient, id: string) {
  // Tables linked by os_id
  const TABLES_WITH_OS_ID = [
    'comercial_briefings',
    'comercial_ajustes',
    'gastronomia_orders',
    'material_orders',
    'pedidos_transporte',
    'pedidos_hielo',
    'pedidos_decoracion',
    'atipico_orders',
    'pruebas_menu',
    'hojas_picking',
    'hojas_retorno',
    'cta_real_costs',
    'cta_comentarios',
    'os_mermas',
    'os_devoluciones',
    'personal_mice_asignaciones',
  ];

  // Tables linked by evento_id
  const TABLES_WITH_EVENTO_ID = [
    'personal_externo_eventos',
    'personal_externo_ajustes'
  ];

  // Resolve the target ID using the provided Supabase client so we can build safe filters
  let targetId = id;
  // If id looks like UUID, keep it. Otherwise try to resolve via eventos/entregas
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!isUuid) {
    const { data: eventoData } = await supabase.from('eventos').select('id').eq('numero_expediente', id).maybeSingle();
    if (eventoData?.id) targetId = eventoData.id;
    else {
      const { data: entregaData } = await supabase.from('entregas').select('id').eq('numero_expediente', id).maybeSingle();
      if (entregaData?.id) targetId = entregaData.id;
    }
  }

  // Delete from tables with os_id using safe .or() expressions
  for (const table of TABLES_WITH_OS_ID) {
    const orExpr = `os_id.eq.${targetId},numero_expediente.eq.${id}`;
    await supabase.from(table).delete().or(orExpr);
  }

  // Delete from tables with evento_id — use targetId when possible
  for (const table of TABLES_WITH_EVENTO_ID) {
    if (targetId && targetId !== id) {
      await supabase.from(table).delete().or(`evento_id.eq.${targetId},evento_id.eq.${id}`);
    } else {
      await supabase.from(table).delete().eq('numero_expediente', id);
    }
  }

  // Finally delete the event itself
  if (targetId && targetId !== id) {
    const { error } = await supabase.from('eventos').delete().eq('id', targetId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('eventos').delete().eq('numero_expediente', id);
    if (error) throw error;
  }
}

export async function deleteEventosBulk(supabase: SupabaseClient, ids: string[]) {
  for (const id of ids) {
    await deleteEvento(supabase, id);
  }
}
