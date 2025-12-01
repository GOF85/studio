-- Recreate receta_detalles table
-- Run this in Supabase SQL Editor

CREATE TABLE receta_detalles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receta_id TEXT REFERENCES recetas(id) ON DELETE CASCADE,
    tipo TEXT CHECK (tipo IN ('ARTICULO', 'ELABORACION')),
    item_id UUID NOT NULL,
    cantidad NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE receta_detalles ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow all for authenticated users" ON receta_detalles 
    FOR ALL 
    USING (auth.role() = 'authenticated');

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
