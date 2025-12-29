-- RPC to get dashboard metrics efficiently
-- Aggregates events and services (briefing items with gastronomy) for a given date range.

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
  WITH all_week_events AS (
    SELECT id, start_date, end_date, asistentes, numero_expediente, space, client, final_client, status, responsables
    FROM eventos
    WHERE start_date >= p_start_date AND start_date <= p_end_date
  ),
  week_briefings AS (
    SELECT os_id, items
    FROM comercial_briefings
    WHERE os_id IN (SELECT numero_expediente FROM all_week_events)
  ),
  expanded_items AS (
    SELECT 
      b.os_id,
      e.numero_expediente,
      e.space as "nombreEspacio",
      e.start_date,
      item || jsonb_build_object(
        'os_id', b.os_id, 
        'numero_expediente', e.numero_expediente, 
        'nombreEspacio', e.space,
        'client', e.client
      ) as service_data
    FROM week_briefings b
    JOIN all_week_events e ON e.numero_expediente = b.os_id,
    jsonb_array_elements(b.items) AS item
    WHERE (item->>'conGastronomia')::boolean = true
  ),
  week_events AS (
    SELECT * FROM all_week_events
  ),
  today_events AS (
    SELECT * FROM week_events WHERE start_date >= v_today_start AND start_date <= v_today_end
  ),
  today_services AS (
    SELECT service_data FROM expanded_items WHERE start_date >= v_today_start AND start_date <= v_today_end
  ),
  metrics_cte AS (
    SELECT
      (SELECT COUNT(*) FROM today_events) as "eventosHoy",
      (SELECT COUNT(*) FROM today_services) as "serviciosHoy",
      (SELECT COALESCE(SUM((service_data->>'asistentes')::numeric), 0) FROM today_services) as "paxHoy",
      (SELECT COUNT(*) FROM week_events) as "eventosSemana",
      (SELECT COUNT(*) FROM expanded_items) as "serviciosSemana",
      (SELECT COALESCE(SUM((service_data->>'asistentes')::numeric), 0) FROM expanded_items) as "paxSemana",
      (SELECT COALESCE(jsonb_agg(te), '[]'::jsonb) FROM today_events te) as "eventosHoyList",
      (SELECT COALESCE(jsonb_agg(ts.service_data), '[]'::jsonb) FROM today_services ts) as "serviciosHoyList",
      (SELECT COALESCE(jsonb_agg(we), '[]'::jsonb) FROM week_events we) as "eventosSemanaList",
      (SELECT COALESCE(jsonb_agg(ei.service_data), '[]'::jsonb) FROM expanded_items ei) as "serviciosSemanaList"
  )
  SELECT to_jsonb(m) INTO v_result FROM metrics_cte m;
  
  RETURN v_result;
END;
$$;
