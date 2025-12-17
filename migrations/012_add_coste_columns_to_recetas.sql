-- Migration: Add cost tracking columns to recetas table
-- Purpose: Cache current costs for quick access without complex calculations
-- Date: 2025-12-16

-- Add column for current raw material cost
ALTER TABLE recetas 
ADD COLUMN IF NOT EXISTS coste_materia_prima_actual DECIMAL(12,4) DEFAULT 0;

-- Add timestamp of last cost update
ALTER TABLE recetas 
ADD COLUMN IF NOT EXISTS coste_materia_prima_fecha_actualizacion TIMESTAMPTZ;

-- Add current gross margin percentage
ALTER TABLE recetas 
ADD COLUMN IF NOT EXISTS margen_bruto_actual NUMERIC DEFAULT 0;

-- Index for queries filtering by cost
CREATE INDEX IF NOT EXISTS idx_recetas_coste_materia_prima_actual
  ON recetas(coste_materia_prima_actual);

-- Index for queries filtering by margin
CREATE INDEX IF NOT EXISTS idx_recetas_margen_bruto_actual
  ON recetas(margen_bruto_actual);

-- Index for queries filtering by update time
CREATE INDEX IF NOT EXISTS idx_recetas_coste_actualizacion
  ON recetas(coste_materia_prima_fecha_actualizacion DESC);

-- Comments
COMMENT ON COLUMN recetas.coste_materia_prima_actual 
  IS 'Cache of current raw material cost. Updated via recalc_receta_costos() function.';

COMMENT ON COLUMN recetas.coste_materia_prima_fecha_actualizacion 
  IS 'Timestamp when cost was last calculated/updated.';

COMMENT ON COLUMN recetas.margen_bruto_actual 
  IS 'Current gross margin percentage. Updated when prices or costs change.';
