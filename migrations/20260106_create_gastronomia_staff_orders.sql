-- Tabla para Pedidos de Gastronomía del Staff
CREATE TABLE IF NOT EXISTS gastronomia_staff_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id VARCHAR(255) NOT NULL,
    fecha DATE NOT NULL,
    items JSONB NOT NULL DEFAULT '[]',
    total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_staff_order UNIQUE(os_id, fecha)
);

-- Índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_gastronomia_staff_orders_os_id ON gastronomia_staff_orders(os_id);
CREATE INDEX IF NOT EXISTS idx_gastronomia_staff_orders_fecha ON gastronomia_staff_orders(fecha);
