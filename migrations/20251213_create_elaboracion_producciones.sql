-- Migration: Create elaboracion_producciones table
-- Description: Table to store production records for elaborations to calculate averages and recipe adjustments
-- Date: 2025-12-13

CREATE TABLE IF NOT EXISTS elaboracion_producciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  elaboracion_id UUID NOT NULL REFERENCES elaboraciones(id) ON DELETE CASCADE,
  fecha_produccion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responsable TEXT NOT NULL, -- User from auth session
  cantidad_real_producida NUMERIC NOT NULL, -- Actual output quantity
  componentes_utilizados JSONB NOT NULL, -- Array of { componenteId, cantidad_real, merma_real }
  observaciones TEXT, -- Optional notes from production
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_elaboracion_producciones_elaboracion_id ON elaboracion_producciones(elaboracion_id);
CREATE INDEX idx_elaboracion_producciones_fecha_produccion ON elaboracion_producciones(fecha_produccion DESC);

-- Enable RLS if needed
ALTER TABLE elaboracion_producciones ENABLE ROW LEVEL SECURITY;
