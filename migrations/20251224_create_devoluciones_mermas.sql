-- Migration: Create tables for Devoluciones, Mermas and Incidencias
-- Date: 2025-12-24
-- Refined based on current Supabase structure (eventos, articulos)

-- 1. Tabla para Devoluciones
CREATE TABLE IF NOT EXISTS os_devoluciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id VARCHAR(255) NOT NULL, -- Referencia a eventos.numero_expediente
    articulo_id VARCHAR(255) NOT NULL, -- Referencia a articulos.erp_id
    cantidad INTEGER NOT NULL CHECK (cantidad >= 0),
    usuario_id UUID REFERENCES auth.users(id),
    fecha TIMESTAMPTZ DEFAULT NOW(),
    modulo VARCHAR(100),
    observaciones TEXT,
    es_correccion BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_os_devoluciones_os FOREIGN KEY (os_id) REFERENCES eventos(numero_expediente) ON DELETE CASCADE
);

-- 2. Tabla para Mermas
CREATE TABLE IF NOT EXISTS os_mermas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id VARCHAR(255) NOT NULL, -- Referencia a eventos.numero_expediente
    articulo_id VARCHAR(255) NOT NULL, -- Referencia a articulos.erp_id
    cantidad INTEGER NOT NULL CHECK (cantidad >= 0),
    motivo VARCHAR(255),
    coste_impacto NUMERIC(12, 2) DEFAULT 0, -- Usando NUMERIC(12, 2) para precisión de 2 decimales
    usuario_id UUID REFERENCES auth.users(id),
    fecha TIMESTAMPTZ DEFAULT NOW(),
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_os_mermas_os FOREIGN KEY (os_id) REFERENCES eventos(numero_expediente) ON DELETE CASCADE
);

-- 3. Tabla para Incidencias de Material
CREATE TABLE IF NOT EXISTS os_incidencias_material (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id VARCHAR(255) NOT NULL, -- Referencia a eventos.numero_expediente
    articulo_id VARCHAR(255) NOT NULL, -- Referencia a articulos.erp_id
    descripcion TEXT NOT NULL,
    fotos TEXT[] DEFAULT '{}',
    usuario_id UUID REFERENCES auth.users(id),
    fecha TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_os_incidencias_os FOREIGN KEY (os_id) REFERENCES eventos(numero_expediente) ON DELETE CASCADE
);

-- 4. Tabla para Estado de Cierre de OS
CREATE TABLE IF NOT EXISTS os_estados_cierre (
    os_id VARCHAR(255) PRIMARY KEY, -- Referencia a eventos.numero_expediente
    cerrada BOOLEAN DEFAULT FALSE,
    fecha_cierre TIMESTAMPTZ,
    usuario_cierre UUID REFERENCES auth.users(id),
    motivo_reapertura TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_os_estados_cierre_os FOREIGN KEY (os_id) REFERENCES eventos(numero_expediente) ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_os_devoluciones_os_id ON os_devoluciones(os_id);
CREATE INDEX IF NOT EXISTS idx_os_mermas_os_id ON os_mermas(os_id);
CREATE INDEX IF NOT EXISTS idx_os_incidencias_os_id ON os_incidencias_material(os_id);

-- RLS Policies
ALTER TABLE os_devoluciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_mermas ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_incidencias_material ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_estados_cierre ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (lectura para todos, escritura para autenticados)
-- Nota: En un entorno real, esto se ajustaría por roles específicos.

CREATE POLICY "Lectura de devoluciones para todos" ON os_devoluciones FOR SELECT USING (true);
CREATE POLICY "Inserción de devoluciones para autenticados" ON os_devoluciones FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Actualización de devoluciones para autenticados" ON os_devoluciones FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Lectura de mermas para todos" ON os_mermas FOR SELECT USING (true);
CREATE POLICY "Inserción de mermas para autenticados" ON os_mermas FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Actualización de mermas para autenticados" ON os_mermas FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Lectura de incidencias para todos" ON os_incidencias_material FOR SELECT USING (true);
CREATE POLICY "Inserción de incidencias para autenticados" ON os_incidencias_material FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Actualización de incidencias para autenticados" ON os_incidencias_material FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Lectura de estados de cierre para todos" ON os_estados_cierre FOR SELECT USING (true);
CREATE POLICY "Gestión de estados de cierre para autenticados" ON os_estados_cierre FOR ALL USING (auth.role() = 'authenticated');

-- 5. Tabla para Gastos Atípicos (Migración de localStorage a Supabase)
-- Adaptada para usar numero_expediente como os_id
DROP TABLE IF EXISTS atipico_orders CASCADE;

CREATE TABLE atipico_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id VARCHAR(255) NOT NULL, -- Referencia a eventos.numero_expediente
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    concepto VARCHAR(255) NOT NULL,
    observaciones TEXT,
    precio NUMERIC(12, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Pendiente' CHECK (status IN ('Pendiente', 'Aprobado', 'Rechazado')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_atipico_orders_os FOREIGN KEY (os_id) REFERENCES eventos(numero_expediente) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_atipico_orders_os_id ON atipico_orders(os_id);

ALTER TABLE atipico_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura de atipicos para todos" ON atipico_orders FOR SELECT USING (true);
CREATE POLICY "Gestión de atipicos para autenticados" ON atipico_orders FOR ALL USING (auth.role() = 'authenticated');

-- 6. Tabla para Logs de Logística (Auditoría específica)
CREATE TABLE IF NOT EXISTS os_logistica_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id VARCHAR(255) NOT NULL, -- Referencia a eventos.numero_expediente
    usuario_id UUID REFERENCES auth.users(id),
    accion VARCHAR(100) NOT NULL, -- 'REGISTRO_DEVOLUCION', 'REGISTRO_MERMA', 'CIERRE_OS', etc.
    detalles JSONB DEFAULT '{}',
    fecha TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_os_logistica_logs_os FOREIGN KEY (os_id) REFERENCES eventos(numero_expediente) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_os_logistica_logs_os_id ON os_logistica_logs(os_id);
ALTER TABLE os_logistica_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura de logs para todos" ON os_logistica_logs FOR SELECT USING (true);
CREATE POLICY "Inserción de logs para autenticados" ON os_logistica_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
