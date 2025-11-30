-- Añadir columna JSONB 'data' a tablas de Producción y Almacén
ALTER TABLE ordenes_fabricacion ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE picking_sheets ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE return_sheets ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE excedentes_produccion ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE stock_elaboraciones ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
