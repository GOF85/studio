-- Migration: Add missing columns to elaboracion_producciones
-- Date: 2025-01-15
-- Description: Add cantidad_real_producida, ratio_produccion columns and restructure for proper data storage

-- Add columns if they don't exist
ALTER TABLE elaboracion_producciones
ADD COLUMN IF NOT EXISTS cantidad_real_producida DECIMAL(10, 6),
ADD COLUMN IF NOT EXISTS ratio_produccion DECIMAL(5, 4) DEFAULT 1.0000;

-- Add comments for clarity
COMMENT ON COLUMN elaboracion_producciones.cantidad_real_producida IS 'Cantidad final producida después del proceso';
COMMENT ON COLUMN elaboracion_producciones.ratio_produccion IS 'Ratio entre cantidad_real_producida / cantidad planificada total';
