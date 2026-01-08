
-- Crear tabla de catálogo de personal externo
CREATE TABLE IF NOT EXISTS public.personal_externo_catalogo (
    id TEXT PRIMARY KEY, -- DNI o ID único
    proveedor_id UUID REFERENCES public.proveedores(id) ON DELETE SET NULL,
    nombre TEXT NOT NULL,
    apellido1 TEXT NOT NULL,
    apellido2 TEXT,
    categoria TEXT, -- Ej: "Camarero", "Cocinero"
    nombre_completo TEXT GENERATED ALWAYS AS (nombre || ' ' || apellido1 || COALESCE(' ' || apellido2, '')) STORED,
    nombre_compacto TEXT GENERATED ALWAYS AS (nombre || ' ' || apellido1) STORED,
    telefono TEXT,
    email TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.personal_externo_catalogo ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS (permitir todo por ahora para que funcione la operativa)
CREATE POLICY "Permitir todo a usuarios autenticados" 
ON public.personal_externo_catalogo 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_personal_externo_catalogo_updated_at
    BEFORE UPDATE ON public.personal_externo_catalogo
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
