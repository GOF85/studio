-- ============================================================================
-- Migration: Add delivery time, pickup information, and rental days columns
-- Date: 2025-01-12
-- Purpose: Support capturing specific delivery times, optional pickup details, 
--          and rental duration in days for proper cost calculation
-- ============================================================================

-- Add columns to os_pedidos_pendientes table
ALTER TABLE os_pedidos_pendientes
  ADD COLUMN IF NOT EXISTS hora_entrega TIME DEFAULT '10:00' NOT NULL,
  ADD COLUMN IF NOT EXISTS fecha_recogida DATE,
  ADD COLUMN IF NOT EXISTS hora_recogida TIME,
  ADD COLUMN IF NOT EXISTS lugar_recogida VARCHAR(50);

-- Add columns to os_pedidos_enviados table
ALTER TABLE os_pedidos_enviados
  ADD COLUMN IF NOT EXISTS hora_entrega TIME DEFAULT '10:00' NOT NULL,
  ADD COLUMN IF NOT EXISTS fecha_recogida DATE,
  ADD COLUMN IF NOT EXISTS hora_recogida TIME,
  ADD COLUMN IF NOT EXISTS lugar_recogida VARCHAR(50);

-- Create pedido_items table to store items with dias information
CREATE TABLE IF NOT EXISTS pedido_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES os_pedidos_pendientes(id) ON DELETE CASCADE,
  item_code VARCHAR(255) NOT NULL,
  description VARCHAR(512),
  cantidad INTEGER NOT NULL DEFAULT 1,
  dias INTEGER NOT NULL DEFAULT 1,
  price DECIMAL(10, 2),
  price_snapshot DECIMAL(10, 2),
  image_url TEXT,
  subcategoria VARCHAR(255),
  category VARCHAR(255),
  material_order_id UUID,
  solicita VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido_id ON pedido_items(pedido_id);

-- Add comments for clarity
COMMENT ON COLUMN os_pedidos_pendientes.hora_entrega IS 'Delivery time in HH:MM format (required)';
COMMENT ON COLUMN os_pedidos_pendientes.fecha_recogida IS 'Optional pickup date (YYYY-MM-DD)';
COMMENT ON COLUMN os_pedidos_pendientes.hora_recogida IS 'Optional pickup time (HH:MM)';
COMMENT ON COLUMN os_pedidos_pendientes.lugar_recogida IS 'Pickup location: "Evento" or "Instalaciones"';

COMMENT ON COLUMN os_pedidos_enviados.hora_entrega IS 'Delivery time in HH:MM format (required)';
COMMENT ON COLUMN os_pedidos_enviados.fecha_recogida IS 'Optional pickup date (YYYY-MM-DD)';
COMMENT ON COLUMN os_pedidos_enviados.hora_recogida IS 'Optional pickup time (HH:MM)';
COMMENT ON COLUMN os_pedidos_enviados.lugar_recogida IS 'Pickup location: "Evento" or "Instalaciones"';

COMMENT ON TABLE pedido_items IS 'Line items in rental orders with quantity and days for cost calculation';
COMMENT ON COLUMN pedido_items.dias IS 'Number of rental days (default: 1). Total = cantidad * price * dias';
