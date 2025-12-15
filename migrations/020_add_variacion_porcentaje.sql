-- Migration: Add variacion_porcentaje column to historico_precios_erp
-- Description: Add percentage change tracking for price alerts (10% threshold)
-- Date: 2025-12-15

-- Add the new column if it doesn't exist
ALTER TABLE historico_precios_erp
ADD COLUMN IF NOT EXISTS variacion_porcentaje DECIMAL(5, 2) DEFAULT 0;

-- Create or update index for efficient price alert queries
CREATE INDEX IF NOT EXISTS idx_historico_precios_erp_variacion 
ON historico_precios_erp(variacion_porcentaje DESC, fecha DESC);

-- Update comment on the column
COMMENT ON COLUMN historico_precios_erp.variacion_porcentaje IS 'Percentage change from previous price (used for 10% alert threshold)';

-- Verify the migration
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'historico_precios_erp'
ORDER BY ordinal_position;
