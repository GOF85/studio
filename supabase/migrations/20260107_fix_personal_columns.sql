
-- Migración para añadir campos faltantes al Sistema Maestro de Personal
-- Ejecuta esto en el SQL Editor de Supabase para habilitar todas las funcionalidades.

-- 1. Añadir columna para la foto optimizada
ALTER TABLE personal ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- 2. Añadir columna para el número de matrícula
ALTER TABLE personal ADD COLUMN IF NOT EXISTS matricula TEXT;

-- Asegurar que los registros existentes tengan el campo activo
UPDATE personal SET activo = true WHERE activo IS NULL;
