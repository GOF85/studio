-- Eliminar tablas si existen (para recrearlas limpias)
DROP TABLE IF EXISTS gastronomia_orders CASCADE;
DROP TABLE IF EXISTS comercial_ajustes CASCADE;
DROP TABLE IF EXISTS comercial_briefings CASCADE;

-- Tabla para Briefings Comerciales
CREATE TABLE comercial_briefings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id VARCHAR(255) NOT NULL UNIQUE,
    items JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para Ajustes Comerciales
CREATE TABLE comercial_ajustes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id VARCHAR(255) NOT NULL,
    concepto VARCHAR(255) NOT NULL,
    importe DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_ajuste UNIQUE(os_id, concepto)
);

-- Tabla para Pedidos de Gastronomía
CREATE TABLE gastronomia_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    briefing_item_id VARCHAR(255) NOT NULL,
    os_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pendiente',
    items JSONB NOT NULL DEFAULT '[]',
    total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_gastro_order UNIQUE(os_id, briefing_item_id)
);

-- Índices para mejor performance
CREATE INDEX idx_comercial_briefings_os_id ON comercial_briefings(os_id);
CREATE INDEX idx_comercial_ajustes_os_id ON comercial_ajustes(os_id);
CREATE INDEX idx_gastronomia_orders_os_id ON gastronomia_orders(os_id);
CREATE INDEX idx_gastronomia_orders_briefing_item_id ON gastronomia_orders(briefing_item_id);
