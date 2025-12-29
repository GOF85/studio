-- Fix get_calendar_events to use briefing dates for filtering
-- This ensures events with services in the range are shown even if their start/end dates are outside.

CREATE OR REPLACE FUNCTION get_calendar_events(
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH event_with_dates AS (
    SELECT 
      e.id, 
      e.start_date, 
      e.end_date,
      e.asistentes, 
      e.numero_expediente, 
      e.space, 
      e.client,
      e.status,
      e.final_client,
      e.responsables,
      COALESCE(
        (
          SELECT MIN((item->>'fecha')::timestamptz) 
          FROM comercial_briefings b, jsonb_array_elements(b.items) as item 
          WHERE (b.os_id = e.numero_expediente OR b.os_id = e.id::text)
          AND (item->>'fecha') IS NOT NULL
        ),
        e.start_date
      ) as effective_start,
      COALESCE(
        (
          SELECT MAX((item->>'fecha')::timestamptz) 
          FROM comercial_briefings b, jsonb_array_elements(b.items) as item 
          WHERE (b.os_id = e.numero_expediente OR b.os_id = e.id::text)
          AND (item->>'fecha') IS NOT NULL
        ),
        e.end_date,
        e.start_date
      ) as effective_end
    FROM eventos e
  ),
  filtered_events AS (
    SELECT 
      id, start_date, end_date, asistentes, numero_expediente, space, client, status, final_client, responsables
    FROM event_with_dates
    WHERE effective_start <= p_end_date AND effective_end >= p_start_date
  ),
  event_briefings AS (
    SELECT DISTINCT ON (f.id)
      f.id as os_id,
      b.items
    FROM filtered_events f
    JOIN comercial_briefings b ON (b.os_id = f.numero_expediente OR b.os_id = f.id::text)
  )
  SELECT jsonb_build_object(
    'events', (SELECT COALESCE(jsonb_agg(fe), '[]'::jsonb) FROM filtered_events fe),
    'briefings', (SELECT COALESCE(jsonb_agg(eb), '[]'::jsonb) FROM event_briefings eb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
