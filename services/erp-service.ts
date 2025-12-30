import { SupabaseClient } from '@supabase/supabase-js';
import type { ArticuloERP } from '@/types';

export function mapArticuloERPFromDB(item: any): ArticuloERP {
    const precioCompra = Number(item.precio_compra) || 0;
    const descuento = Number(item.descuento) || 0;
    const unidadConversion = Number(item.unidad_conversion) || 1;
    const precioConDescuento = precioCompra * (1 - (descuento / 100));
    const precioFinal = unidadConversion > 0 ? precioConDescuento / unidadConversion : 0;

    return {
        id: item.id,
        idreferenciaerp: item.idreferenciaerp,
        idProveedor: item.id_proveedor,
        nombreProveedor: item.nombre_proveedor,
        nombreProductoERP: item.nombre_producto_erp,
        referenciaProveedor: item.referencia_proveedor,
        familiaCategoria: item.familia_categoria,
        precioCompra: precioCompra,
        descuento: descuento,
        unidadConversion: unidadConversion,
        precioAlquiler: Number(item.precio_alquiler) || 0,
        unidad: item.unidad,
        tipo: item.tipo,
        categoriaMice: item.categoria_mice,
        alquiler: item.alquiler,
        observaciones: item.observaciones,
        precio: precioFinal
    };
}

export async function getArticulosERPPaginated(
    supabase: SupabaseClient,
    options: {
        page: number;
        pageSize: number;
        searchTerm?: string;
        typeFilter?: string;
        providerFilter?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }
) {
    const {
        page,
        pageSize,
        searchTerm,
        typeFilter,
        providerFilter,
        sortBy = 'nombre_producto_erp',
        sortOrder = 'asc'
    } = options;

    const { data, error } = await supabase.rpc('get_articulos_erp_paginated', {
        p_page: page,
        p_page_size: pageSize,
        p_search_term: searchTerm || null,
        p_type_filter: typeFilter || null,
        p_provider_filter: providerFilter || null,
        p_sort_by: sortBy,
        p_sort_order: sortOrder
    });

    if (error) throw error;

    const result = data?.[0] || { items: [], total_count: 0 };

    return {
        items: (result.items || []).map(mapArticuloERPFromDB),
        totalCount: Number(result.total_count || 0)
    };
}
