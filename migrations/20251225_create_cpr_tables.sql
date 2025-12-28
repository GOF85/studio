-- Migración para el Módulo CPR (Control de Explotación)

-- 1. Costes Fijos CPR
CREATE TABLE IF NOT EXISTS cpr_costes_fijos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concepto TEXT NOT NULL,
    importe_mensual NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Objetivos CPR
CREATE TABLE IF NOT EXISTS cpr_objetivos (
    mes TEXT PRIMARY KEY, -- Formato YYYY-MM
    presupuesto_ventas NUMERIC DEFAULT 0,
    presupuesto_cesion_personal NUMERIC DEFAULT 0,
    presupuesto_gastos_mp NUMERIC DEFAULT 0,
    presupuesto_gastos_personal_mice NUMERIC DEFAULT 0,
    presupuesto_gastos_personal_externo NUMERIC DEFAULT 0,
    presupuesto_otros_gastos NUMERIC DEFAULT 0,
    presupuesto_personal_solicitado_cpr NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Solicitudes de Personal CPR
CREATE TABLE IF NOT EXISTS cpr_solicitudes_personal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha_solicitud TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    solicitado_por TEXT,
    fecha_servicio DATE NOT NULL,
    hora_inicio TEXT,
    hora_fin TEXT,
    partida TEXT,
    categoria TEXT,
    cantidad INTEGER DEFAULT 1,
    motivo TEXT,
    estado TEXT DEFAULT 'Solicitado',
    proveedor_id UUID REFERENCES categorias_personal(id),
    coste_imputado NUMERIC DEFAULT 0,
    observaciones_rrhh TEXT,
    personal_asignado JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Cesiones de Personal
CREATE TABLE IF NOT EXISTS cpr_cesiones_personal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL,
    centro_coste TEXT NOT NULL,
    nombre TEXT NOT NULL,
    dni TEXT,
    tipo_servicio TEXT,
    hora_entrada TEXT,
    hora_salida TEXT,
    precio_hora NUMERIC DEFAULT 0,
    hora_entrada_real TEXT,
    hora_salida_real TEXT,
    comentarios TEXT,
    estado TEXT DEFAULT 'Solicitado',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Comentarios y Costes Reales por OS (para el dashboard CPR)
CREATE TABLE IF NOT EXISTS cpr_os_data (
    os_id UUID PRIMARY KEY REFERENCES eventos(id) ON DELETE CASCADE,
    comentarios JSONB DEFAULT '{}',
    costes_reales JSONB DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cpr_solicitudes_fecha ON cpr_solicitudes_personal(fecha_servicio);
CREATE INDEX IF NOT EXISTS idx_cpr_cesiones_fecha ON cpr_cesiones_personal(fecha);

-- RLS (Row Level Security) - Permitir todo para usuarios autenticados por ahora
ALTER TABLE cpr_costes_fijos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cpr_objetivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cpr_solicitudes_personal ENABLE ROW LEVEL SECURITY;
ALTER TABLE cpr_cesiones_personal ENABLE ROW LEVEL SECURITY;
ALTER TABLE cpr_os_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON cpr_costes_fijos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON cpr_objetivos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON cpr_solicitudes_personal FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON cpr_cesiones_personal FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON cpr_os_data FOR ALL USING (auth.role() = 'authenticated');
