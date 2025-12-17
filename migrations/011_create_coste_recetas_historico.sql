-- Migration: Create coste_recetas_historico table
-- Purpose: Track historical costs and margins for recipes over time
-- Date: 2025-12-16

-- Create immutable function for date truncation (required for index)
CREATE OR REPLACE FUNCTION date_trunc_day(ts TIMESTAMPTZ) 
RETURNS DATE AS $$
  SELECT DATE_TRUNC('day', ts)::DATE
$$ LANGUAGE SQL IMMUTABLE;

-- Drop existing table if it exists (clean slate)
DROP TABLE IF EXISTS coste_recetas_historico CASCADE;

-- Create table for recipe cost history
CREATE TABLE coste_recetas_historico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Reference to recipe
    receta_id TEXT NOT NULL REFERENCES recetas(id) ON DELETE CASCADE,
    -- Date when this record was created/updated
    fecha TIMESTAMPTZ NOT NULL,
    -- Cost of raw materials (ingredients without overhead)
    coste_materia_prima DECIMAL(12,4) NOT NULL,
    -- Total production cost (includes overhead)
    coste_total_produccion DECIMAL(12,4) NOT NULL,
    -- Sale price on that date
    precio_venta DECIMAL(12,4) NOT NULL,
    -- Gross margin as percentage
    margen_bruto NUMERIC NOT NULL,
    -- Timestamp of record creation
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique index: one record per recipe per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_coste_recetas_historico_receta_fecha_unique
  ON coste_recetas_historico(receta_id, date_trunc_day(fecha));

-- Index for efficient querying by recipe and date
CREATE INDEX IF NOT EXISTS idx_coste_recetas_historico_receta_fecha
  ON coste_recetas_historico(receta_id, fecha DESC);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_coste_recetas_historico_fecha
  ON coste_recetas_historico(fecha DESC);

-- Row Level Security
ALTER TABLE coste_recetas_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cost history for their recipes"
  ON coste_recetas_historico FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert cost history"
  ON coste_recetas_historico FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Comments
COMMENT ON TABLE coste_recetas_historico 
  IS 'Historical record of recipe costs and margins. Enables trend analysis and profitability tracking.';

COMMENT ON COLUMN coste_recetas_historico.coste_materia_prima 
  IS 'Sum of all direct ingredient costs for the recipe';

COMMENT ON COLUMN coste_recetas_historico.coste_total_produccion 
  IS 'Raw material cost + production overhead';

COMMENT ON COLUMN coste_recetas_historico.margen_bruto 
  IS 'Percentage: (precio_venta - coste_total_produccion) / precio_venta * 100';
