-- Migration: Create tipos_servicio_briefing table
-- Description: Table to store briefing service types (Desayuno, Comida, Cena, etc.)

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS tipos_servicio_briefing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on nombre for faster lookups
CREATE INDEX IF NOT EXISTS idx_tipos_servicio_briefing_nombre ON tipos_servicio_briefing(nombre);

-- Add RLS policies
ALTER TABLE tipos_servicio_briefing ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read
CREATE POLICY IF NOT EXISTS "Allow authenticated users to read tipos_servicio_briefing"
    ON tipos_servicio_briefing
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Allow authenticated users to insert
CREATE POLICY IF NOT EXISTS "Allow authenticated users to insert tipos_servicio_briefing"
    ON tipos_servicio_briefing
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Allow authenticated users to update
CREATE POLICY IF NOT EXISTS "Allow authenticated users to update tipos_servicio_briefing"
    ON tipos_servicio_briefing
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: Allow authenticated users to delete
CREATE POLICY IF NOT EXISTS "Allow authenticated users to delete tipos_servicio_briefing"
    ON tipos_servicio_briefing
    FOR DELETE
    TO authenticated
    USING (true);

-- Insert default service types if table is empty
INSERT INTO tipos_servicio_briefing (nombre, descripcion)
SELECT * FROM (
    VALUES 
        ('Desayuno', 'Servicio de desayuno'),
        ('Coffee Break', 'Pausa para café'),
        ('Comida', 'Servicio de comida'),
        ('Merienda', 'Servicio de merienda'),
        ('Cena', 'Servicio de cena'),
        ('Cocktail', 'Servicio de cocktail'),
        ('Cena de Gala', 'Servicio de cena de gala')
) AS default_types(nombre, descripcion)
WHERE NOT EXISTS (SELECT 1 FROM tipos_servicio_briefing LIMIT 1);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_tipos_servicio_briefing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tipos_servicio_briefing_updated_at_trigger ON tipos_servicio_briefing;
CREATE TRIGGER update_tipos_servicio_briefing_updated_at_trigger
    BEFORE UPDATE ON tipos_servicio_briefing
    FOR EACH ROW
    EXECUTE FUNCTION update_tipos_servicio_briefing_updated_at();
