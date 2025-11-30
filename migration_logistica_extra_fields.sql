-- Añadir columna JSONB 'data' a tablas de pedidos de logística para guardar campos extra
ALTER TABLE pedidos_transporte ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE pedidos_decoracion ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE pedidos_atipicos ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE pedidos_hielo ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE pedidos_material ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
