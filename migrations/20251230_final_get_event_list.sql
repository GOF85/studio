-- Final get_event_list: Clean version with full functionality
-- This version removes all debug info and consolidates the briefing-driven date logic.

-- 1. Aggressive cleanup of any previous versions
DO $$
DECLARE
    _func_signature text;
BEGIN
    FOR _func_signature IN (
        SELECT format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid))
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE p.proname IN ('get_event_list', 'get_event_list_v2', 'get_event_list_v3')
          AND n.nspname = 'public'
    ) LOOP
        EXECUTE 'DROP FUNCTION ' || _func_signature;
    END LOOP;
END $$;

-- 2. Create the definitive function
CREATE OR REPLACE FUNCTION public.get_event_list(
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
    WITH event_with_dates AS (
        SELECT 
            e.*,
            COALESCE(
                (
                    SELECT MIN((item->>'fecha')::DATE) 
                    FROM comercial_briefings b, jsonb_array_elements(b.items) as item 
                    WHERE (b.os_id = e.numero_expediente OR b.os_id = e.id::text)
                    AND (item->>'fecha') IS NOT NULL
                ),
                e.start_date::DATE
            ) as eff_start,
            COALESCE(
                (
                    SELECT MAX((item->>'fecha')::DATE) 
                    FROM comercial_briefings b, jsonb_array_elements(b.items) as item 
                    WHERE (b.os_id = e.numero_expediente OR b.os_id = e.id::text)
                    AND (item->>'fecha') IS NOT NULL
                ),
                e.end_date::DATE,
                e.start_date::DATE
            ) as eff_end
        FROM eventos e
    ),
    filtered_events AS (
        SELECT *
        FROM event_with_dates
        WHERE 
            -- Search filter
            (
                p_search IS NULL OR 
                p_search = '' OR 
                COALESCE(numero_expediente, '') ILIKE '%' || p_search || '%' OR 
                COALESCE(client, '') ILIKE '%' || p_search || '%' OR 
                COALESCE(final_client, '') ILIKE '%' || p_search || '%' OR
                COALESCE(space, '') ILIKE '%' || p_search || '%'
            )
            -- Status filter
            AND (
                p_status IS NULL OR 
                p_status = 'all' OR 
                status = p_status
            )
            -- Time filter
            AND (
                CASE 
                    WHEN p_time_filter = 'today' THEN v_today BETWEEN eff_start AND eff_end
                    WHEN p_time_filter = 'this_week' THEN 
                        eff_start <= (date_trunc('week', v_today) + interval '6 days')::DATE AND
                        eff_end >= date_trunc('week', v_today)::DATE
                    WHEN p_time_filter = 'next_week' THEN 
                        eff_start <= (date_trunc('week', v_today + interval '7 days') + interval '6 days')::DATE AND
                        eff_end >= date_trunc('week', v_today + interval '7 days')::DATE
                    ELSE TRUE
                END
            )
            -- Past events filter
            AND (p_show_past OR eff_end >= v_today OR eff_end IS NULL)
    )
    SELECT count(*) INTO v_total_count FROM filtered_events;

    SELECT 
        jsonb_build_object(
            'events', COALESCE((
                SELECT jsonb_agg(fe)
                FROM (
                    SELECT 
                        f.*,
                        (
                            SELECT (jsonb_agg(b.*) -> 0)
                            FROM comercial_briefings b
                            WHERE (b.os_id = f.numero_expediente OR b.os_id = f.id::text)
                        ) as briefing
                    FROM filtered_events f
                    ORDER BY eff_start ASC NULLS LAST, id ASC
                    LIMIT p_limit
                    OFFSET p_offset
                ) fe
            ), '[]'::jsonb),
            'total_count', v_total_count
        ) INTO v_result;

    RETURN v_result;
END;
$$;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION public.get_event_list TO anon, authenticated, service_role;
