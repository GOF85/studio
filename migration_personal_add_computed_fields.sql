-- Migration: Add computed fields to personal table
-- These fields are calculated from nombre, apellido1, apellido2

ALTER TABLE personal
ADD COLUMN IF NOT EXISTS nombre_compacto TEXT,
ADD COLUMN IF NOT EXISTS iniciales TEXT;

-- Update existing records to populate the new fields
UPDATE personal
SET 
    nombre_compacto = TRIM(nombre || ' ' || COALESCE(apellido1, '')),
    iniciales = UPPER(SUBSTRING(nombre, 1, 1) || COALESCE(SUBSTRING(apellido1, 1, 1), ''))
WHERE nombre_compacto IS NULL OR iniciales IS NULL;
