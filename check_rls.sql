-- Verificar si RLS está habilitado en os_material_orders
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'os_material_orders';

-- Verificar las políticas RLS
SELECT * FROM pg_policies 
WHERE tablename = 'os_material_orders';
