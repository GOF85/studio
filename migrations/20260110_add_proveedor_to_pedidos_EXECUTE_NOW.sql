-- ============================================================================
-- MIGRATION: Add proveedor_id to os_pedidos_pendientes
-- ============================================================================
-- Date: 2026-01-10
-- Purpose: Link each pending rental order to a specific provider
-- Status: EXECUTE THIS IMMEDIATELY in Supabase SQL Editor
-- ============================================================================

-- Step 1: Add proveedor_id column (nullable initially to support existing records)
ALTER TABLE os_pedidos_pendientes 
ADD COLUMN proveedor_id UUID REFERENCES proveedores(id) ON DELETE RESTRICT;

-- Step 2: Add index for performance
CREATE INDEX idx_os_pedidos_pendientes_proveedor_id ON os_pedidos_pendientes(proveedor_id);

-- Step 3: Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'os_pedidos_pendientes' 
ORDER BY ordinal_position;
