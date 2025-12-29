-- RPC to get entregas list efficiently
-- Aggregates entregas with their briefing items.

CREATE OR REPLACE FUNCTION get_entregas_list(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH filtered_entregas AS (
    SELECT *
    FROM entregas
    WHERE (p_start_date IS NULL OR fecha_inicio >= p_start_date)
      AND (p_end_date IS NULL OR fecha_inicio <= p_end_date)
  ),
  entregas_with_briefings AS (
    SELECT 
      e.*,
      (
        SELECT jsonb_agg(item)
        FROM comercial_briefings b,
        jsonb_array_elements(b.items) AS item
        WHERE (b.os_id = e.numero_expediente OR b.os_id = e.id::text)
      ) as briefing_items
    FROM filtered_entregas e
  )
  SELECT jsonb_agg(eb) INTO v_result FROM entregas_with_briefings eb;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;
