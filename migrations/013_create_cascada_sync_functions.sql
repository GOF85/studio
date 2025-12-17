-- Migration: Create cascade synchronization functions
-- Purpose: Automatically recalculate recipe costs when ingredient/ERP prices change
-- Date: 2025-12-16

-- ============================================================================
-- HELPER FUNCTION: Get current price for an ingredient
-- ============================================================================
CREATE OR REPLACE FUNCTION get_ingredient_current_price(p_erp_id TEXT)
RETURNS DECIMAL(12,4) LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_price DECIMAL(12,4);
BEGIN
  SELECT precio INTO v_price
  FROM articulos_erp
  WHERE erp_id = p_erp_id
  LIMIT 1;
  
  RETURN COALESCE(v_price, 0);
END;
$$;

COMMENT ON FUNCTION get_ingredient_current_price(TEXT)
  IS 'Gets current calculated price for an ERP article.';

-- ============================================================================
-- FUNCTION: recalc_elaboracion_costos
-- ============================================================================
-- Recalculates unit cost of an elaboration by iterating components
CREATE OR REPLACE FUNCTION recalc_elaboracion_costos(p_elaboracion_id UUID)
RETURNS NUMERIC LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_elaboracion RECORD;
  v_total_coste NUMERIC := 0;
  v_cantidad_produccion NUMERIC;
  v_componente RECORD;
  v_ingrediente_coste DECIMAL(12,4);
  v_elaboracion_sub_coste NUMERIC;
BEGIN
  -- Get elaboration data
  SELECT id, produccion_total
  INTO v_elaboracion
  FROM elaboraciones
  WHERE id = p_elaboracion_id;

  IF v_elaboracion IS NULL THEN
    RAISE NOTICE 'Elaboracion not found: %', p_elaboracion_id;
    RETURN 0;
  END IF;

  v_cantidad_produccion := COALESCE(v_elaboracion.produccion_total, 1);

  -- Iterate over components from elaboracion_componentes table
  FOR v_componente IN
    SELECT tipo_componente, componente_id, cantidad_neta
    FROM elaboracion_componentes
    WHERE elaboracion_padre_id = p_elaboracion_id
  LOOP
    IF v_componente.tipo_componente = 'ARTICULO' THEN
      -- Get ingredient cost from ingredientes_internos + articulos_erp
      SELECT COALESCE(
        (SELECT precio 
         FROM articulos_erp 
         WHERE erp_id = ii.producto_erp_link_id 
         LIMIT 1),
        0
      ) INTO v_ingrediente_coste
      FROM ingredientes_internos ii
      WHERE ii.id = v_componente.componente_id
      LIMIT 1;

      IF v_ingrediente_coste > 0 THEN
        v_total_coste := v_total_coste + 
          (v_ingrediente_coste * COALESCE(v_componente.cantidad_neta, 0));
      END IF;
    ELSIF v_componente.tipo_componente = 'ELABORACION' THEN
      -- Recursive: get sub-elaboration cost
      v_elaboracion_sub_coste := recalc_elaboracion_costos(v_componente.componente_id);
      v_total_coste := v_total_coste + 
        (v_elaboracion_sub_coste * COALESCE(v_componente.cantidad_neta, 0));
    END IF;
  END LOOP;

  -- Return unit cost
  RETURN CASE 
    WHEN v_cantidad_produccion > 0 
    THEN ROUND(v_total_coste / v_cantidad_produccion, 4)
    ELSE 0
  END;
END;
$$;

COMMENT ON FUNCTION recalc_elaboracion_costos(UUID)
  IS 'Recalculates unit cost of elaboration by iterating components.';

-- ============================================================================
-- FUNCTION: recalc_receta_costos
-- ============================================================================
-- Drop existing function first (return type changed)
DROP FUNCTION IF EXISTS recalc_receta_costos(TEXT);

-- Recalculates recipe costs and records in historical table
CREATE OR REPLACE FUNCTION recalc_receta_costos(p_receta_id TEXT)
RETURNS TABLE (
  coste_materia_prima NUMERIC,
  margen_bruto NUMERIC,
  precio_venta_out NUMERIC,
  coste_total_produccion NUMERIC
) LANGUAGE plpgsql VOLATILE AS $$
DECLARE
  v_receta RECORD;
  v_elaboraciones JSONB;
  v_elaboracion RECORD;
  v_total_coste NUMERIC := 0;
  v_margen NUMERIC;
  v_precio_venta_local DECIMAL(12,4);
  v_coste_unitario NUMERIC;
  v_coste_total_produccion NUMERIC := 0;
  v_start_time TIMESTAMPTZ := CLOCK_TIMESTAMP();
  v_error_msg TEXT;
BEGIN
  -- Get recipe data
  SELECT r.id, r.precio_venta, r.elaboraciones
  INTO v_receta
  FROM recetas r
  WHERE r.id = p_receta_id;

  IF v_receta IS NULL THEN
    RAISE NOTICE 'Recipe not found: %', p_receta_id;
    RETURN;
  END IF;

  v_precio_venta_local := COALESCE(v_receta.precio_venta, 0);
  v_elaboraciones := COALESCE(v_receta.elaboraciones, '[]'::JSONB);

  -- Iterate over elaborations in JSON
  BEGIN
    FOR v_elaboracion IN
      SELECT elem
      FROM jsonb_array_elements(v_elaboraciones) AS elem
    LOOP
      BEGIN
        -- Call recalc function for each elaboration
        SELECT recalc_elaboracion_costos((v_elaboracion.elem->>'elaboracionId')::UUID)
        INTO v_coste_unitario;

        IF v_coste_unitario IS NOT NULL AND v_coste_unitario > 0 THEN
          v_total_coste := v_total_coste + 
            (v_coste_unitario * COALESCE((v_elaboracion.elem->>'cantidad')::NUMERIC, 0));
        END IF;
      EXCEPTION WHEN OTHERS THEN
        v_error_msg := SQLERRM;
        RAISE NOTICE 'Error processing elaboration % in recipe %: %',
          v_elaboracion.elem->>'elaboracionId', p_receta_id, v_error_msg;
      END;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error iterating elaborations of recipe %: %', 
      p_receta_id, SQLERRM;
  END;

  v_coste_total_produccion := v_total_coste;

  -- Calculate margin
  v_margen := CASE 
    WHEN v_precio_venta_local > 0 
    THEN ROUND(
      ((v_precio_venta_local - v_coste_total_produccion) / v_precio_venta_local) * 100, 2
    )
    ELSE 0
  END;

  -- Update recipes table with current costs
  UPDATE recetas
  SET 
    coste_materia_prima_actual = v_total_coste::DECIMAL(12,4),
    coste_materia_prima_fecha_actualizacion = NOW(),
    margen_bruto_actual = v_margen
  WHERE id = p_receta_id;

  -- Insert into historical table (upsert if already exists today)
  INSERT INTO coste_recetas_historico (
    receta_id, fecha, coste_materia_prima, 
    coste_total_produccion, precio_venta, margen_bruto
  )
  VALUES (
    p_receta_id,
    NOW(),
    v_total_coste::DECIMAL(12,4),
    v_coste_total_produccion::DECIMAL(12,4),
    v_precio_venta_local,
    v_margen
  )
  ON CONFLICT (receta_id, date_trunc_day(fecha)) DO UPDATE
  SET 
    coste_materia_prima = EXCLUDED.coste_materia_prima,
    coste_total_produccion = EXCLUDED.coste_total_produccion,
    precio_venta = EXCLUDED.precio_venta,
    margen_bruto = EXCLUDED.margen_bruto;

  RAISE NOTICE 'recalc_receta_costos(%): coste=%, margen=% in %ms',
    p_receta_id, v_total_coste, v_margen,
    ROUND(EXTRACT(EPOCH FROM (CLOCK_TIMESTAMP() - v_start_time)) * 1000);

  -- Return results
  RETURN QUERY
  SELECT 
    v_total_coste,
    v_margen,
    v_precio_venta_local::NUMERIC,
    v_coste_total_produccion;
END;
$$;

COMMENT ON FUNCTION recalc_receta_costos(TEXT)
  IS 'Recalculates costs and margins of a recipe. Records in historical table for analytics.';

-- ============================================================================
-- TRIGGER FUNCTION: on_articulos_erp_precio_change
-- ============================================================================
-- Triggers cascade update when ERP article price changes
CREATE OR REPLACE FUNCTION on_articulos_erp_precio_change()
RETURNS TRIGGER LANGUAGE plpgsql VOLATILE AS $$
DECLARE
  v_receta_record RECORD;
  v_cambio_porcentaje NUMERIC;
  v_start_time TIMESTAMPTZ := CLOCK_TIMESTAMP();
BEGIN
  -- Only process if price actually changed
  IF NEW.precio IS DISTINCT FROM OLD.precio THEN
    RAISE NOTICE 'Price changed for articulo_erp % (% → %)',
      NEW.erp_id, OLD.precio, NEW.precio;

    -- Calculate percentage change
    v_cambio_porcentaje := CASE 
      WHEN OLD.precio > 0
      THEN ROUND(
        ((NEW.precio - OLD.precio) / OLD.precio) * 100, 2
      )
      ELSE 0
    END;

    -- Register in ERP price history if not exists for today
    -- Note: Skip historical insert if unique constraint doesn't exist yet
    BEGIN
      INSERT INTO historico_precios_erp (articulo_erp_id, fecha, precio_calculado, variacion_porcentaje)
      VALUES (NEW.erp_id, NOW(), NEW.precio, v_cambio_porcentaje);
    EXCEPTION WHEN unique_violation THEN
      -- If already exists for today, update it
      UPDATE historico_precios_erp
      SET precio_calculado = NEW.precio,
          variacion_porcentaje = v_cambio_porcentaje
      WHERE articulo_erp_id = NEW.erp_id
        AND DATE(fecha) = CURRENT_DATE;
    END;

    -- Find all recipes that use ingredients from this ERP article and recalculate
    FOR v_receta_record IN
      SELECT DISTINCT r.id
      FROM recetas r, 
           jsonb_array_elements(r.elaboraciones) AS elem,
           ingredientes_internos ii
      WHERE ii.producto_erp_link_id = NEW.erp_id
      LIMIT 1000  -- Safety limit to avoid performance issues
    LOOP
      -- Recalculate recipe costs
      PERFORM recalc_receta_costos(v_receta_record.id);
    END LOOP;

    RAISE NOTICE 'on_articulos_erp_precio_change(%): cambio=% en %ms',
      NEW.erp_id, v_cambio_porcentaje,
      ROUND(EXTRACT(EPOCH FROM (CLOCK_TIMESTAMP() - v_start_time)) * 1000);
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION on_articulos_erp_precio_change()
  IS 'Trigger that cascades recalculation when ERP article price changes.';

-- Create trigger for UPDATE
DROP TRIGGER IF EXISTS articulos_erp_precio_change ON articulos_erp CASCADE;
CREATE TRIGGER articulos_erp_precio_change
AFTER UPDATE OF precio ON articulos_erp
FOR EACH ROW
EXECUTE FUNCTION on_articulos_erp_precio_change();

-- ============================================================================
-- TRIGGER FUNCTION: on_articulos_erp_insert
-- ============================================================================
-- Triggers cascade update when new ERP article is inserted
CREATE OR REPLACE FUNCTION on_articulos_erp_insert()
RETURNS TRIGGER LANGUAGE plpgsql VOLATILE AS $$
DECLARE
  v_receta_record RECORD;
  v_start_time TIMESTAMPTZ := CLOCK_TIMESTAMP();
BEGIN
  -- Only process if price is set
  IF NEW.precio > 0 THEN
    RAISE NOTICE 'New articulo_erp inserted: % with precio %',
      NEW.erp_id, NEW.precio;

    -- Register in ERP price history (initial record)
    BEGIN
      INSERT INTO historico_precios_erp (articulo_erp_id, fecha, precio_calculado, variacion_porcentaje)
      VALUES (NEW.erp_id, NOW(), NEW.precio, 0);
    EXCEPTION WHEN unique_violation THEN
      -- Already exists, skip
      NULL;
    END;

    -- Find all recipes that use ingredients from this ERP article and recalculate
    FOR v_receta_record IN
      SELECT DISTINCT r.id
      FROM recetas r, 
           jsonb_array_elements(r.elaboraciones) AS elem,
           ingredientes_internos ii
      WHERE ii.producto_erp_link_id = NEW.erp_id
      LIMIT 1000
    LOOP
      -- Recalculate recipe costs
      PERFORM recalc_receta_costos(v_receta_record.id);
    END LOOP;

    RAISE NOTICE 'on_articulos_erp_insert(%): processed in %ms',
      NEW.erp_id,
      ROUND(EXTRACT(EPOCH FROM (CLOCK_TIMESTAMP() - v_start_time)) * 1000);
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION on_articulos_erp_insert()
  IS 'Trigger that cascades recalculation when new ERP article is inserted.';

-- Create trigger for INSERT
DROP TRIGGER IF EXISTS articulos_erp_insert ON articulos_erp CASCADE;
CREATE TRIGGER articulos_erp_insert
AFTER INSERT ON articulos_erp
FOR EACH ROW
EXECUTE FUNCTION on_articulos_erp_insert();

-- ============================================================================
-- FUNCTION: recalc_all_recipes
-- ============================================================================
-- Manually trigger recalculation of all recipes (for admin operations)
CREATE OR REPLACE FUNCTION recalc_all_recipes()
RETURNS TABLE (
  receta_id TEXT,
  nombre TEXT,
  coste NUMERIC,
  margen NUMERIC
) LANGUAGE plpgsql VOLATILE AS $$
DECLARE
  v_receta_record RECORD;
  v_coste NUMERIC;
  v_margen NUMERIC;
BEGIN
  FOR v_receta_record IN
    SELECT id, nombre FROM recetas WHERE is_archived = FALSE LIMIT 1000
  LOOP
    -- Recalculate
    PERFORM recalc_receta_costos(v_receta_record.id);
    
    -- Return results
    SELECT coste_materia_prima_actual, margen_bruto_actual INTO v_coste, v_margen
    FROM recetas WHERE id = v_receta_record.id;
    
    RETURN QUERY SELECT v_receta_record.id, v_receta_record.nombre, v_coste, v_margen;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION recalc_all_recipes()
  IS 'Admin function to recalculate all active recipes. Use cautiously on large datasets.';
