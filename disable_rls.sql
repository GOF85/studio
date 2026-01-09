-- Deshabilitar RLS en os_material_orders para permitir inserciones
ALTER TABLE os_material_orders DISABLE ROW LEVEL SECURITY;

-- Verificar que se deshabilitó
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'os_material_orders';
