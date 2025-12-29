-- RPC to get dashboard metrics efficiently
-- Aggregates events and services (briefing items with gastronomy) for a given date range.
-- Updated to use briefing dates and Max PAX logic.

CREATE OR REPLACE FUNCTION get_dashboard_metrics(
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_today_start timestamptz := date_trunc('day', now());
  v_today_end timestamptz := v_today_start + interval '1 day' - interval '1 microsecond';
BEGIN
  WITH expanded_briefings AS (
    SELECT 
      b.os_id,
      (item->>'fecha')::timestamptz as item_date,
      COALESCE((item->>'asistentes')::numeric, 0) as item_pax,
      COALESCE((item->>'conGastronomia')::boolean, false) as is_gastro,
      item as original_item
    FROM comercial_briefings b,
    jsonb_array_elements(b.items) AS item
    WHERE (item->>'fecha') IS NOT NULL
  ),
  filtered_briefings AS (
    SELECT 
      eb.*,
      e.id as event_id,
      e.numero_expediente,
      e.client,
      e.space,
      e.status,
      e.is_vip,
      e.final_client,
      e.responsables
    FROM expanded_briefings eb
    LEFT JOIN eventos e ON (eb.os_id = e.numero_expediente OR eb.os_id = e.id::text)
    WHERE eb.item_date >= p_start_date AND eb.item_date <= p_end_date
  ),
  -- Daily metrics per OS (for PAX calculation)
  daily_os_metrics AS (
    SELECT 
      date_trunc('day', item_date) as day,
      os_id,
      MAX(item_pax) as max_pax,
      COUNT(*) FILTER (WHERE is_gastro) as gastro_count
    FROM filtered_briefings
    GROUP BY 1, 2
  ),
  -- Today's metrics
  today_metrics AS (
    SELECT
      COUNT(DISTINCT os_id) as eventos_hoy,
      SUM(gastro_count) as servicios_hoy,
      SUM(max_pax) as pax_hoy
    FROM daily_os_metrics
    WHERE day = v_today_start
  ),
  -- Week's metrics
  week_metrics AS (
    SELECT
      COUNT(DISTINCT os_id) as eventos_semana,
      SUM(gastro_count) as servicios_semana,
      SUM(max_pax) as pax_semana
    FROM daily_os_metrics
  ),
  -- Lists for the dashboard
  today_events_list AS (
    SELECT DISTINCT ON (os_id)
      jsonb_build_object(
        'id', event_id,
        'numero_expediente', numero_expediente,
        'client', client,
        'space', space,
        'status', status,
        'is_vip', is_vip,
        'final_client', final_client,
        'responsables', responsables,
        'start_date', item_date,
        'asistentes', (SELECT max_pax FROM daily_os_metrics WHERE os_id = filtered_briefings.os_id AND day = v_today_start)
      ) as event_info
    FROM filtered_briefings
    WHERE date_trunc('day', item_date) = v_today_start
  ),
  today_services_list AS (
    SELECT 
      original_item || jsonb_build_object(
        'os_id', os_id,
        'numero_expediente', numero_expediente,
        'nombreEspacio', space,
        'client', client
      ) as service_info
    FROM filtered_briefings
    WHERE date_trunc('day', item_date) = v_today_start
    AND is_gastro = true
  ),
  week_events_list AS (
    SELECT DISTINCT ON (os_id, date_trunc('day', item_date))
      jsonb_build_object(
        'id', event_id,
        'numero_expediente', numero_expediente,
        'client', client,
        'space', space,
        'status', status,
        'is_vip', is_vip,
        'final_client', final_client,
        'responsables', responsables,
        'start_date', item_date,
        'asistentes', (SELECT max_pax FROM daily_os_metrics WHERE os_id = filtered_briefings.os_id AND day = date_trunc('day', item_date))
      ) as event_info
    FROM filtered_briefings
    ORDER BY os_id, date_trunc('day', item_date), item_date ASC
  ),
  week_services_list AS (
    SELECT 
      original_item || jsonb_build_object(
        'os_id', os_id,
        'numero_expediente', numero_expediente,
        'nombreEspacio', space,
        'client', client
      ) as service_info
    FROM filtered_briefings
    WHERE is_gastro = true
  )
  SELECT jsonb_build_object(
    'eventosHoy', COALESCE((SELECT eventos_hoy FROM today_metrics), 0),
    'serviciosHoy', COALESCE((SELECT servicios_hoy FROM today_metrics), 0),
    'paxHoy', COALESCE((SELECT pax_hoy FROM today_metrics), 0),
    'eventosSemana', COALESCE((SELECT eventos_semana FROM week_metrics), 0),
    'serviciosSemana', COALESCE((SELECT servicios_semana FROM week_metrics), 0),
    'paxSemana', COALESCE((SELECT pax_semana FROM week_metrics), 0),
    'eventosHoyList', COALESCE((SELECT jsonb_agg(event_info) FROM today_events_list), '[]'::jsonb),
    'serviciosHoyList', COALESCE((SELECT jsonb_agg(service_info) FROM today_services_list), '[]'::jsonb),
    'eventosSemanaList', COALESCE((SELECT jsonb_agg(event_info) FROM week_events_list), '[]'::jsonb),
    'serviciosSemanaList', COALESCE((SELECT jsonb_agg(service_info) FROM week_services_list), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
