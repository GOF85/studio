import { SupabaseClient } from '@supabase/supabase-js';
import type { Proveedor } from '@/types';

export function mapProveedorFromDB(p: any): Proveedor {
    return {
        id: p.id,
        nombreComercial: p.nombre_comercial,
        nombreFiscal: p.nombre_fiscal,
        cif: p.cif || '',
        IdERP: p.id_erp || '',
        direccionFacturacion: p.direccion_facturacion || '',
        codigoPostal: p.codigo_postal || '',
        ciudad: p.ciudad || '',
        provincia: p.provincia || '',
        pais: p.pais || 'España',
        emailContacto: p.email_contacto || '',
        telefonoContacto: p.telefono_contacto || '',
        contacto: p.contacto || '',
        iban: p.iban || '',
        formaDePagoHabitual: p.forma_de_pago_habitual || '',
    };
}

export async function getProveedoresPaginated(
    supabase: SupabaseClient,
    options: {
        page: number;
        pageSize: number;
        searchTerm?: string;
    }
) {
    const { page, pageSize, searchTerm } = options;

    let query = supabase
        .from('proveedores')
        .select('*', { count: 'exact' });

    if (searchTerm) {
        // Buscar por nombre comercial, nombre fiscal, CIF, id_erp e id
        query = query.or(`nombre_comercial.ilike.%${searchTerm}%,nombre_fiscal.ilike.%${searchTerm}%,cif.ilike.%${searchTerm}%,id_erp.ilike.%${searchTerm}%,id.eq.${searchTerm}`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
        .order('nombre_comercial')
        .range(from, to);

    if (error) throw error;

    return {
        items: (data || []).map(mapProveedorFromDB),
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
    };
}
