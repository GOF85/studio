-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROVEEDORES
CREATE TABLE proveedores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    contacto JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. FAMILIAS (Categorías)
CREATE TABLE familias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    categoria_padre TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ARTICULOS ERP (Productos base)
CREATE TABLE articulos_erp (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    referencia_proveedor TEXT,
    proveedor_id UUID REFERENCES proveedores(id),
    familia_id UUID REFERENCES familias(id),
    precio_compra NUMERIC DEFAULT 0,
    unidad_medida TEXT CHECK (unidad_medida IN ('KG', 'L', 'UD')),
    merma_defecto NUMERIC DEFAULT 0,
    alergenos TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ELABORACIONES (Salsas, Masas, Pre-producción)
CREATE TABLE elaboraciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    partida TEXT CHECK (partida IN ('FRIO', 'CALIENTE', 'PASTELERIA')),
    unidad_produccion TEXT,
    instrucciones TEXT,
    caducidad_dias INT DEFAULT 3,
    coste_unitario NUMERIC DEFAULT 0, -- Calculado
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ELABORACION COMPONENTES (Ingredientes de una elaboración)
CREATE TABLE elaboracion_componentes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    elaboracion_padre_id UUID REFERENCES elaboraciones(id) ON DELETE CASCADE,
    tipo_componente TEXT CHECK (tipo_componente IN ('ARTICULO', 'ELABORACION')),
    componente_id UUID NOT NULL, -- ID de articulos_erp o elaboraciones
    cantidad_neta NUMERIC NOT NULL,
    merma_aplicada NUMERIC DEFAULT 0
);

-- 6. RECETAS (Platos finales)
CREATE TABLE recetas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    descripcion_comercial TEXT,
    precio_venta NUMERIC DEFAULT 0,
    coste_teorico NUMERIC DEFAULT 0,
    estado TEXT CHECK (estado IN ('BORRADOR', 'ACTIVO', 'ARCHIVADO')) DEFAULT 'BORRADOR',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. RECETA DETALLES (Ingredientes de una receta)
CREATE TABLE receta_detalles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receta_id UUID REFERENCES recetas(id) ON DELETE CASCADE,
    tipo TEXT CHECK (tipo IN ('ARTICULO', 'ELABORACION')),
    item_id UUID NOT NULL,
    cantidad NUMERIC NOT NULL
);

-- 8. CLIENTES
CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    tipo TEXT, -- Empresa, Particular
    email TEXT,
    telefono TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. ESPACIOS (Lugares de eventos)
CREATE TABLE espacios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. EVENTOS (Service Orders)
CREATE TABLE eventos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_expediente TEXT UNIQUE NOT NULL, -- Ej: "2024-001"
    nombre_evento TEXT NOT NULL,
    cliente_id UUID REFERENCES clientes(id),
    espacio_id UUID REFERENCES espacios(id),
    fecha_inicio TIMESTAMPTZ NOT NULL,
    fecha_fin TIMESTAMPTZ NOT NULL,
    estado TEXT CHECK (estado IN ('BORRADOR', 'CONFIRMADO', 'EJECUTADO', 'CANCELADO')) DEFAULT 'BORRADOR',
    comensales INT DEFAULT 0,
    comercial_id UUID, -- Link a auth.users si fuera necesario
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. EVENTO LINEAS (Items del evento: Gastro, Material, Personal)
CREATE TABLE evento_lineas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evento_id UUID REFERENCES eventos(id) ON DELETE CASCADE,
    tipo TEXT CHECK (tipo IN ('GASTRONOMIA', 'MATERIAL', 'PERSONAL', 'TRANSPORTE')),
    articulo_id UUID, -- Puede ser NULL si es un concepto ad-hoc
    nombre_articulo TEXT NOT NULL, -- Snapshot
    cantidad NUMERIC NOT NULL,
    precio_unitario NUMERIC DEFAULT 0,
    coste_unitario NUMERIC DEFAULT 0,
    comentarios TEXT
);

-- 12. ORDENES DE FABRICACION (OF)
CREATE TABLE ordenes_fabricacion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evento_id UUID REFERENCES eventos(id),
    elaboracion_id UUID REFERENCES elaboraciones(id),
    cantidad_solicitada NUMERIC NOT NULL,
    cantidad_producida NUMERIC DEFAULT 0,
    fecha_produccion DATE,
    estado TEXT CHECK (estado IN ('PENDIENTE', 'EN_PROCESO', 'TERMINADO')) DEFAULT 'PENDIENTE',
    responsable_id UUID, -- Link a auth.users
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. PICKING LISTAS
CREATE TABLE picking_listas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evento_id UUID REFERENCES eventos(id),
    departamento TEXT CHECK (departamento IN ('MENAJE', 'BEBIDA', 'MOBILIARIO', 'COCINA')),
    estado TEXT CHECK (estado IN ('PENDIENTE', 'PARCIAL', 'COMPLETADO')) DEFAULT 'PENDIENTE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. PICKING ITEMS
CREATE TABLE picking_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lista_id UUID REFERENCES picking_listas(id) ON DELETE CASCADE,
    articulo_id UUID, -- Link a articulos_erp
    nombre_articulo TEXT NOT NULL, -- Snapshot
    cantidad_solicitada NUMERIC NOT NULL,
    cantidad_preparada NUMERIC DEFAULT 0,
    check_estado BOOLEAN DEFAULT FALSE,
    incidencia TEXT
);

-- 15. PERFILES (Usuarios extendidos)
CREATE TABLE perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    nombre_completo TEXT,
    rol TEXT CHECK (rol IN ('ADMIN', 'COCINA', 'ALMACEN', 'COMERCIAL', 'RRHH', 'PARTNER_PERSONAL', 'PARTNER_TRANSPORTE', 'PARTNER_GASTRONOMIA')) DEFAULT 'COMERCIAL',
    personal_id TEXT REFERENCES personal(id),
    proveedor_id UUID REFERENCES proveedores(id),
    estado TEXT CHECK (estado IN ('PENDIENTE', 'ACTIVO', 'BLOQUEADO')) DEFAULT 'PENDIENTE',
    avatar_url TEXT,
    updated_at TIMESTAMPTZ
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE familias ENABLE ROW LEVEL SECURITY;
ALTER TABLE articulos_erp ENABLE ROW LEVEL SECURITY;
ALTER TABLE elaboraciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE elaboracion_componentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE receta_detalles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE espacios ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE evento_lineas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_fabricacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE picking_listas ENABLE ROW LEVEL SECURITY;
ALTER TABLE picking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

-- Create simple policies (Allow read/write to authenticated users for now)
-- In production, these should be more restrictive based on roles.
CREATE POLICY "Allow all for authenticated users" ON proveedores FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON familias FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON articulos_erp FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON elaboraciones FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON elaboracion_componentes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON recetas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON receta_detalles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON clientes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON espacios FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON eventos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON evento_lineas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON ordenes_fabricacion FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON picking_listas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON picking_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON perfiles FOR ALL USING (auth.role() = 'authenticated');

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre_completo, rol)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'COMERCIAL');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 16. PERSONAL (Empleados Internos)
CREATE TABLE personal (
    id TEXT PRIMARY KEY, -- DNI/NIE
    nombre TEXT NOT NULL,
    apellido1 TEXT,
    apellido2 TEXT,
    nombre_completo TEXT, -- Computed or stored
    email TEXT UNIQUE,
    telefono TEXT,
    departamento TEXT,
    categoria TEXT,
    precio_hora NUMERIC DEFAULT 0,
    estado_acceso TEXT CHECK (estado_acceso IN ('PENDIENTE', 'ACTIVO', 'BLOQUEADO', 'NO_SOLICITADO')) DEFAULT 'NO_SOLICITADO',
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. PERSONAL EXTERNO (Trabajadores de ETTs)
CREATE TABLE personal_externo (
    id TEXT PRIMARY KEY, -- DNI/NIE
    proveedor_id UUID REFERENCES proveedores(id),
    nombre TEXT NOT NULL,
    apellido1 TEXT,
    apellido2 TEXT,
    nombre_completo TEXT,
    email TEXT,
    telefono TEXT,
    estado_acceso TEXT CHECK (estado_acceso IN ('PENDIENTE', 'ACTIVO', 'BLOQUEADO', 'NO_SOLICITADO')) DEFAULT 'NO_SOLICITADO',
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

