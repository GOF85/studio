-- Migration: Create table os_pedidos_change_log
-- This table tracks all changes made to sent rental orders

CREATE TABLE IF NOT EXISTS os_pedidos_change_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id UUID NOT NULL,
  os_id VARCHAR(255) NOT NULL,
  usuario_id UUID NOT NULL,
  usuario_email VARCHAR(255),
  tipo_cambio VARCHAR(50) NOT NULL,
  cambios JSONB NOT NULL,
  razon TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pedido_change_log_pedido_id ON os_pedidos_change_log(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedido_change_log_os_id ON os_pedidos_change_log(os_id);
CREATE INDEX IF NOT EXISTS idx_pedido_change_log_usuario_id ON os_pedidos_change_log(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pedido_change_log_timestamp ON os_pedidos_change_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pedido_change_log_tipo ON os_pedidos_change_log(tipo_cambio);

-- Enable RLS
ALTER TABLE os_pedidos_change_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust based on your security model)
CREATE POLICY "Users can view change logs for their orders" ON os_pedidos_change_log
  FOR SELECT USING (true); -- Adjust based on your auth model

CREATE POLICY "System can insert change logs" ON os_pedidos_change_log
  FOR INSERT WITH CHECK (true); -- Adjust based on your auth model
