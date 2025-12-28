-- Add missing columns to objetivos_gasto table
ALTER TABLE objetivos_gasto 
ADD COLUMN IF NOT EXISTS hielo NUMERIC(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS personal_solicitado_cpr NUMERIC(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS coste_prueba_menu NUMERIC(5, 2) DEFAULT 0;

-- Update existing rows to have 0 instead of NULL if they were created before
UPDATE objetivos_gasto SET hielo = 0 WHERE hielo IS NULL;
UPDATE objetivos_gasto SET personal_solicitado_cpr = 0 WHERE personal_solicitado_cpr IS NULL;
UPDATE objetivos_gasto SET coste_prueba_menu = 0 WHERE coste_prueba_menu IS NULL;
