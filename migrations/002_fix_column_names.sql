-- ============================================================================
-- MIGRATION FIX: Drop and recreate tables with correct column names
-- ============================================================================
-- Date: 2026-01-10
-- Issue: Column names had inconsistent use of 'localizacion' (sometimes with tilde)
-- Fix: Ensure all columns use 'localizacion' (without tilde) for consistency
-- ============================================================================

-- Drop indexes first
DROP INDEX IF EXISTS idx_os_pedidos_enviados_localizacion;
DROP INDEX IF EXISTS idx_os_pedidos_pendientes_localizacion;
DROP INDEX IF EXISTS idx_os_pedidos_pendientes_estado;
DROP INDEX IF EXISTS idx_os_pedidos_pendientes_fecha;
DROP INDEX IF EXISTS idx_os_pedidos_pendientes_os_id;
DROP INDEX IF EXISTS idx_os_pedidos_enviados_estado;
DROP INDEX IF EXISTS idx_os_pedidos_enviados_fecha;
DROP INDEX IF EXISTS idx_os_pedidos_enviados_os_id;

-- Drop triggers
DROP TRIGGER IF EXISTS os_pedidos_enviados_update_timestamp ON os_pedidos_enviados;
DROP TRIGGER IF EXISTS os_pedidos_pendientes_update_timestamp ON os_pedidos_pendientes;

-- Drop existing tables
DROP TABLE IF EXISTS os_pedidos_enviados CASCADE;
DROP TABLE IF EXISTS os_pedidos_pendientes CASCADE;

-- Drop function if exists
DROP FUNCTION IF EXISTS update_timestamp();

-- ============================================================================
-- Recreate with CORRECT column names
-- ============================================================================

-- TABLE 1: os_pedidos_pendientes (Pending rental orders)
CREATE TABLE os_pedidos_pendientes (
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

-- Create indexes for performance
CREATE INDEX idx_os_pedidos_pendientes_os_id ON os_pedidos_pendientes(os_id);
CREATE INDEX idx_os_pedidos_pendientes_fecha ON os_pedidos_pendientes(fecha_entrega);
CREATE INDEX idx_os_pedidos_pendientes_estado ON os_pedidos_pendientes(estado);
CREATE INDEX idx_os_pedidos_pendientes_localizacion ON os_pedidos_pendientes(localizacion);

-- TABLE 2: os_pedidos_enviados (Sent/consolidated rental orders)
CREATE TABLE os_pedidos_enviados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference to service order
    os_id VARCHAR NOT NULL,
    tipo VARCHAR NOT NULL DEFAULT 'Alquiler',
    estado VARCHAR NOT NULL DEFAULT 'En preparación' CHECK (estado IN ('En preparación', 'Listo')),
    
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

-- Create indexes for performance
CREATE INDEX idx_os_pedidos_enviados_os_id ON os_pedidos_enviados(os_id);
CREATE INDEX idx_os_pedidos_enviados_fecha ON os_pedidos_enviados(fecha_entrega);
CREATE INDEX idx_os_pedidos_enviados_localizacion ON os_pedidos_enviados(localizacion);
CREATE INDEX idx_os_pedidos_enviados_estado ON os_pedidos_enviados(estado);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE os_pedidos_pendientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_pedidos_enviados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users"
ON os_pedidos_pendientes
FOR ALL
TO authenticated
USING (TRUE)
WITH CHECK (TRUE);

CREATE POLICY "Enable all for authenticated users"
ON os_pedidos_enviados
FOR ALL
TO authenticated
USING (TRUE)
WITH CHECK (TRUE);

-- ============================================================================
-- TRIGGERS: Auto-update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER os_pedidos_pendientes_update_timestamp
BEFORE UPDATE ON os_pedidos_pendientes
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER os_pedidos_enviados_update_timestamp
BEFORE UPDATE ON os_pedidos_enviados
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON os_pedidos_pendientes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON os_pedidos_enviados TO authenticated;
