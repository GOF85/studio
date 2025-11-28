-- Script para actualizar el esquema de base de datos
-- Este script añade las tablas y columnas que faltan en tu base de datos actual.

-- 1. Crear tabla PERSONAL si no existe
CREATE TABLE IF NOT EXISTS personal (
    id TEXT PRIMARY KEY, -- DNI/NIE
    nombre TEXT NOT NULL,
    apellido1 TEXT,
    apellido2 TEXT,
    nombre_completo TEXT,
    email TEXT UNIQUE,
    telefono TEXT,
    departamento TEXT,
    categoria TEXT,
    precio_hora NUMERIC DEFAULT 0,
    estado_acceso TEXT CHECK (estado_acceso IN ('PENDIENTE', 'ACTIVO', 'BLOQUEADO', 'NO_SOLICITADO')) DEFAULT 'NO_SOLICITADO',
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Crear tabla PERSONAL_EXTERNO si no existe
CREATE TABLE IF NOT EXISTS personal_externo (
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

-- 3. Actualizar tabla PERFILES
-- Añadir columna personal_id si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'perfiles' AND column_name = 'personal_id') THEN
        ALTER TABLE perfiles ADD COLUMN personal_id TEXT REFERENCES personal(id);
    END IF;
END $$;

-- Añadir columna proveedor_id si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'perfiles' AND column_name = 'proveedor_id') THEN
        ALTER TABLE perfiles ADD COLUMN proveedor_id UUID REFERENCES proveedores(id);
    END IF;
END $$;

-- Añadir columna estado si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'perfiles' AND column_name = 'estado') THEN
        ALTER TABLE perfiles ADD COLUMN estado TEXT CHECK (estado IN ('PENDIENTE', 'ACTIVO', 'BLOQUEADO')) DEFAULT 'PENDIENTE';
    END IF;
END $$;
