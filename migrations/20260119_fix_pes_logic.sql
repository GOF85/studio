-- FIX PES LOGIC: Order by ASC and improve TODAY boundary
-- Date: 2026-01-19

CREATE OR REPLACE FUNCTION get_event_list(
    p_search TEXT DEFAULT NULL,
    p_status TEXT DEFAULT 'all',
    p_time_filter TEXT DEFAULT 'all',
    p_show_past BOOLEAN DEFAULT false,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    numero_expediente TEXT,
    client TEXT,
    status TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    asistentes INTEGER,
    is_vip BOOLEAN,
    space TEXT,
    comercial TEXT,
    briefing JSONB,
    total_count BIGINT
) AS $$
DECLARE
    v_today DATE := (timezone('Europe/Madrid', now()))::date;
BEGIN
    RETURN QUERY
    WITH filtered_events AS (
        SELECT 
            e.id,
            e.numero_expediente::TEXT,
            e.client::TEXT,
            e.status::TEXT,
            e.start_date,
            e.end_date,
            e.asistentes,
            e.is_vip,
            e.space::TEXT,
            e.comercial::TEXT
        FROM eventos e
        WHERE 
            -- Search Filter
            (p_search IS NULL OR p_search = '' OR 
             e.numero_expediente ILIKE '%' || p_search || '%' OR 
             e.client ILIKE '%' || p_search || '%' OR 
             e.space ILIKE '%' || p_search || '%')
            
            -- Status Filter
            AND (p_status = 'all' OR e.status ILIKE p_status)
            
            -- Show Past Filter: Timezone aware check
            AND (
                p_show_past OR 
                (timezone('Europe/Madrid', COALESCE(e.end_date, e.start_date))::date) >= v_today
            )
            
            -- Time Filter (implemented in DB for efficiency)
            AND (
                p_time_filter = 'all' OR
                (p_time_filter = 'today' AND (timezone('Europe/Madrid', e.start_date)::date) = v_today) OR
                (p_time_filter = 'this_week' AND date_trunc('week', (timezone('Europe/Madrid', e.start_date)::date)) = date_trunc('week', v_today)) OR
                (p_time_filter = 'next_week' AND date_trunc('week', (timezone('Europe/Madrid', e.start_date)::date)) = date_trunc('week', v_today + interval '1 week')) OR
                (p_time_filter = 'future' AND (timezone('Europe/Madrid', e.start_date)::date) >= v_today)
            )
    ),
    total_count_cte AS (
        SELECT COUNT(*) as total FROM filtered_events
    )
    SELECT 
        fe.id,
        fe.numero_expediente,
        fe.client,
        fe.status,
        fe.start_date,
        fe.end_date,
        fe.asistentes,
        fe.is_vip,
        fe.space,
        fe.comercial,
        (
            SELECT jsonb_build_object(
                'items', cb.items,
                'os_id', cb.os_id
            )
            FROM comercial_briefings cb
            WHERE cb.os_id = fe.id::text 
            OR cb.os_id = fe.numero_expediente
            ORDER BY (cb.os_id = fe.id::text) DESC
            LIMIT 1
        ) as briefing,
        tc.total
    FROM filtered_events fe
    CROSS JOIN total_count_cte tc
    -- SMART SORTING: 
    -- If showing future events: Soonest first (ASC)
    -- If showing past events: Most recent first (DESC)
    ORDER BY 
        CASE WHEN p_show_past THEN fe.start_date END DESC,
        CASE WHEN NOT p_show_past THEN fe.start_date END ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;
