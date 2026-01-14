-- Migration: Create hojas_picking and hojas_retorno tables for material management
-- Date: 2026-01-10
-- Purpose: Manage picking sheets for warehouse preparation and return sheets for post-event material handling

-- ============================================================
-- HOJAS_PICKING TABLE (Warehouse Picking Sheets)
-- ============================================================
-- Stores material preparation sheets for warehouse staff
-- One sheet per OS + delivery date combination

CREATE TABLE IF NOT EXISTS hojas_picking (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    os_id VARCHAR(255) NOT NULL,  -- Foreign key: can be UUID (eventos.id) or numero_expediente
    estado VARCHAR(50) NOT NULL DEFAULT 'Pendiente',
    CHECK (estado IN ('Pendiente', 'En Proceso', 'Listo')),
    
    -- Main data columns
    items JSONB DEFAULT '[]'::jsonb,  -- Array of OrderItem[] with MaterialOrderType
    data JSONB DEFAULT '{}'::jsonb,   -- Extra data: fechaNecesidad, itemStates, checkedItems, solicita
    
    -- Audit columns
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_hojas_picking_os_id ON hojas_picking(os_id);
CREATE INDEX IF NOT EXISTS idx_hojas_picking_estado ON hojas_picking(estado);
CREATE INDEX IF NOT EXISTS idx_hojas_picking_created_at ON hojas_picking(created_at DESC);

-- RLS Policies
ALTER TABLE hojas_picking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read hojas_picking" 
ON hojas_picking FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to create hojas_picking" 
ON hojas_picking FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update hojas_picking" 
ON hojas_picking FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete hojas_picking" 
ON hojas_picking FOR DELETE 
TO authenticated 
USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_hojas_picking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hojas_picking_update_updated_at
    BEFORE UPDATE ON hojas_picking
    FOR EACH ROW
    EXECUTE PROCEDURE update_hojas_picking_updated_at();

-- ============================================================
-- HOJAS_RETORNO TABLE (Material Return Sheets)
-- ============================================================
-- Stores material return tracking post-event
-- One sheet per OS (id = os_id)

CREATE TABLE IF NOT EXISTS hojas_retorno (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,  -- Same as os_id
    os_id VARCHAR(255) NOT NULL UNIQUE,  -- Foreign key: can be UUID or numero_expediente
    
    -- All data stored in JSONB:
    -- {
    --   items: OrderItem[] (with sentQuantity, returnedQuantity, orderId, type, price),
    --   status: 'Pendiente' | 'Procesando' | 'Completado',
    --   itemStates: Record<'${orderId}_${itemCode}', { returnedQuantity, incidentComment?, isReviewed? }>
    -- }
    data JSONB DEFAULT '{}'::jsonb,
    
    -- Audit columns
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_hojas_retorno_os_id ON hojas_retorno(os_id);
CREATE INDEX IF NOT EXISTS idx_hojas_retorno_created_at ON hojas_retorno(created_at DESC);

-- RLS Policies
ALTER TABLE hojas_retorno ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read hojas_retorno" 
ON hojas_retorno FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to create hojas_retorno" 
ON hojas_retorno FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update hojas_retorno" 
ON hojas_retorno FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete hojas_retorno" 
ON hojas_retorno FOR DELETE 
TO authenticated 
USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_hojas_retorno_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hojas_retorno_update_updated_at
    BEFORE UPDATE ON hojas_retorno
    FOR EACH ROW
    EXECUTE PROCEDURE update_hojas_retorno_updated_at();

-- ============================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================
COMMENT ON TABLE hojas_picking IS 
'Picking sheets for warehouse material preparation. 
Maps to PickingSheet type in code (types/index.ts:953).
Fields: id (primary key), os_id (foreign key to eventos), estado (status),
items (array of OrderItem), data (JSONB with extra fields).';

COMMENT ON COLUMN hojas_picking.data IS
'JSONB object containing: fecha, fechaNecesidad, itemStates (Record<itemId, PickingItemState>), checkedItems (array)';

COMMENT ON TABLE hojas_retorno IS
'Return sheets for post-event material tracking.
Maps to ReturnSheet type in code (types/index.ts:970).
One per OS (id = os_id).';

COMMENT ON COLUMN hojas_retorno.data IS
'JSONB object containing: items (with sentQuantity, returnedQuantity, orderId), 
status (Pendiente|Procesando|Completado), itemStates (Record<"${orderId}_${itemCode}", ReturnItemState>)';
