import { SupabaseClient } from '@supabase/supabase-js';

export interface PersonalExternoItem {
  id: string;
  proveedorId: string;
  nombre: string;
  apellido1: string;
  apellido2: string;
  categoria?: string;
  nombreCompleto: string;
  nombreCompacto: string;
  telefono: string;
  email: string;
  activo: boolean;
}

export async function getPersonalExternoPaginated(
  supabase: SupabaseClient,
  options: {
    page: number;
    pageSize: number;
    searchTerm?: string;
    providerFilter?: string;
    isActive?: boolean;
  }
) {
  const { page, pageSize, searchTerm, providerFilter, isActive = true } = options;

  let query = supabase
    .from('personal_externo_catalogo')
    .select('*', { count: 'exact' });

  // Filter by Active status
  query = query.eq('activo', isActive);

  if (searchTerm) {
    query = query.or(`nombre_completo.ilike.%${searchTerm}%,id.ilike.%${searchTerm}%`);
  }
  if (providerFilter && providerFilter !== 'all') {
    query = query.eq('proveedor_id', providerFilter);
  }

  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order('nombre', { ascending: true })
    .range(from, to);

  if (error) throw error;

  return {
    items: (data || []).map((item: any) => ({
      id: item.id,
      proveedorId: item.proveedor_id,
      nombre: item.nombre,
      apellido1: item.apellido1,
      apellido2: item.apellido2,
      categoria: item.categoria,
      nombreCompleto: item.nombre_completo,
      nombreCompacto: item.nombre_compacto,
      telefono: item.telefono,
      email: item.email,
      activo: item.activo ?? true,
    })) as PersonalExternoItem[],
    totalCount: count || 0
  };
}

export async function deletePersonalExterno(supabase: SupabaseClient, id: string) {
  const { error } = await supabase
    .from('personal_externo_catalogo')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function deletePersonalExternoBulk(supabase: SupabaseClient, ids: string[]) {
  const { error } = await supabase
    .from('personal_externo_catalogo')
    .delete()
    .in('id', ids);
  if (error) throw error;
}

export async function upsertPersonalExterno(supabase: SupabaseClient, item: Partial<PersonalExternoItem>) {
  const { error } = await supabase
    .from('personal_externo_catalogo')
    .upsert({
      id: item.id,
      proveedor_id: item.proveedorId,
      nombre: item.nombre,
      apellido1: item.apellido1,
      apellido2: item.apellido2,
      categoria: item.categoria,
      telefono: item.telefono,
      email: item.email,
      activo: item.activo ?? true,
    });
  if (error) throw error;
}
