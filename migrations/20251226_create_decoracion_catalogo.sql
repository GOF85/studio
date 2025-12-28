-- Migration: Create decoracion_catalogo table
-- Date: 2025-12-26

CREATE TABLE IF NOT EXISTS decoracion_catalogo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    precio_referencia NUMERIC(12, 2) DEFAULT 0,
    descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE decoracion_catalogo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura de decoracion para todos" ON decoracion_catalogo FOR SELECT USING (true);
CREATE POLICY "Gestión de decoracion para autenticados" ON decoracion_catalogo FOR ALL USING (auth.role() = 'authenticated');

-- Insert some initial data (from the mock)
INSERT INTO decoracion_catalogo (nombre, precio_referencia) VALUES
('Centro de mesa floral', 45),
('Guirnalda LED 10m', 25),
('Mantelería especial (unidad)', 15)
ON CONFLICT DO NOTHING;
