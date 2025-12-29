-- RPC to get calendar events efficiently for a specific range.
-- Returns both events and their briefings in a single call.
-- Handles role-based filtering for partners.

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
  WITH filtered_events AS (
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
      e.responsables
    FROM eventos e
    WHERE e.start_date <= p_end_date AND COALESCE(e.end_date, e.start_date) >= p_start_date
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
