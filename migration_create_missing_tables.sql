-- Crear tablas faltantes para Producción y Almacén

CREATE TABLE IF NOT EXISTS ordenes_fabricacion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evento_id UUID REFERENCES eventos(id) ON DELETE CASCADE,
    items JSONB DEFAULT '[]'::jsonb,
    estado TEXT DEFAULT 'Pendiente',
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hojas_picking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evento_id UUID REFERENCES eventos(id) ON DELETE CASCADE,
    items JSONB DEFAULT '[]'::jsonb,
    estado TEXT DEFAULT 'Pendiente',
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Añadir columna data a hojas_retorno si no existe
ALTER TABLE hojas_retorno ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
