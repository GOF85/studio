-- Script para añadir campos calculados a la tabla personal

-- Añadir columna iniciales
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal' AND column_name = 'iniciales') THEN
        ALTER TABLE personal ADD COLUMN iniciales TEXT;
    END IF;
END $$;

-- Añadir columna nombre_compacto
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal' AND column_name = 'nombre_compacto') THEN
        ALTER TABLE personal ADD COLUMN nombre_compacto TEXT;
    END IF;
END $$;
