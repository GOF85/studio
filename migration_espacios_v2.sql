-- 1. Crear nueva estructura normalizada
CREATE TABLE IF NOT EXISTS espacios_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Identificación (normalizado para búsquedas)
  nombre TEXT NOT NULL,
  ciudad TEXT NOT NULL,
  provincia TEXT NOT NULL,
  calle TEXT,
  codigo_postal TEXT,
  zona TEXT,
  
  -- Descripciones (crítico para IA)
  descripcion_corta TEXT,
  descripcion_larga TEXT,
  
  -- Tipos y categorización
  tipos_espacio TEXT[],
  estilos TEXT[],
  tags TEXT[],
  ideal_para TEXT[],
  
  -- Capacidades básicas
  aforo_max_cocktail INT,
  aforo_max_banquete INT,
  
  -- Evaluación MICE
  proveedor_id UUID REFERENCES proveedores(id),
  relacion_comercial TEXT CHECK (relacion_comercial IN (
    'Exclusividad', 'Homologado Preferente', 'Homologado', 'Puntual', 'Sin Relación'
  )),
  valoracion_comercial INT CHECK (valoracion_comercial BETWEEN 1 AND 5),
  valoracion_operaciones INT CHECK (valoracion_operaciones BETWEEN 1 AND 5),
  perfil_cliente_ideal TEXT,
  puntos_fuertes TEXT[],
  puntos_debiles TEXT[],
  
  -- Logística crítica
  acceso_vehiculos TEXT,
  horario_montaje_desmontaje TEXT,
  potencia_total TEXT,
  tipo_cocina TEXT CHECK (tipo_cocina IN ('Cocina completa', 'Office de regeneración', 'Sin cocina')),
  limitador_sonido BOOLEAN DEFAULT false,
  dificultad_montaje INT CHECK (dificultad_montaje BETWEEN 1 AND 5),
  penalizacion_personal_montaje NUMERIC,
  
  -- Experiencia invitado
  aparcamiento TEXT,
  transporte_publico TEXT,
  accesibilidad_asistentes TEXT,
  conexion_wifi TEXT,
  
  -- Económico
  precio_orientativo_alquiler NUMERIC,
  canon_espacio_porcentaje NUMERIC,
  canon_espacio_fijo NUMERIC,
  
  -- Resto de datos en JSONB (campos menos críticos)
  data_extendida JSONB DEFAULT '{}'::jsonb,
  
  -- Multimedia
  imagen_principal_url TEXT,
  carpeta_drive TEXT,
  visita_virtual_url TEXT,
  
  -- IA generado
  resumen_ejecutivo_ia TEXT,
  ultima_generacion_ia TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

-- 2. Tabla de salas
CREATE TABLE IF NOT EXISTS espacios_salas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  espacio_id UUID NOT NULL REFERENCES espacios_v2(id) ON DELETE CASCADE,
  nombre_sala TEXT NOT NULL,
  m2 INT,
  dimensiones TEXT,
  altura_max NUMERIC,
  altura_min NUMERIC,
  aforo_teatro INT,
  aforo_escuela INT,
  aforo_cabaret INT,
  aforo_cocktail_sala INT,
  es_diafana BOOLEAN DEFAULT false,
  tiene_luz_natural BOOLEAN DEFAULT false,
  data_extendida JSONB DEFAULT '{}'::jsonb,
  orden INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de contactos
CREATE TABLE IF NOT EXISTS espacios_contactos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  espacio_id UUID NOT NULL REFERENCES espacios_v2(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  cargo TEXT,
  telefono TEXT,
  email TEXT,
  es_principal BOOLEAN DEFAULT false,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de cuadros eléctricos
CREATE TABLE IF NOT EXISTS espacios_cuadros_electricos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  espacio_id UUID NOT NULL REFERENCES espacios_v2(id) ON DELETE CASCADE,
  ubicacion TEXT NOT NULL,
  potencia TEXT NOT NULL,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla de imágenes
CREATE TABLE IF NOT EXISTS espacios_imagenes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  espacio_id UUID NOT NULL REFERENCES espacios_v2(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  es_principal BOOLEAN DEFAULT false,
  descripcion TEXT,
  orden INT DEFAULT 0,
  categoria TEXT CHECK (categoria IN ('foto', 'plano')) DEFAULT 'foto',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Índices para búsqueda optimizada
CREATE INDEX IF NOT EXISTS idx_espacios_ciudad ON espacios_v2(ciudad);
CREATE INDEX IF NOT EXISTS idx_espacios_provincia ON espacios_v2(provincia);
CREATE INDEX IF NOT EXISTS idx_espacios_relacion ON espacios_v2(relacion_comercial);
CREATE INDEX IF NOT EXISTS idx_espacios_valoracion_comercial ON espacios_v2(valoracion_comercial);
CREATE INDEX IF NOT EXISTS idx_espacios_tipos ON espacios_v2 USING GIN(tipos_espacio);
CREATE INDEX IF NOT EXISTS idx_espacios_tags ON espacios_v2 USING GIN(tags);

-- 7. Full-text search
ALTER TABLE espacios_v2 ADD COLUMN IF NOT EXISTS busqueda_texto tsvector
  GENERATED ALWAYS AS (
    to_tsvector('spanish', 
      coalesce(nombre, '') || ' ' || 
      coalesce(descripcion_corta, '') || ' ' || 
      coalesce(descripcion_larga, '') || ' ' ||
      coalesce(ciudad, '')
    )
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_espacios_busqueda ON espacios_v2 USING GIN(busqueda_texto);

-- 8. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_espacios_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_espacios_updated_at ON espacios_v2;
CREATE TRIGGER trigger_espacios_updated_at
  BEFORE UPDATE ON espacios_v2
  FOR EACH ROW
  EXECUTE FUNCTION update_espacios_timestamp();

-- 9. RLS Policies (ejemplo básico)
ALTER TABLE espacios_v2 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS espacios_read_all ON espacios_v2;
CREATE POLICY espacios_read_all ON espacios_v2 FOR SELECT USING (true);
DROP POLICY IF EXISTS espacios_write_authenticated ON espacios_v2;
CREATE POLICY espacios_write_authenticated ON espacios_v2 FOR ALL 
  USING (auth.role() = 'authenticated');
