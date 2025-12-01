-- Añadir columna JSONB 'data' a tablas de Personal y RRHH
ALTER TABLE personal_mice_asignaciones ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE personal_externo_eventos ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE personal_externo_ajustes ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE personal_entrega ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE solicitudes_personal_cpr ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
