-- Migración para el Módulo CPR - Producción (OFs y Elaboraciones)

-- 1. Elaboraciones (Maestro de recetas de producción)
CREATE TABLE IF NOT EXISTS cpr_elaboraciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    produccion_total NUMERIC DEFAULT 0,
    unidad_produccion TEXT,
    partida_produccion TEXT,
    componentes JSONB DEFAULT '[]',
    instrucciones_preparacion TEXT,
    fotos_produccion_urls JSONB DEFAULT '[]',
    video_produccion_url TEXT,
    formato_expedicion TEXT,
    ratio_expedicion NUMERIC DEFAULT 1,
    tipo_expedicion TEXT DEFAULT 'REFRIGERADO',
    coste_por_unidad NUMERIC DEFAULT 0,
    alergenos JSONB DEFAULT '[]',
    requiere_revision BOOLEAN DEFAULT FALSE,
    comentario_revision TEXT,
    fecha_revision TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Órdenes de Fabricación (OFs)
CREATE TABLE IF NOT EXISTS cpr_ordenes_fabricacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_produccion_prevista DATE NOT NULL,
    fecha_asignacion TIMESTAMP WITH TIME ZONE,
    fecha_inicio_produccion TIMESTAMP WITH TIME ZONE,
    fecha_finalizacion TIMESTAMP WITH TIME ZONE,
    elaboracion_id UUID REFERENCES cpr_elaboraciones(id),
    elaboracion_nombre TEXT,
    cantidad_total NUMERIC NOT NULL,
    cantidad_real NUMERIC,
    necesidad_total NUMERIC,
    unidad TEXT,
    partida_asignada TEXT,
    responsable TEXT,
    estado TEXT DEFAULT 'Pendiente', -- 'Pendiente' | 'Asignada' | 'En Proceso' | 'Finalizado' | 'Validado' | 'Incidencia'
    os_ids JSONB DEFAULT '[]',
    incidencia BOOLEAN DEFAULT FALSE,
    incidencia_observaciones TEXT,
    ok_calidad BOOLEAN DEFAULT FALSE,
    responsable_calidad TEXT,
    fecha_validacion_calidad TIMESTAMP WITH TIME ZONE,
    tipo_expedicion TEXT DEFAULT 'REFRIGERADO',
    consumos_reales JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cpr_of_fecha_prevista ON cpr_ordenes_fabricacion(fecha_produccion_prevista);
CREATE INDEX IF NOT EXISTS idx_cpr_of_estado ON cpr_ordenes_fabricacion(estado);
CREATE INDEX IF NOT EXISTS idx_cpr_of_elaboracion ON cpr_ordenes_fabricacion(elaboracion_id);

-- RLS
ALTER TABLE cpr_elaboraciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE cpr_ordenes_fabricacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON cpr_elaboraciones FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON cpr_ordenes_fabricacion FOR ALL USING (auth.role() = 'authenticated');
