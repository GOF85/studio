-- RPC para obtener artículos paginados con filtros
CREATE OR REPLACE FUNCTION get_articulos_paginated(
  p_page int,
  p_page_size int,
  p_search_term text DEFAULT NULL,
  p_category_filter text DEFAULT NULL,
  p_department_filter text DEFAULT NULL,
  p_is_partner_filter boolean DEFAULT NULL,
  p_tipo_articulo text DEFAULT NULL,
  p_sort_by text DEFAULT 'nombre',
  p_sort_order text DEFAULT 'asc'
)
RETURNS TABLE (
  items jsonb,
  total_count bigint
) AS $$
DECLARE
  v_offset int;
  v_query text;
  v_where text := '1=1';
BEGIN
  v_offset := p_page * p_page_size;

  -- Build WHERE clause
  IF p_search_term IS NOT NULL AND p_search_term <> '' THEN
    IF p_tipo_articulo = 'entregas' THEN
      v_where := v_where || format(' AND (nombre ILIKE %L OR id::text ILIKE %L OR referencia_articulo_entregas ILIKE %L)', 
        '%' || p_search_term || '%', '%' || p_search_term || '%', '%' || p_search_term || '%');
    ELSE
      v_where := v_where || format(' AND (nombre ILIKE %L OR id::text ILIKE %L)', 
        '%' || p_search_term || '%', '%' || p_search_term || '%');
    END IF;
  END IF;

  IF p_category_filter IS NOT NULL AND p_category_filter <> 'all' THEN
    v_where := v_where || format(' AND categoria = %L', p_category_filter);
  END IF;

  IF p_department_filter IS NOT NULL AND p_department_filter <> 'all' THEN
    v_where := v_where || format(' AND dpt_entregas = %L', p_department_filter);
  END IF;

  IF p_is_partner_filter IS NOT NULL THEN
    v_where := v_where || format(' AND producido_por_partner = %L', p_is_partner_filter);
  END IF;

  IF p_tipo_articulo IS NOT NULL THEN
    v_where := v_where || format(' AND tipo_articulo = %L', p_tipo_articulo);
  END IF;

  -- Execute query for items and total count
  RETURN QUERY
  EXECUTE format('
    WITH filtered_articulos AS (
      SELECT * FROM articulos WHERE %s
    ),
    paginated_items AS (
      SELECT jsonb_agg(t) FROM (
        SELECT * FROM filtered_articulos
        ORDER BY %I %s
        LIMIT %L OFFSET %L
      ) t
    )
    SELECT 
      COALESCE((SELECT * FROM paginated_items), ''[]''::jsonb),
      (SELECT count(*) FROM filtered_articulos)',
    v_where, p_sort_by, p_sort_order, p_page_size, v_offset
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
