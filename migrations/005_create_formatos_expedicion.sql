-- Migration: Create formatos_expedicion table
-- Description: Table to store packaging formats for production

-- Create the table
CREATE TABLE IF NOT EXISTS formatos_expedicion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE formatos_expedicion ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow all for authenticated users" 
ON formatos_expedicion 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Create index on nombre for faster searches
CREATE INDEX IF NOT EXISTS idx_formatos_expedicion_nombre ON formatos_expedicion(nombre);
