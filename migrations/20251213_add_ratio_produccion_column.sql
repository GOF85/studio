-- Migration: Add ratio_produccion column to elaboracion_producciones
-- Description: Store the ratio between actual and planned production (cantidad_final / cantidad_planificada)
-- Date: 2025-12-13

-- Add ratio_produccion column
ALTER TABLE elaboracion_producciones
ADD COLUMN IF NOT EXISTS ratio_produccion DECIMAL(5, 4) DEFAULT 1.0000;

-- Add comment for clarity
COMMENT ON COLUMN elaboracion_producciones.ratio_produccion IS 'Ratio de producción: cantidad_final_producida / cantidad_planificada. Usado para análisis de rendimiento y ajustes futuros de recetas.';
