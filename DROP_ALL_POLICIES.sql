-- DROP todas las policies de eventos para asegurar que RLS disabled funciona
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON eventos;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON eventos;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON eventos;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON eventos;
DROP POLICY IF EXISTS "Allow read for authenticated" ON eventos;

-- Verifica que no hay policies
SELECT tablename, COUNT(*) as num_policies
FROM pg_policies
WHERE tablename = 'eventos'
GROUP BY tablename;
