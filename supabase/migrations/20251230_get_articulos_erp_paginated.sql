-- RPC to get ERP articles with pagination and filtering
CREATE OR REPLACE FUNCTION get_articulos_erp_paginated(
    p_page int,
    p_page_size int,
    p_search_term text DEFAULT NULL,
    p_type_filter text DEFAULT NULL,
    p_provider_filter text DEFAULT NULL,
    p_sort_by text DEFAULT 'nombre_producto_erp',
    p_sort_order text DEFAULT 'asc'
)
RETURNS TABLE (
    items jsonb,
    total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_offset int;
    v_total_count bigint;
    v_items jsonb;
    v_query text;
BEGIN
    v_offset := p_page * p_page_size;

    -- Base query for counting
    v_query := 'SELECT count(*) FROM articulos_erp WHERE true';
    
    IF p_search_term IS NOT NULL AND p_search_term <> '' THEN
        v_query := v_query || ' AND (nombre_producto_erp ILIKE ' || quote_literal('%' || p_search_term || '%') || 
                   ' OR idreferenciaerp ILIKE ' || quote_literal('%' || p_search_term || '%') || ')';
    END IF;

    IF p_type_filter IS NOT NULL AND p_type_filter <> 'all' THEN
        v_query := v_query || ' AND tipo = ' || quote_literal(p_type_filter);
    END IF;

    IF p_provider_filter IS NOT NULL AND p_provider_filter <> 'all' THEN
        v_query := v_query || ' AND nombre_proveedor = ' || quote_literal(p_provider_filter);
    END IF;

    EXECUTE v_query INTO v_total_count;

    -- Base query for items
    v_query := 'SELECT jsonb_agg(t) FROM (
        SELECT * FROM articulos_erp WHERE true';

    IF p_search_term IS NOT NULL AND p_search_term <> '' THEN
        v_query := v_query || ' AND (nombre_producto_erp ILIKE ' || quote_literal('%' || p_search_term || '%') || 
                   ' OR idreferenciaerp ILIKE ' || quote_literal('%' || p_search_term || '%') || ')';
    END IF;

    IF p_type_filter IS NOT NULL AND p_type_filter <> 'all' THEN
        v_query := v_query || ' AND tipo = ' || quote_literal(p_type_filter);
    END IF;

    IF p_provider_filter IS NOT NULL AND p_provider_filter <> 'all' THEN
        v_query := v_query || ' AND nombre_proveedor = ' || quote_literal(p_provider_filter);
    END IF;

    -- Add ordering
    v_query := v_query || ' ORDER BY ' || quote_ident(p_sort_by) || ' ' || p_sort_order;

    -- Add pagination
    v_query := v_query || ' LIMIT ' || p_page_size || ' OFFSET ' || v_offset;
    v_query := v_query || ') t';

    EXECUTE v_query INTO v_items;

    RETURN QUERY SELECT COALESCE(v_items, '[]'::jsonb), v_total_count;
END;
$$;
