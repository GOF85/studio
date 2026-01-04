-- Migration: Add allergen fields to gastronomia_orders table
-- Date: 2026-01-04
-- Purpose: Support parallel allergen menu tracking with approval workflow

-- Add allergen-related columns to gastronomia_orders table
ALTER TABLE gastronomia_orders
ADD COLUMN IF NOT EXISTS asistentes_alergenos INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS items_alergenos JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS total_alergenos NUMERIC DEFAULT 0;

-- Add comment to clarify column purposes
COMMENT ON COLUMN gastronomia_orders.asistentes_alergenos IS 'Number of attendees requiring allergen-free menu';
COMMENT ON COLUMN gastronomia_orders.items_alergenos IS 'Array of allergen menu items with aprobadoCocina approval status';
COMMENT ON COLUMN gastronomia_orders.total_alergenos IS 'Total cost of allergen menu items';

-- Create index on allergen columns for better query performance
CREATE INDEX IF NOT EXISTS idx_gastronomia_orders_asistentes_alergenos 
ON gastronomia_orders(asistentes_alergenos) 
WHERE asistentes_alergenos > 0;
