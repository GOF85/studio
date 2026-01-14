-- Add numero_pedido field to os_pedidos_enviados table
-- This is a human-readable sequential order number like A0001, A0002, etc.

ALTER TABLE os_pedidos_enviados
ADD COLUMN IF NOT EXISTS numero_pedido VARCHAR(10);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_os_pedidos_enviados_numero_pedido 
ON os_pedidos_enviados(numero_pedido);

-- Add unique constraint to prevent duplicates
ALTER TABLE os_pedidos_enviados
ADD CONSTRAINT unique_numero_pedido UNIQUE (numero_pedido);
