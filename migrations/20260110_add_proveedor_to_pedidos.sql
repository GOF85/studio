-- ============================================================================
-- MIGRATION: Add proveedor_id to os_pedidos_pendientes
-- ============================================================================
-- Date: 2026-01-10
-- Purpose: Link each pending rental order to a specific provider
-- Impact: Enables "agregar referencias" functionality and provider-based consolidation
-- ============================================================================

-- Add proveedor_id column (nullable initially to support existing records)
ALTER TABLE os_pedidos_pendientes 
ADD COLUMN proveedor_id VARCHAR REFERENCES proveedores(id) ON DELETE RESTRICT;

-- Add index for performance
CREATE INDEX idx_os_pedidos_pendientes_proveedor_id ON os_pedidos_pendientes(proveedor_id);

-- Add constraint: cada pedido debe tener proveedor (después de migrar datos)
-- NOTA: Descomenta cuando hayas migrado todos los registros
-- ALTER TABLE os_pedidos_pendientes ADD CONSTRAINT unique_pedido_context UNIQUE (os_id, fecha_entrega, localizacion, solicita, proveedor_id);

-- ============================================================================
-- NOTE FOR DEVELOPERS
-- ============================================================================
-- Existing records will have proveedor_id = NULL
-- Migration strategy:
-- 1. Nueva lógica de la app requiere proveedor_id en todos los nuevos pedidos
-- 2. Los pedidos viejos con NULL se pueden lijar o migrar manualmente
-- 3. Una vez todo esté migrado, descomentar la línea de UNIQUE constraint

