-- Add proveedor field to os_pedidos_pendientes and os_pedidos_enviados
-- This tracks the provider name selected when creating the rental order

-- Add column to os_pedidos_pendientes
ALTER TABLE os_pedidos_pendientes 
ADD COLUMN IF NOT EXISTS proveedor VARCHAR(255);

-- Add column to os_pedidos_enviados
ALTER TABLE os_pedidos_enviados 
ADD COLUMN IF NOT EXISTS proveedor VARCHAR(255);

-- Add comment to document the field
COMMENT ON COLUMN os_pedidos_pendientes.proveedor IS 'Provider name (nombre_comercial) selected when creating the order';
COMMENT ON COLUMN os_pedidos_enviados.proveedor IS 'Provider name copied from os_pedidos_pendientes during consolidation';
