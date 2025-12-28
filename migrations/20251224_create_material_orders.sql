-- Migration: Create table for Material Orders (Bodega, Almacen, Bio, Alquiler)
-- Date: 2025-12-24

CREATE TABLE IF NOT EXISTS os_material_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id VARCHAR(255) NOT NULL, -- Referencia a eventos.numero_expediente
    type VARCHAR(50) NOT NULL CHECK (type IN ('Almacen', 'Bodega', 'Bio', 'Alquiler')),
    status VARCHAR(50) NOT NULL DEFAULT 'Asignado' CHECK (status IN ('Asignado', 'En preparación', 'Listo')),
    items JSONB DEFAULT '[]'::jsonb,
    days INTEGER DEFAULT 1,
    total NUMERIC(12, 2) DEFAULT 0,
    contract_number VARCHAR(255),
    delivery_date DATE,
    delivery_space VARCHAR(255),
    delivery_location VARCHAR(255),
    solicita VARCHAR(50) CHECK (solicita IN ('Sala', 'Cocina')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_os_material_orders_os FOREIGN KEY (os_id) REFERENCES eventos(numero_expediente) ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_os_material_orders_os_id ON os_material_orders(os_id);
CREATE INDEX IF NOT EXISTS idx_os_material_orders_type ON os_material_orders(type);

-- RLS Policies
ALTER TABLE os_material_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura de pedidos de material para todos" ON os_material_orders FOR SELECT USING (true);
CREATE POLICY "Gestión de pedidos de material para autenticados" ON os_material_orders FOR ALL USING (auth.role() = 'authenticated');

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_os_material_orders_updated_at
    BEFORE UPDATE ON os_material_orders
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
