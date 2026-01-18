-- Verifica que RLS esté REALMENTE disabled
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'eventos') as num_policies
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'eventos';

-- Si rowsecurity = false, significa que RLS está disabled
-- Si hay policies listadas, significa que hay políticas incluso con RLS disabled
