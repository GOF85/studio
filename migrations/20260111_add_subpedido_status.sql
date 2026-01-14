-- Migration: Add status field to sub_pedidos table
-- Date: 2026-01-11
-- Purpose: Track sub-pedido status (pending, review, confirmed, sent, cancelled)

-- Add status column if it doesn't exist
ALTER TABLE os_material_orders
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'
CHECK (status IN ('pending', 'review', 'confirmed', 'sent', 'cancelled'));

-- Create index for faster status filtering
CREATE INDEX IF NOT EXISTS idx_material_orders_status ON os_material_orders(status);

-- Add comment for documentation
COMMENT ON COLUMN os_material_orders.status IS 'Sub-pedido status: pending (edición), review (listo para revisar), confirmed (confirmado), sent (enviado), cancelled (cancelado)';
