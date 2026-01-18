-- Migration: Ensure OS Panel columns exist in 'eventos'
-- Date: 2026-01-18

DO $$ 
BEGIN
    -- 1. Ensure columns exist (as TEXT first if unsure, then convert)
    -- This handles the case where columns might exist with different types
    
    -- SALA
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'produccion_sala') THEN
        ALTER TABLE eventos ADD COLUMN produccion_sala TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'revision_pm') THEN
        ALTER TABLE eventos ADD COLUMN revision_pm BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'metre_responsable') THEN
        ALTER TABLE eventos ADD COLUMN metre_responsable TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'metres') THEN
        ALTER TABLE eventos ADD COLUMN metres TEXT[] DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'logistica_evento') THEN
        ALTER TABLE eventos ADD COLUMN logistica_evento TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'camareros_ext') THEN
        ALTER TABLE eventos ADD COLUMN camareros_ext INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'logisticos_ext') THEN
        ALTER TABLE eventos ADD COLUMN logisticos_ext INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'pedido_ett') THEN
        ALTER TABLE eventos ADD COLUMN pedido_ett BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'ped_almacen_bio_bod') THEN
        ALTER TABLE eventos ADD COLUMN ped_almacen_bio_bod BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'pedido_walkies') THEN
        ALTER TABLE eventos ADD COLUMN pedido_walkies BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'pedido_hielo') THEN
        ALTER TABLE eventos ADD COLUMN pedido_hielo BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'pedido_transporte') THEN
        ALTER TABLE eventos ADD COLUMN pedido_transporte BOOLEAN DEFAULT false;
    END IF;

    -- COCINA
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'produccion_cocina_cpr') THEN
        ALTER TABLE eventos ADD COLUMN produccion_cocina_cpr TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'jefe_cocina') THEN
        ALTER TABLE eventos ADD COLUMN jefe_cocina TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'cocina') THEN
        ALTER TABLE eventos ADD COLUMN cocina TEXT[] DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'cocineros_ext') THEN
        ALTER TABLE eventos ADD COLUMN cocineros_ext INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'logisticos_ext_cocina') THEN
        ALTER TABLE eventos ADD COLUMN logisticos_ext_cocina INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'gastro_actualizada') THEN
        ALTER TABLE eventos ADD COLUMN gastro_actualizada BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'pedido_gastro') THEN
        ALTER TABLE eventos ADD COLUMN pedido_gastro BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'pedido_cocina') THEN
        ALTER TABLE eventos ADD COLUMN pedido_cocina BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'personal_cocina') THEN
        ALTER TABLE eventos ADD COLUMN personal_cocina BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'servicios_extra') THEN
        ALTER TABLE eventos ADD COLUMN servicios_extra TEXT[] DEFAULT '{}';
    END IF;

    -- LOGISTICA
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'edo_almacen') THEN
        ALTER TABLE eventos ADD COLUMN edo_almacen TEXT DEFAULT 'EP';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'mozo') THEN
        ALTER TABLE eventos ADD COLUMN mozo TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'estado_logistica') THEN
        ALTER TABLE eventos ADD COLUMN estado_logistica TEXT DEFAULT 'Pendiente';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'carambucos') THEN
        ALTER TABLE eventos ADD COLUMN carambucos INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'jaulas') THEN
        ALTER TABLE eventos ADD COLUMN jaulas TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'pallets') THEN
        ALTER TABLE eventos ADD COLUMN pallets TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'proveedor') THEN
        ALTER TABLE eventos ADD COLUMN proveedor TEXT[] DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'h_recogida_cocina') THEN
        ALTER TABLE eventos ADD COLUMN h_recogida_cocina TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'transporte') THEN
        ALTER TABLE eventos ADD COLUMN transporte TEXT[] DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'h_recogida_pre_evento') THEN
        ALTER TABLE eventos ADD COLUMN h_recogida_pre_evento TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'h_descarga_evento') THEN
        ALTER TABLE eventos ADD COLUMN h_descarga_evento TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'h_recogida_pos_evento') THEN
        ALTER TABLE eventos ADD COLUMN h_recogida_pos_evento TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'h_descarga_pos_evento') THEN
        ALTER TABLE eventos ADD COLUMN h_descarga_pos_evento TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'alquiler_lanzado') THEN
        ALTER TABLE eventos ADD COLUMN alquiler_lanzado BOOLEAN DEFAULT false;
    END IF;

END $$;

-- 2. Indexes and Comments
CREATE INDEX IF NOT EXISTS idx_eventos_metre_responsable ON eventos(metre_responsable);
CREATE INDEX IF NOT EXISTS idx_eventos_jefe_cocina ON eventos(jefe_cocina);
CREATE INDEX IF NOT EXISTS idx_eventos_mozo ON eventos(mozo);

COMMENT ON COLUMN eventos.metre_responsable IS 'Referencia (TEXT) al Maître principal (tabla personal)';
COMMENT ON COLUMN eventos.jefe_cocina IS 'Referencia (TEXT) al Jefe de Cocina (tabla personal)';
COMMENT ON COLUMN eventos.metres IS 'Array de IDs (TEXT) de personal de apoyo en Sala';
COMMENT ON COLUMN eventos.cocina IS 'Array de IDs (TEXT) de personal de apoyo en Cocina';
COMMENT ON COLUMN eventos.mozo IS 'Referencia (TEXT) al Mozo/Logístico (tabla personal)';
