
-- Migration: Create CPR Picking and Stock tables
-- Description: Tables for picking states and stock management in CPR module

-- CPR Picking States
CREATE TABLE IF NOT EXISTS cpr_picking_states (
    id TEXT PRIMARY KEY, -- Hito ID (from comercial_briefing_items)
    os_id TEXT NOT NULL,
    status TEXT DEFAULT 'Pendiente',
    item_states JSONB DEFAULT '[]',
    checked_items JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE cpr_picking_states ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow all for authenticated users on cpr_picking_states" 
ON cpr_picking_states FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- CPR Stock Elaboraciones
CREATE TABLE IF NOT EXISTS cpr_stock_elaboraciones (
    elaboracion_id UUID PRIMARY KEY,
    cantidad_total NUMERIC DEFAULT 0,
    unidad TEXT,
    lotes JSONB DEFAULT '[]',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE cpr_stock_elaboraciones ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow all for authenticated users on cpr_stock_elaboraciones" 
ON cpr_stock_elaboraciones FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_cpr_picking_states_updated_at
    BEFORE UPDATE ON cpr_picking_states
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cpr_stock_elaboraciones_updated_at
    BEFORE UPDATE ON cpr_stock_elaboraciones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
