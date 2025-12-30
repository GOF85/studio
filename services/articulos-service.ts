import { SupabaseClient } from '@supabase/supabase-js';
import type { ArticuloCatering } from '@/types';
import { normalizeCategoria } from '@/lib/utils';

export function mapArticuloFromDB(item: any): ArticuloCatering {
    const isEntrega = item.tipo_articulo === 'entregas';
    const parsedPack = Array.isArray(item.pack) ? item.pack : (typeof item.pack === 'string' && item.pack ? JSON.parse(item.pack) : []);
    
    return {
        id: item.id,
        erpId: item.erp_id,
        nombre: item.nombre,
        categoria: isEntrega ? item.categoria : normalizeCategoria(item.categoria) as any,
        familia: item.familia,
        esHabitual: item.es_habitual,
        precioVenta: item.precio_venta,
        precioAlquiler: item.precio_alquiler,
        precioReposicion: item.precio_reposicion,
        unidadVenta: item.unidad_venta,
        stockSeguridad: item.stock_seguridad,
        tipo: item.tipo,
        loc: item.loc,
        imagen: item.imagen,
        producidoPorPartner: item.producido_por_partner,
        partnerId: item.partner_id,
        recetaId: item.receta_id,
        subcategoria: item.subcategoria,
        tipoArticulo: item.tipo_articulo,
        referenciaArticuloEntregas: item.referencia_articulo_entregas,
        dptEntregas: item.dpt_entregas,
        precioCoste: item.precio_coste,
        precioCosteAlquiler: item.precio_coste_alquiler,
        precioVentaEntregas: item.precio_venta_entregas,
        precioVentaEntregasIfema: item.precio_venta_entregas_ifema,
        precioAlquilerIfema: item.precio_alquiler_ifema,
        precioVentaIfema: item.precio_venta_ifema,
        precioAlquilerEntregas: item.precio_alquiler_entregas,
        // Compatibility with ProductoVenta
        pvp: isEntrega ? (item.precio_venta_entregas || 0) : (item.precio_venta || 0),
        pvpIfema: isEntrega ? (item.precio_venta_entregas_ifema || 0) : (item.precio_venta_ifema || 0),
        iva: item.iva,
        docDriveUrl: item.doc_drive_url,
        alergenos: item.alergenos || [],
        imagenes: item.imagenes || [],
        packs: parsedPack,
        pack: parsedPack,
        audit: item.audit || [],
        createdAt: item.created_at,
    } as any;
}

export async function getArticulosPaginated(
    supabase: SupabaseClient,
    options: {
        page: number;
        pageSize: number;
        searchTerm?: string;
        categoryFilter?: string;
        departmentFilter?: string;
        isPartnerFilter?: boolean;
        tipoArticulo?: 'micecatering' | 'entregas';
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }
) {
    const {
        page,
        pageSize,
        searchTerm,
        categoryFilter,
        departmentFilter,
        isPartnerFilter,
        tipoArticulo,
        sortBy = 'nombre',
        sortOrder = 'asc'
    } = options;

    const { data, error } = await supabase.rpc('get_articulos_paginated', {
        p_page: page,
        p_page_size: pageSize,
        p_search_term: searchTerm || null,
        p_category_filter: categoryFilter || null,
        p_department_filter: departmentFilter || null,
        p_is_partner_filter: isPartnerFilter ?? null,
        p_tipo_articulo: tipoArticulo || null,
        p_sort_by: sortBy,
        p_sort_order: sortOrder
    });

    if (error) throw error;

    // The RPC returns a single row with { items: jsonb, total_count: bigint }
    // But Supabase rpc returns an array of rows.
    const result = data?.[0] || { items: [], total_count: 0 };

    return {
        items: (result.items || []).map(mapArticuloFromDB),
        totalCount: Number(result.total_count || 0)
    };
}
