-- Migration: OS Control Panel Overhaul
-- Date: 2026-01-18

-- Drop if they exist to ensure clean state with TEXT ids
DROP TABLE IF EXISTS os_panel_tareas CASCADE;
DROP TABLE IF EXISTS os_shared_links CASCADE;
DROP TABLE IF EXISTS os_panel_cambios CASCADE;
DROP TABLE IF EXISTS asignaciones_tareas_config CASCADE;

-- 1. Table for OS Tasks
CREATE TABLE os_panel_tareas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id TEXT NOT NULL, 
    titulo TEXT NOT NULL,
    descripcion TEXT,
    estado TEXT NOT NULL DEFAULT 'pending' CHECK (estado IN ('pending', 'completed')),
    rol_asignado TEXT, -- 'Maître', 'Cocina', 'Logística', 'PM'
    automatica BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Configuration for Automatic Tasks
CREATE TABLE IF NOT EXISTS asignaciones_tareas_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campo_trigger TEXT NOT NULL, -- The field name in 'eventos' (e.g., 'pedido_hielo')
    valor_trigger TEXT NOT NULL, -- The value that triggers (e.g., 'true')
    tarea_titulo TEXT NOT NULL,
    tarea_rol TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. External Shared Links (Read-Only)
CREATE TABLE IF NOT EXISTS os_shared_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id TEXT NOT NULL, -- Changed from UUID to TEXT
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3.5 Table for OS Change History (Audit)
CREATE TABLE IF NOT EXISTS os_panel_cambios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id TEXT NOT NULL, -- Changed from UUID to TEXT
    numero_expediente TEXT NOT NULL,
    usuario_id TEXT,
    usuario_email TEXT,
    pestaña TEXT NOT NULL,
    cambios JSONB NOT NULL, -- Array of {campo: string, valor_anterior: any, valor_nuevo: any}
    timestamp TIMESTAMPTZ DEFAULT now(),
    auto_guardado BOOLEAN DEFAULT true
);

-- 4. Initial Config for Automatic Tasks
INSERT INTO asignaciones_tareas_config (campo_trigger, valor_trigger, tarea_titulo, tarea_rol) VALUES
('pedido_hielo', 'true', 'Gestionar pedido de hielo', 'Logística'),
('pedido_ett', 'true', 'Confirmar ETT para el servicio', 'PM'),
('servicios_extra', 'Sushi', 'Organizar montaje de puesto de Sushi', 'Cocina'),
('servicios_extra', 'Jamonero', 'Asignar Jamonero externo', 'Sala'),
('pedido_walkies', 'true', 'Preparar walkie-talkies (batería cargada)', 'Sala'),
('pedido_transporte', 'true', 'Revisar logística de transporte', 'Logística'),
('personal_cocina', 'true', 'Revisar cuadrante personal cocina', 'Cocina');

-- 5. Trigger for Synchronization (Optional base sync)
-- Ensure 'ordre_servicio' and 'eventos' are synced if they are different tables but share fields.
-- In this project, 'eventos' seems to be the primary for OS Panel.

-- 6. Trigger to track changes in tasks
CREATE OR REPLACE FUNCTION update_os_panel_tareas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_os_panel_tareas_updated_at ON os_panel_tareas;
CREATE TRIGGER update_os_panel_tareas_updated_at
    BEFORE UPDATE ON os_panel_tareas
    FOR EACH ROW
    EXECUTE FUNCTION update_os_panel_tareas_updated_at();

-- 7. Add comments for documentation
COMMENT ON TABLE os_panel_tareas IS 'Tareas específicas autogeneradas o manuales para una OS';
COMMENT ON TABLE asignaciones_tareas_config IS 'Reglas de negocio para generar tareas basadas en booleanos de la OS';
COMMENT ON TABLE os_shared_links IS 'Tokens para acceso externo de solo lectura a la OS';
