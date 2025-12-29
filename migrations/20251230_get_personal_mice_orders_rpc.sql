-- RPC to get personal mice orders with event data efficiently

CREATE OR REPLACE FUNCTION get_personal_mice_orders_list(p_os_id text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH orders_with_events AS (
    SELECT 
      o.*,
      e.numero_expediente as "serviceNumber",
      e.start_date as "startDate",
      e.client as "eventClient",
      e.space as "eventSpace"
    FROM personal_mice_orders o
    LEFT JOIN eventos e ON (o.os_id = e.id::text OR o.os_id = e.numero_expediente)
    WHERE (p_os_id IS NULL OR o.os_id = p_os_id)
  )
  SELECT jsonb_agg(owe) INTO v_result FROM orders_with_events owe;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;
