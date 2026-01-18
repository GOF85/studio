-- Migración: Crear tabla de Artículos Esenciales de Gastronomía
-- Fecha: 2026-01-18

CREATE TABLE IF NOT EXISTS gastro_esenciales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receta_id TEXT NOT NULL REFERENCES recetas(id) ON DELETE CASCADE,
    orden INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_receta_esencial UNIQUE(receta_id)
);

-- Índice para mejorar las consultas
CREATE INDEX IF NOT EXISTS idx_gastro_esenciales_receta_id ON gastro_esenciales(receta_id);
CREATE INDEX IF NOT EXISTS idx_gastro_esenciales_orden ON gastro_esenciales(orden);

-- Comentarios
COMMENT ON TABLE gastro_esenciales IS 'Artículos que se ofrecen por defecto en cada servicio de gastronomía (ej. limones, café).';

-- Añadir columna a gastronomia_orders para persistir los esenciales de cada evento
ALTER TABLE gastronomia_orders ADD COLUMN IF NOT EXISTS items_esenciales JSONB DEFAULT '[]';

