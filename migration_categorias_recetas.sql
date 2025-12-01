-- Migration: Create categorias_recetas table in Supabase
-- This table stores recipe categories for the recipe management system

CREATE TABLE IF NOT EXISTS categorias_recetas (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    snack BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE categorias_recetas ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated users" 
ON categorias_recetas 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_categorias_recetas_nombre ON categorias_recetas(nombre);
