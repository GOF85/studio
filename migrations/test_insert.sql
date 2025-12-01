-- Test that Supabase can insert and retrieve data correctly
-- Run this in Supabase SQL Editor

-- Insert a test recipe
INSERT INTO recetas (
    id,
    numero_receta,
    nombre,
    categoria,
    visible_para_comerciales,
    estacionalidad,
    tipo_dieta,
    porcentaje_coste_produccion,
    elaboraciones,
    menaje_asociado,
    fotos_mise_en_place,
    fotos_regeneracion,
    fotos_emplatado,
    fotos_comerciales,
    alergenos
) VALUES (
    'test-recipe-001',
    'R-0001',
    'Ensalada César',
    'Entrantes',
    true,
    'MIXTO',
    'NINGUNO',
    30,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    ARRAY[]::text[]
);

-- Verify the insert
SELECT id, numero_receta, nombre, categoria, created_at 
FROM recetas 
WHERE id = 'test-recipe-001';

-- Test update
UPDATE recetas 
SET nombre = 'Ensalada César Modificada',
    updated_at = NOW()
WHERE id = 'test-recipe-001';

-- Verify update
SELECT id, nombre, updated_at 
FROM recetas 
WHERE id = 'test-recipe-001';

-- Clean up
DELETE FROM recetas WHERE id = 'test-recipe-001';

-- Verify deletion
SELECT COUNT(*) as remaining_test_records 
FROM recetas 
WHERE id = 'test-recipe-001';
