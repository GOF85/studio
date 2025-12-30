-- FINAL FIX FOR PES AND CALENDAR DASHBOARDS (2025-12-30)
-- This file consolidates the fixes for get_event_list and get_calendar_events

-- 1. FIX FOR PES (get_event_list)
DROP FUNCTION IF EXISTS get_event_list(text,text,text,boolean,integer,integer);
DROP FUNCTION IF EXISTS get_event_list(text,text,date,date,integer,integer);

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
            (p_search IS NULL OR 
             e.numero_expediente ILIKE '%' || p_search || '%' OR 
             e.client ILIKE '%' || p_search || '%' OR 
             e.space ILIKE '%' || p_search || '%')
            AND (p_status = 'all' OR e.status ILIKE p_status)
            AND (
                p_show_past OR 
                e.end_date >= CURRENT_DATE OR 
                e.start_date >= CURRENT_DATE
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
    ORDER BY fe.start_date DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- 2. FIX FOR CALENDAR (get_calendar_events)
DROP FUNCTION IF EXISTS get_calendar_events(timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION get_calendar_events(
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS TABLE (
  id uuid,
  numero_expediente text,
  start_date timestamptz,
  end_date timestamptz,
  asistentes integer,
  space text,
  client text,
  status text,
  final_client text,
  responsables jsonb,
  is_vip boolean,
  comercial text,
  comercial_phone text,
  comercial_mail text,
  space_address text,
  space_contact text,
  space_phone text,
  space_mail text,
  briefing_items jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id::uuid, 
    e.numero_expediente::text,
    e.start_date::timestamptz, 
    e.end_date::timestamptz,
    COALESCE(e.asistentes, 0)::integer, 
    e.space::text, 
    e.client::text, 
    e.status::text, 
    e.final_client::text, 
    COALESCE(e.responsables, '{}'::jsonb)::jsonb, 
    COALESCE(e.is_vip, false)::boolean, 
    e.comercial::text, 
    e.comercial_phone::text, 
    e.comercial_mail::text, 
    e.space_address::text, 
    e.space_contact::text, 
    e.space_phone::text, 
    e.space_mail::text, 
    COALESCE(b.items, '[]'::jsonb)::jsonb as briefing_items
  FROM eventos e
  LEFT JOIN LATERAL (
    SELECT cb.items
    FROM comercial_briefings cb
    WHERE cb.os_id = e.id::text OR cb.os_id = e.numero_expediente
    ORDER BY (cb.os_id = e.id::text) DESC
    LIMIT 1
  ) b ON true
  WHERE e.start_date <= p_end_date 
    AND COALESCE(e.end_date, e.start_date) >= p_start_date;
END;
$$;
