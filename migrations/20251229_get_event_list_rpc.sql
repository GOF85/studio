-- RPC para obtener el listado de eventos (PES) con filtros y paginación eficiente
-- Este RPC reduce drásticamente la carga de datos al cliente

CREATE OR REPLACE FUNCTION get_event_list(
    p_search TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_time_filter TEXT DEFAULT 'all',
    p_show_past BOOLEAN DEFAULT FALSE,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_today DATE := CURRENT_DATE;
    v_total_count INTEGER;
BEGIN
    -- Primero contamos el total con filtros (sin paginación)
    SELECT count(*) INTO v_total_count
    FROM eventos e
    WHERE 
        (
            p_search IS NULL OR 
            p_search = '' OR 
            e.numero_expediente ILIKE '%' || p_search || '%' OR 
            e.client ILIKE '%' || p_search || '%' OR 
            e.final_client ILIKE '%' || p_search || '%' OR
            e.space ILIKE '%' || p_search || '%'
        )
        AND (
            p_status IS NULL OR 
            p_status = 'all' OR 
            e.status = p_status
        )
        AND (
            CASE 
                WHEN p_time_filter = 'today' THEN e.start_date::DATE = v_today
                WHEN p_time_filter = 'this_week' THEN date_trunc('week', e.start_date::DATE) = date_trunc('week', v_today)
                WHEN p_time_filter = 'next_week' THEN date_trunc('week', e.start_date::DATE) = date_trunc('week', v_today + interval '1 week')
                WHEN p_time_filter = 'future' THEN e.start_date::DATE >= v_today
                ELSE TRUE
            END
        )
        AND (p_show_past OR e.start_date::DATE >= v_today);

    WITH filtered_os AS (
        SELECT 
            e.*
        FROM eventos e
        WHERE 
            -- Filtro de búsqueda
            (
                p_search IS NULL OR 
                p_search = '' OR 
                e.numero_expediente ILIKE '%' || p_search || '%' OR 
                e.client ILIKE '%' || p_search || '%' OR 
                e.final_client ILIKE '%' || p_search || '%' OR
                e.space ILIKE '%' || p_search || '%'
            )
            -- Filtro de estado
            AND (
                p_status IS NULL OR 
                p_status = 'all' OR 
                e.status = p_status
            )
            -- Filtro de tiempo
            AND (
                CASE 
                    WHEN p_time_filter = 'today' THEN e.start_date::DATE = v_today
                    WHEN p_time_filter = 'this_week' THEN date_trunc('week', e.start_date::DATE) = date_trunc('week', v_today)
                    WHEN p_time_filter = 'next_week' THEN date_trunc('week', e.start_date::DATE) = date_trunc('week', v_today + interval '1 week')
                    WHEN p_time_filter = 'future' THEN e.start_date::DATE >= v_today
                    ELSE TRUE
                END
            )
            -- Filtro de pasados
            AND (p_show_past OR e.start_date::DATE >= v_today)
        ORDER BY e.start_date ASC
        LIMIT p_limit
        OFFSET p_offset
    ),
    briefings_data AS (
        SELECT 
            f.id as os_uuid,
            (jsonb_agg(b.*) -> 0) as briefing
        FROM filtered_os f
        JOIN comercial_briefings b ON (b.os_id = f.numero_expediente OR b.os_id = f.id::text)
        GROUP BY f.id
    )
    SELECT 
        jsonb_build_object(
            'events', COALESCE((
                SELECT jsonb_agg(
                    jsonb_set(
                        to_jsonb(f.*),
                        '{briefing}',
                        COALESCE(bd.briefing, 'null'::jsonb)
                    )
                )
                FROM filtered_os f
                LEFT JOIN briefings_data bd ON f.id = bd.os_uuid
            ), '[]'::jsonb),
            'total_count', v_total_count
        ) INTO v_result;

    RETURN v_result;
END;
$$;
