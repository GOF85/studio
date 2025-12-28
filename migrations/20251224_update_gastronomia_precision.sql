-- Migration: Update Gastronomía and Comercial tables for financial precision
-- Description: Update DECIMAL(10, 2) to NUMERIC(12, 2) for better financial precision and consistency
-- Date: 2025-12-24

-- Update comercial_ajustes table
ALTER TABLE comercial_ajustes 
  ALTER COLUMN importe TYPE NUMERIC(12, 2);

-- Update gastronomia_orders table
ALTER TABLE gastronomia_orders 
  ALTER COLUMN total TYPE NUMERIC(12, 2);

-- Ensure RLS is enabled (it should be, but let's be safe)
ALTER TABLE comercial_briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE comercial_ajustes ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastronomia_orders ENABLE ROW LEVEL SECURITY;

-- Re-create or ensure policies exist for authenticated users
DO $$ 
BEGIN
    -- comercial_briefings
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'comercial_briefings' AND policyname = 'Allow all for authenticated users') THEN
        CREATE POLICY "Allow all for authenticated users" ON comercial_briefings FOR ALL USING (auth.role() = 'authenticated');
    END IF;

    -- comercial_ajustes
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'comercial_ajustes' AND policyname = 'Allow all for authenticated users') THEN
        CREATE POLICY "Allow all for authenticated users" ON comercial_ajustes FOR ALL USING (auth.role() = 'authenticated');
    END IF;

    -- gastronomia_orders
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gastronomia_orders' AND policyname = 'Allow all for authenticated users') THEN
        CREATE POLICY "Allow all for authenticated users" ON gastronomia_orders FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Add comments for clarity
COMMENT ON COLUMN comercial_ajustes.importe IS 'Importe del ajuste comercial con precisión de 2 decimales.';
COMMENT ON COLUMN gastronomia_orders.total IS 'Total del pedido de gastronomía con precisión de 2 decimales.';
