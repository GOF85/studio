-- Migration to update recetas table with all required fields
-- Run this in Supabase SQL Editor

-- Drop existing simple recetas table and recreate with full schema
DROP TABLE IF EXISTS receta_detalles CASCADE;
DROP TABLE IF EXISTS recetas CASCADE;

-- Create recetas table with all required fields
CREATE TABLE recetas (
    id TEXT PRIMARY KEY,
    numero_receta TEXT,
    nombre TEXT NOT NULL,
    nombre_en TEXT,
    visible_para_comerciales BOOLEAN DEFAULT TRUE,
    is_archived BOOLEAN DEFAULT FALSE,
    descripcion_comercial TEXT,
    descripcion_comercial_en TEXT,
    responsable_escandallo TEXT,
    categoria TEXT NOT NULL,
    partida_produccion TEXT,
    gramaje_total NUMERIC DEFAULT 0,
    estacionalidad TEXT CHECK (estacionalidad IN ('INVIERNO', 'VERANO', 'MIXTO')) DEFAULT 'MIXTO',
    tipo_dieta TEXT CHECK (tipo_dieta IN ('VEGETARIANO', 'VEGANO', 'AMBOS', 'NINGUNO')) DEFAULT 'NINGUNO',
    porcentaje_coste_produccion NUMERIC DEFAULT 30,
    
    -- JSON fields for complex data
    elaboraciones JSONB DEFAULT '[]'::jsonb,
    menaje_asociado JSONB DEFAULT '[]'::jsonb,
    
    -- Instructions
    instrucciones_mise_en_place TEXT,
    instrucciones_regeneracion TEXT,
    instrucciones_emplatado TEXT,
    
    -- Images (stored as JSONB arrays of ImagenReceta objects)
    fotos_mise_en_place JSONB DEFAULT '[]'::jsonb,
    fotos_regeneracion JSONB DEFAULT '[]'::jsonb,
    fotos_emplatado JSONB DEFAULT '[]'::jsonb,
    fotos_comerciales JSONB DEFAULT '[]'::jsonb,
    
    -- Gastronomic profile
    perfil_sabor_principal TEXT,
    perfil_sabor_secundario TEXT[],
    perfil_textura TEXT[],
    tipo_cocina TEXT[],
    receta_origen TEXT,
    temperatura_servicio TEXT CHECK (temperatura_servicio IN ('CALIENTE', 'TIBIO', 'AMBIENTE', 'FRIO', 'HELADO')),
    tecnica_coccion_principal TEXT,
    potencial_mise_en_place TEXT CHECK (potencial_mise_en_place IN ('COMPLETO', 'PARCIAL', 'AL_MOMENTO')),
    formato_servicio_ideal TEXT[],
    equipamiento_critico TEXT[],
    
    -- Production metrics
    dificultad_produccion INT CHECK (dificultad_produccion BETWEEN 1 AND 5) DEFAULT 3,
    estabilidad_buffet INT CHECK (estabilidad_buffet BETWEEN 1 AND 5) DEFAULT 3,
    escalabilidad TEXT CHECK (escalabilidad IN ('FACIL', 'MEDIA', 'DIFICIL')),
    etiquetas_tendencia TEXT[],
    
    -- Costs (calculated fields)
    coste_materia_prima NUMERIC DEFAULT 0,
    precio_venta NUMERIC DEFAULT 0,
    alergenos TEXT[],
    
    -- Review flags
    requiere_revision BOOLEAN DEFAULT FALSE,
    comentario_revision TEXT,
    fecha_revision TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE recetas ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow all for authenticated users" ON recetas 
    FOR ALL 
    USING (auth.role() = 'authenticated');

-- Create index on nombre for faster searches
CREATE INDEX idx_recetas_nombre ON recetas(nombre);
CREATE INDEX idx_recetas_categoria ON recetas(categoria);
CREATE INDEX idx_recetas_is_archived ON recetas(is_archived);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_recetas_updated_at 
    BEFORE UPDATE ON recetas 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Note: After running this migration, you'll need to:
-- 1. Create the 'recetas' bucket in Supabase Storage
-- 2. Set up public access policies for the bucket
