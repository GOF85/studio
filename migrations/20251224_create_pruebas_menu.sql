-- Migration: Create pruebas_menu table
-- Description: Table to store menu test data for each OS
-- Date: 2025-12-24

CREATE TABLE IF NOT EXISTS pruebas_menu (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id VARCHAR(255) NOT NULL UNIQUE,
    items JSONB NOT NULL DEFAULT '[]',
    observaciones_generales TEXT,
    coste_prueba_menu NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE pruebas_menu ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pruebas_menu' AND policyname = 'Allow all for authenticated users') THEN
        CREATE POLICY "Allow all for authenticated users" ON pruebas_menu FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_pruebas_menu_os_id ON pruebas_menu(os_id);

-- Comments
COMMENT ON TABLE pruebas_menu IS 'Almacena los datos de las pruebas de menú asociadas a una Orden de Servicio.';
COMMENT ON COLUMN pruebas_menu.os_id IS 'Referencia al numero_expediente de la tabla eventos.';
COMMENT ON COLUMN pruebas_menu.items IS 'Lista de platos y cabeceras de la prueba de menú (JSONB).';
COMMENT ON COLUMN pruebas_menu.coste_prueba_menu IS 'Coste total estimado de la prueba de menú.';
