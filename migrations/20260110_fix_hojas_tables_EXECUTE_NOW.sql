-- Migration: Fix hojas_picking and hojas_retorno tables
-- Date: 2026-01-10
-- Purpose: Drop and recreate tables with correct schema

-- Drop existing tables (cascade to remove dependent objects)
DROP TABLE IF EXISTS hojas_retorno CASCADE;
DROP TABLE IF EXISTS hojas_picking CASCADE;

-- Drop existing functions/triggers
DROP FUNCTION IF EXISTS update_hojas_picking_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_hojas_retorno_updated_at() CASCADE;

-- ============================================================
-- HOJAS_PICKING TABLE (Warehouse Picking Sheets)
-- ============================================================
CREATE TABLE hojas_picking (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    os_id VARCHAR(255) NOT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'Pendiente',
    CHECK (estado IN ('Pendiente', 'En Proceso', 'Listo')),
    
    items JSONB DEFAULT '[]'::jsonb,
    data JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hojas_picking_os_id ON hojas_picking(os_id);
CREATE INDEX idx_hojas_picking_estado ON hojas_picking(estado);
CREATE INDEX idx_hojas_picking_created_at ON hojas_picking(created_at DESC);

ALTER TABLE hojas_picking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hojas_picking_select_policy" ON hojas_picking 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "hojas_picking_insert_policy" ON hojas_picking 
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "hojas_picking_update_policy" ON hojas_picking 
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "hojas_picking_delete_policy" ON hojas_picking 
FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION update_hojas_picking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hojas_picking_update_trigger
    BEFORE UPDATE ON hojas_picking
    FOR EACH ROW
    EXECUTE PROCEDURE update_hojas_picking_updated_at();

-- ============================================================
-- HOJAS_RETORNO TABLE (Material Return Sheets)
-- ============================================================
CREATE TABLE hojas_retorno (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    os_id VARCHAR(255) NOT NULL UNIQUE,
    data JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hojas_retorno_os_id ON hojas_retorno(os_id);
CREATE INDEX idx_hojas_retorno_created_at ON hojas_retorno(created_at DESC);

ALTER TABLE hojas_retorno ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hojas_retorno_select_policy" ON hojas_retorno 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "hojas_retorno_insert_policy" ON hojas_retorno 
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "hojas_retorno_update_policy" ON hojas_retorno 
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "hojas_retorno_delete_policy" ON hojas_retorno 
FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION update_hojas_retorno_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hojas_retorno_update_trigger
    BEFORE UPDATE ON hojas_retorno
    FOR EACH ROW
    EXECUTE PROCEDURE update_hojas_retorno_updated_at();

-- Done
SELECT 'Migration completed successfully: hojas_picking and hojas_retorno tables created' as status;
