-- Migration: Create tipos_servicio_briefing table
-- Run this in Supabase SQL Editor

-- Create table
CREATE TABLE IF NOT EXISTS tipos_servicio_briefing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tipos_servicio_briefing ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists and recreate
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Enable all for authenticated users" ON tipos_servicio_briefing;
EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

-- Create policy for all operations
CREATE POLICY "Enable all for authenticated users" 
    ON tipos_servicio_briefing
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Insert default data
INSERT INTO tipos_servicio_briefing (nombre, descripcion)
VALUES 
    ('Desayuno', 'Servicio de desayuno'),
    ('Coffee Break', 'Pausa para café'),
    ('Comida', 'Servicio de comida'),
    ('Merienda', 'Servicio de merienda'),
    ('Cena', 'Servicio de cena'),
    ('Cocktail', 'Servicio de cocktail'),
    ('Cena de Gala', 'Servicio de cena de gala')
ON CONFLICT (nombre) DO NOTHING;

-- Verify
SELECT * FROM tipos_servicio_briefing ORDER BY nombre;
