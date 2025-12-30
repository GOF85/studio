import { SupabaseClient } from '@supabase/supabase-js';
import { ServiceOrder } from '@/types';

export function mapEvento(data: any): ServiceOrder {
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
    responsables,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    numero_expediente: data.numero_expediente,
    cliente: data.cliente,
    cliente_final: data.cliente_final,
    start_date: data.start_date,
    end_date: data.end_date,
    is_vip: data.is_vip,
    tipo_cliente: data.tipo_cliente,
    catering_vertical: data.catering_vertical,
    comercial_phone: data.comercial_phone,
    comercial_mail: data.comercial_mail,
    comercial_asiste: data.comercial_asiste,
    space_address: data.space_address,
    space_contact: data.space_contact,
    space_phone: data.space_phone,
    space_mail: data.space_mail,
    created_at: data.created_at,
    updated_at: data.updated_at,
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

  // Delete from tables with os_id
  for (const table of TABLES_WITH_OS_ID) {
    await supabase.from(table).delete().eq('os_id', id);
  }

  // Delete from tables with evento_id
  for (const table of TABLES_WITH_EVENTO_ID) {
    await supabase.from(table).delete().eq('evento_id', id);
  }

  // Finally delete the event itself
  const { error } = await supabase.from('eventos').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteEventosBulk(supabase: SupabaseClient, ids: string[]) {
  for (const id of ids) {
    await deleteEvento(supabase, id);
  }
}
