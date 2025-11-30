-- ============================================
-- MIGRACIÓN COMPLETA: LocalStorage → Supabase
-- ============================================
-- Este script crea todas las tablas faltantes para eliminar la dependencia de localStorage
-- Ejecutar después de supabase_schema.sql

-- ============================================
-- SECCIÓN 1: ENTREGAS Y PEDIDOS
-- ============================================

-- Tabla para Entregas (vertical de negocio separada de Catering)
CREATE TABLE IF NOT EXISTS entregas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_expediente TEXT UNIQUE NOT NULL,
    nombre_evento TEXT NOT NULL,
    cliente_id UUID REFERENCES clientes(id),
    fecha_inicio TIMESTAMPTZ NOT NULL,
    fecha_fin TIMESTAMPTZ NOT NULL,
    estado TEXT CHECK (estado IN ('BORRADOR', 'CONFIRMADO', 'EJECUTADO', 'CANCELADO')) DEFAULT 'BORRADOR',
    vertical TEXT DEFAULT 'Entregas',
    comercial_id UUID,
    facturacion NUMERIC DEFAULT 0,
    comisiones_agencia NUMERIC DEFAULT 0,
    comisiones_canon NUMERIC DEFAULT 0,
    tarifa TEXT CHECK (tarifa IN ('IFEMA', 'NORMAL')),
    data JSONB DEFAULT '{}'::jsonb, -- Para campos adicionales
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pedidos de Entrega (Hitos de entrega)
CREATE TABLE IF NOT EXISTS pedidos_entrega (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entrega_id UUID REFERENCES entregas(id) ON DELETE CASCADE,
    hitos JSONB DEFAULT '[]'::jsonb, -- Array de hitos con items, portes, camareros
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SECCIÓN 2: PEDIDOS DE LOGÍSTICA
-- ============================================

-- Pedidos de Material
CREATE TABLE IF NOT EXISTS pedidos_material (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evento_id UUID REFERENCES eventos(id) ON DELETE CASCADE,
    articulo_id UUID,
    nombre_articulo TEXT NOT NULL,
    cantidad NUMERIC NOT NULL,
    precio_unitario NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    categoria TEXT,
    estado TEXT DEFAULT 'Pendiente',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pedidos de Transporte
CREATE TABLE IF NOT EXISTS pedidos_transporte (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evento_id UUID REFERENCES eventos(id) ON DELETE CASCADE,
    tipo_transporte TEXT,
    proveedor_id UUID REFERENCES proveedores(id),
    fecha_servicio TIMESTAMPTZ,
    precio NUMERIC DEFAULT 0,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pedidos de Hielo
CREATE TABLE IF NOT EXISTS pedidos_hielo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evento_id UUID REFERENCES eventos(id) ON DELETE CASCADE,
    tipo_hielo TEXT,
    cantidad_kg NUMERIC NOT NULL,
    precio_kg NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pedidos de Decoración
CREATE TABLE IF NOT EXISTS pedidos_decoracion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evento_id UUID REFERENCES eventos(id) ON DELETE CASCADE,
    concepto TEXT NOT NULL,
    proveedor_id UUID REFERENCES proveedores(id),
    precio NUMERIC DEFAULT 0,
    descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pedidos Atípicos
CREATE TABLE IF NOT EXISTS pedidos_atipicos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evento_id UUID REFERENCES eventos(id) ON DELETE CASCADE,
    concepto TEXT NOT NULL,
    proveedor_id UUID REFERENCES proveedores(id),
    precio NUMERIC DEFAULT 0,
    descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SECCIÓN 3: PERSONAL Y RRHH
-- ============================================

-- Personal MICE (asignaciones por evento)
CREATE TABLE IF NOT EXISTS personal_mice_asignaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evento_id UUID REFERENCES eventos(id) ON DELETE CASCADE,
    personal_id TEXT REFERENCES personal(id),
    categoria TEXT,
    hora_entrada TIME,
    hora_salida TIME,
    hora_entrada_real TIME,
    hora_salida_real TIME,
    precio_hora NUMERIC DEFAULT 0,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Personal Externo por Evento (Turnos de ETT)
CREATE TABLE IF NOT EXISTS personal_externo_eventos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evento_id UUID REFERENCES eventos(id) ON DELETE CASCADE,
    proveedor_id UUID REFERENCES proveedores(id),
    turnos JSONB DEFAULT '[]'::jsonb, -- Array de turnos con asignaciones
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ajustes de Personal Externo
CREATE TABLE IF NOT EXISTS personal_externo_ajustes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evento_id UUID REFERENCES eventos(id) ON DELETE CASCADE,
    concepto TEXT NOT NULL,
    importe NUMERIC NOT NULL,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Personal de Entrega
CREATE TABLE IF NOT EXISTS personal_entrega (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entrega_id UUID REFERENCES entregas(id) ON DELETE CASCADE,
    turnos JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Solicitudes de Personal CPR
CREATE TABLE IF NOT EXISTS solicitudes_personal_cpr (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fecha_necesidad DATE NOT NULL,
    turno TEXT CHECK (turno IN ('MAÑANA', 'TARDE', 'NOCHE')),
    categoria_solicitada TEXT,
    cantidad_personas INT NOT NULL,
    motivo TEXT,
    estado TEXT CHECK (estado IN ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'CUBIERTA')) DEFAULT 'PENDIENTE',
    solicitante_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SECCIÓN 4: PRODUCCIÓN (CPR)
-- ============================================

-- Excedentes de Producción
CREATE TABLE IF NOT EXISTS excedentes_produccion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    elaboracion_id UUID REFERENCES elaboraciones(id),
    lote TEXT,
    cantidad NUMERIC NOT NULL,
    fecha_produccion DATE,
    fecha_caducidad DATE,
    ubicacion TEXT,
    estado TEXT CHECK (estado IN ('DISPONIBLE', 'RESERVADO', 'CONSUMIDO', 'DESCARTADO')) DEFAULT 'DISPONIBLE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock de Elaboraciones (Inventario en tiempo real)
CREATE TABLE IF NOT EXISTS stock_elaboraciones (
    elaboracion_id UUID PRIMARY KEY REFERENCES elaboraciones(id),
    cantidad_disponible NUMERIC DEFAULT 0,
    ultima_actualizacion TIMESTAMPTZ DEFAULT NOW()
);

-- Estados de Picking (por OF)
CREATE TABLE IF NOT EXISTS picking_estados (
    of_id UUID PRIMARY KEY REFERENCES ordenes_fabricacion(id),
    items_completados JSONB DEFAULT '[]'::jsonb,
    estado TEXT CHECK (estado IN ('Pendiente', 'En Proceso', 'Completado')) DEFAULT 'Pendiente',
    responsable_id UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Estados de Picking de Entregas (por Hito)
CREATE TABLE IF NOT EXISTS picking_entregas_estados (
    hito_id TEXT PRIMARY KEY, -- ID del hito dentro del pedido de entrega
    checked_items JSONB DEFAULT '[]'::jsonb,
    incidencias JSONB DEFAULT '[]'::jsonb,
    foto_url TEXT,
    estado TEXT CHECK (estado IN ('Pendiente', 'En Proceso', 'Completado')) DEFAULT 'Pendiente',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hojas de Retorno
CREATE TABLE IF NOT EXISTS hojas_retorno (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evento_id UUID REFERENCES eventos(id),
    departamento TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    estado TEXT DEFAULT 'Pendiente',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Incidencias de Retorno
CREATE TABLE IF NOT EXISTS incidencias_retorno (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evento_id UUID REFERENCES eventos(id),
    articulo TEXT,
    tipo_incidencia TEXT CHECK (tipo_incidencia IN ('ROTURA', 'PERDIDA', 'DETERIORO')),
    cantidad INT,
    coste_estimado NUMERIC,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SECCIÓN 5: COMERCIAL Y CONFIGURACIÓN
-- ============================================

-- Briefings Comerciales
CREATE TABLE IF NOT EXISTS comercial_briefings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evento_id UUID REFERENCES eventos(id) ON DELETE CASCADE,
    contenido JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ajustes Comerciales (Descuentos, Recargos)
CREATE TABLE IF NOT EXISTS comercial_ajustes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evento_id UUID REFERENCES eventos(id) ON DELETE CASCADE,
    concepto TEXT NOT NULL,
    importe NUMERIC NOT NULL,
    tipo TEXT CHECK (tipo IN ('DESCUENTO', 'RECARGO')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Objetivos de Gasto (Plantillas)
CREATE TABLE IF NOT EXISTS objetivos_gasto_plantillas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    configuracion JSONB DEFAULT '{}'::jsonb,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Costes Reales de Cuenta de Explotación
CREATE TABLE IF NOT EXISTS cta_costes_reales (
    evento_id UUID PRIMARY KEY REFERENCES eventos(id),
    costes JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comentarios de Cuenta de Explotación
CREATE TABLE IF NOT EXISTS cta_comentarios (
    evento_id UUID PRIMARY KEY REFERENCES eventos(id),
    comentarios JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pruebas de Menú
CREATE TABLE IF NOT EXISTS pruebas_menu (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evento_id UUID REFERENCES eventos(id) ON DELETE CASCADE,
    fecha_prueba DATE,
    coste_prueba_menu NUMERIC DEFAULT 0,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SECCIÓN 6: CATÁLOGOS Y MAESTROS
-- ============================================

-- Ingredientes Internos (con alérgenos y revisiones)
CREATE TABLE IF NOT EXISTS ingredientes_internos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_ingrediente TEXT NOT NULL,
    producto_erp_link_id UUID REFERENCES articulos_erp(id),
    alergenos_presentes TEXT[] DEFAULT '{}',
    alergenos_trazas TEXT[] DEFAULT '{}',
    historial_revisiones JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categorías de Recetas
CREATE TABLE IF NOT EXISTS categorias_recetas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT UNIQUE NOT NULL,
    descripcion TEXT,
    orden INT DEFAULT 0
);

-- Artículos de Catering (Catálogo completo)
CREATE TABLE IF NOT EXISTS articulos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    erp_id TEXT,
    nombre TEXT NOT NULL,
    categoria TEXT,
    subcategoria TEXT,
    es_habitual BOOLEAN DEFAULT FALSE,
    precio_venta NUMERIC DEFAULT 0,
    precio_alquiler NUMERIC DEFAULT 0,
    precio_reposicion NUMERIC DEFAULT 0,
    unidad_venta TEXT,
    stock_seguridad INT DEFAULT 0,
    tipo TEXT CHECK (tipo IN ('VENTA', 'ALQUILER', 'AMBOS')),
    loc TEXT, -- Ubicación en almacén
    imagen TEXT,
    producido_por_partner BOOLEAN DEFAULT FALSE,
    partner_id UUID REFERENCES proveedores(id),
    receta_id UUID REFERENCES recetas(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tipos de Servicio
CREATE TABLE IF NOT EXISTS tipos_servicio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT UNIQUE NOT NULL,
    descripcion TEXT
);

-- Categorías de Personal
CREATE TABLE IF NOT EXISTS categorias_personal (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT UNIQUE NOT NULL,
    precio_hora_base NUMERIC DEFAULT 0,
    departamento TEXT
);

-- Catálogo de Decoración
CREATE TABLE IF NOT EXISTS decoracion_catalogo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    proveedor_id UUID REFERENCES proveedores(id),
    precio_referencia NUMERIC DEFAULT 0,
    descripcion TEXT
);

-- Catálogo de Atípicos
CREATE TABLE IF NOT EXISTS atipicos_catalogo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    proveedor_id UUID REFERENCES proveedores(id),
    precio_referencia NUMERIC DEFAULT 0,
    descripcion TEXT
);

-- Formatos de Expedición
CREATE TABLE IF NOT EXISTS formatos_expedicion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT UNIQUE NOT NULL,
    capacidad_unidades INT,
    tipo_contenedor TEXT
);

-- Plantillas de Pedidos
CREATE TABLE IF NOT EXISTS pedido_plantillas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    categoria TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Productos de Venta (Catálogo comercial)
CREATE TABLE IF NOT EXISTS productos_venta (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    descripcion_comercial TEXT,
    precio_venta NUMERIC DEFAULT 0,
    categoria TEXT,
    receta_id UUID REFERENCES recetas(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Histórico de Precios ERP
CREATE TABLE IF NOT EXISTS historico_precios_erp (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    articulo_erp_id UUID REFERENCES articulos_erp(id),
    precio NUMERIC NOT NULL,
    fecha_vigencia DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Costes Fijos CPR
CREATE TABLE IF NOT EXISTS costes_fijos_cpr (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    concepto TEXT NOT NULL,
    importe_mensual NUMERIC NOT NULL,
    categoria TEXT,
    activo BOOLEAN DEFAULT TRUE
);

-- Objetivos Mensuales CPR
CREATE TABLE IF NOT EXISTS objetivos_mensuales_cpr (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mes DATE NOT NULL,
    objetivo_produccion NUMERIC,
    objetivo_coste NUMERIC,
    observaciones TEXT
);

-- Tipos de Transporte
CREATE TABLE IF NOT EXISTS tipos_transporte (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT UNIQUE NOT NULL,
    proveedor_id UUID REFERENCES proveedores(id),
    precio_base NUMERIC DEFAULT 0
);

-- Precios (Configuración de precios)
CREATE TABLE IF NOT EXISTS precios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    concepto TEXT NOT NULL,
    valor NUMERIC NOT NULL,
    tipo TEXT,
    vigencia_desde DATE,
    vigencia_hasta DATE
);

-- ============================================
-- SECCIÓN 7: LOGS Y AUDITORÍA
-- ============================================

-- Activity Logs (Auditoría de acciones)
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    accion TEXT NOT NULL,
    entidad TEXT,
    entidad_id UUID,
    detalles JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Estados de Pedidos de Partners
CREATE TABLE IF NOT EXISTS partner_pedidos_estados (
    pedido_id TEXT PRIMARY KEY,
    estado JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SECCIÓN 8: USUARIOS Y PORTAL
-- ============================================

-- Usuarios del Portal (Clientes/Partners con acceso)
CREATE TABLE IF NOT EXISTS portal_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    nombre TEXT,
    tipo TEXT CHECK (tipo IN ('CLIENTE', 'PARTNER', 'PROVEEDOR')),
    entidad_id UUID, -- ID de cliente o proveedor
    permisos JSONB DEFAULT '{}'::jsonb,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- HABILITAR RLS EN TODAS LAS NUEVAS TABLAS
-- ============================================

ALTER TABLE entregas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_entrega ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_material ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_transporte ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_hielo ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_decoracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_atipicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_mice_asignaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_externo_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_externo_ajustes ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_entrega ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_personal_cpr ENABLE ROW LEVEL SECURITY;
ALTER TABLE excedentes_produccion ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_elaboraciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE picking_estados ENABLE ROW LEVEL SECURITY;
ALTER TABLE picking_entregas_estados ENABLE ROW LEVEL SECURITY;
ALTER TABLE hojas_retorno ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidencias_retorno ENABLE ROW LEVEL SECURITY;
ALTER TABLE comercial_briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE comercial_ajustes ENABLE ROW LEVEL SECURITY;
ALTER TABLE objetivos_gasto_plantillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cta_costes_reales ENABLE ROW LEVEL SECURITY;
ALTER TABLE cta_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE pruebas_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredientes_internos ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_recetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE articulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_servicio ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_personal ENABLE ROW LEVEL SECURITY;
ALTER TABLE decoracion_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE atipicos_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE formatos_expedicion ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_plantillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos_venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_precios_erp ENABLE ROW LEVEL SECURITY;
ALTER TABLE costes_fijos_cpr ENABLE ROW LEVEL SECURITY;
ALTER TABLE objetivos_mensuales_cpr ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_transporte ENABLE ROW LEVEL SECURITY;
ALTER TABLE precios ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_pedidos_estados ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS BÁSICAS (Permitir todo a usuarios autenticados)
-- ============================================
-- NOTA: En producción, estas políticas deben ser más restrictivas según roles

CREATE POLICY "Allow all for authenticated" ON entregas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON pedidos_entrega FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON pedidos_material FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON pedidos_transporte FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON pedidos_hielo FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON pedidos_decoracion FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON pedidos_atipicos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON personal_mice_asignaciones FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON personal_externo_eventos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON personal_externo_ajustes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON personal_entrega FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON solicitudes_personal_cpr FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON excedentes_produccion FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON stock_elaboraciones FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON picking_estados FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON picking_entregas_estados FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON hojas_retorno FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON incidencias_retorno FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON comercial_briefings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON comercial_ajustes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON objetivos_gasto_plantillas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON cta_costes_reales FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON cta_comentarios FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON pruebas_menu FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON ingredientes_internos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON categorias_recetas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON articulos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON tipos_servicio FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON categorias_personal FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON decoracion_catalogo FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON atipicos_catalogo FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON formatos_expedicion FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON pedido_plantillas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON productos_venta FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON historico_precios_erp FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON costes_fijos_cpr FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON objetivos_mensuales_cpr FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON tipos_transporte FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON precios FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON activity_logs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON partner_pedidos_estados FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON portal_users FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ============================================

CREATE INDEX idx_entregas_estado ON entregas(estado);
CREATE INDEX idx_entregas_fecha ON entregas(fecha_inicio);
CREATE INDEX idx_pedidos_material_evento ON pedidos_material(evento_id);
CREATE INDEX idx_pedidos_transporte_evento ON pedidos_transporte(evento_id);
CREATE INDEX idx_personal_mice_evento ON personal_mice_asignaciones(evento_id);
CREATE INDEX idx_excedentes_estado ON excedentes_produccion(estado);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_fecha ON activity_logs(created_at);
