-- ============================================================================
-- FIX: Rename column 'localización' to 'localizacion' (remove accents)
-- ============================================================================

-- Drop the existing tables (cascading)
DROP TABLE IF EXISTS os_pedidos_enviados CASCADE;
DROP TABLE IF EXISTS os_pedidos_pendientes CASCADE;

-- Recreate os_pedidos_pendientes with correct column names
CREATE TABLE IF NOT EXISTS os_pedidos_pendientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference to service order
    os_id VARCHAR NOT NULL,
    tipo VARCHAR NOT NULL DEFAULT 'Alquiler',
    estado VARCHAR NOT NULL DEFAULT 'Pendiente',
    
    -- Context (Unique combination)
    fecha_entrega DATE NOT NULL,
    localizacion VARCHAR NOT NULL,
    solicita VARCHAR NOT NULL CHECK (solicita IN ('Sala', 'Cocina')),
    
    -- Items as JSON
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Metadata for quick access
    cantidad_articulos INTEGER DEFAULT 0,
    cantidad_unidades DECIMAL(10,2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    
    -- Constraints
    UNIQUE(os_id, fecha_entrega, localizacion, solicita),
    FOREIGN KEY(os_id) REFERENCES eventos(numero_expediente) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_os_pedidos_pendientes_os_id ON os_pedidos_pendientes(os_id);
CREATE INDEX idx_os_pedidos_pendientes_fecha ON os_pedidos_pendientes(fecha_entrega);
CREATE INDEX idx_os_pedidos_pendientes_estado ON os_pedidos_pendientes(estado);
CREATE INDEX idx_os_pedidos_pendientes_localizacion ON os_pedidos_pendientes(localizacion);

-- Auto-update trigger for updated_at
CREATE TRIGGER update_os_pedidos_pendientes_updated_at
BEFORE UPDATE ON os_pedidos_pendientes
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Recreate os_pedidos_enviados with correct column names
CREATE TABLE IF NOT EXISTS os_pedidos_enviados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference to service order
    os_id VARCHAR NOT NULL,
    tipo VARCHAR NOT NULL DEFAULT 'Alquiler',
    estado VARCHAR NOT NULL DEFAULT 'En preparación' CHECK (estado IN ('En preparación', 'Listo', 'Entregado', 'Cancelado')),
    
    -- Context (consolidated by fecha + localizacion ONLY, ignoring solicita)
    fecha_entrega DATE NOT NULL,
    localizacion VARCHAR NOT NULL,
    
    -- Items as JSON (consolidated from multiple pendientes)
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Optional user comment
    comentario_pedido TEXT,
    
    -- Event and provider information
    numero_expediente VARCHAR NOT NULL,
    nombre_espacio VARCHAR NOT NULL,
    direccion_espacio VARCHAR NOT NULL,
    responsable_metre VARCHAR,
    telefono_metre VARCHAR,
    responsable_pase VARCHAR,
    telefono_pase VARCHAR,
    
    -- Consolidation tracking
    fecha_consolidacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_envio_pdf TIMESTAMP WITH TIME ZONE,
    usuario_genero_pdf UUID,
    
    -- Traceability: which pending orders were consolidated
    pedidos_pendientes_ids UUID[] DEFAULT ARRAY[]::uuid[],
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    FOREIGN KEY(os_id) REFERENCES eventos(numero_expediente) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_os_pedidos_enviados_os_id ON os_pedidos_enviados(os_id);
CREATE INDEX idx_os_pedidos_enviados_fecha ON os_pedidos_enviados(fecha_entrega);
CREATE INDEX idx_os_pedidos_enviados_estado ON os_pedidos_enviados(estado);
CREATE INDEX idx_os_pedidos_enviados_localizacion ON os_pedidos_enviados(localizacion);

-- Auto-update trigger for updated_at
CREATE TRIGGER update_os_pedidos_enviados_updated_at
BEFORE UPDATE ON os_pedidos_enviados
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Enable RLS
ALTER TABLE os_pedidos_pendientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_pedidos_enviados ENABLE ROW LEVEL SECURITY;

-- RLS Policy: All authenticated users can read/write (simplified for development)
CREATE POLICY "Enable read for authenticated users" 
ON os_pedidos_pendientes 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" 
ON os_pedidos_pendientes 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" 
ON os_pedidos_pendientes 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" 
ON os_pedidos_pendientes 
FOR DELETE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read for authenticated users" 
ON os_pedidos_enviados 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" 
ON os_pedidos_enviados 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" 
ON os_pedidos_enviados 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" 
ON os_pedidos_enviados 
FOR DELETE 
USING (auth.role() = 'authenticated');
