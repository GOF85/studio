import { SupabaseClient } from '@supabase/supabase-js';
import type { Personal } from '@/types';

export function mapPersonalFromDB(item: any): Personal {
    const nombre = item.nombre || '';
    const apellido1 = item.apellido1 || '';
    const apellido2 = item.apellido2 || '';
    const nombreCompleto = `${nombre} ${apellido1} ${apellido2}`.trim();
    const nombreCompacto = `${nombre} ${apellido1}`.trim();
    const iniciales = `${nombre.charAt(0)}${apellido1.charAt(0)}`.toUpperCase();

    return {
        id: item.id,
        nombre,
        apellido1,
        apellido2,
        nombreCompleto,
        nombreCompacto,
        iniciales,
        departamento: item.departamento || '',
        categoria: item.categoria || '',
        telefono: item.telefono || '',
        email: item.email || '',
        precioHora: Number(item.precio_hora) || 0,
        activo: item.activo ?? true
    };
}

export async function getPersonalPaginated(
    supabase: SupabaseClient,
    options: {
        page: number;
        pageSize: number;
        searchTerm?: string;
        departmentFilter?: string;
    }
) {
    const { page, pageSize, searchTerm, departmentFilter } = options;

    let query = supabase
        .from('personal')
        .select('*', { count: 'exact' });

    if (searchTerm) {
        query = query.or(`nombre.ilike.%${searchTerm}%,apellido1.ilike.%${searchTerm}%,apellido2.ilike.%${searchTerm}%`);
    }

    if (departmentFilter && departmentFilter !== 'all') {
        query = query.eq('departamento', departmentFilter);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
        .order('nombre', { ascending: true })
        .range(from, to);

    if (error) throw error;

    return {
        items: (data || []).map(mapPersonalFromDB),
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
    };
}
