-- RPC to get counts for all main database tables in a single call
-- This avoids loading entire tables just to show a counter in the UI.

CREATE OR REPLACE FUNCTION public.get_database_counts()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'personal', (SELECT count(*) FROM personal),
        'espacios', (SELECT count(*) FROM espacios),
        'articulos_mice', (SELECT count(*) FROM articulos WHERE tipo_articulo = 'micecatering'),
        'articulos_entregas', (SELECT count(*) FROM articulos WHERE tipo_articulo = 'entregas'),
        'tipos_servicio', (SELECT count(*) FROM tipos_servicio),
        'articulos_erp', (SELECT count(*) FROM articulos_erp),
        'familias_erp', (SELECT count(*) FROM familias_erp),
        'plantillas_pedidos', (SELECT count(*) FROM plantillas_pedidos),
        'formatos_expedicion', (SELECT count(*) FROM formatos_expedicion),
        'proveedores', (SELECT count(*) FROM proveedores),
        'tipos_personal', (SELECT count(*) FROM tipos_personal),
        'personal_externo', (SELECT count(*) FROM personal_externo),
        'tipos_transporte', (SELECT count(*) FROM tipos_transporte),
        'objetivos_gasto', (SELECT count(*) FROM objetivos_gasto_plantillas),
        'categorias_recetas', (SELECT count(*) FROM categorias_recetas),
        'cpr_costes_fijos', (SELECT count(*) FROM cpr_costes_fijos),
        'cpr_objetivos', (SELECT count(*) FROM cpr_objetivos),
        'decoracion', (SELECT count(*) FROM decoracion_catalogo),
        'atipicos', (SELECT count(*) FROM atipicos_catalogo),
        'eventos', (SELECT count(*) FROM eventos)
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_database_counts TO anon, authenticated, service_role;
