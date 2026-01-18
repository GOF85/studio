-- Verifica que las columnas del panel existan en la tabla eventos
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'eventos'
  AND column_name IN (
    'produccion_sala',
    'metre_responsable',
    'metres',
    'logistica_evento',
    'camareros_ext',
    'logisticos_ext',
    'pedido_ett'
  )
ORDER BY column_name;

-- También verifica el estado de RLS
SELECT 
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'eventos';

-- Verifica los datos actuales
SELECT 
    id,
    numero_expediente,
    metre_responsable,
    pedido_ett,
    logisticos_ext,
    updated_at
FROM eventos
WHERE numero_expediente = '555-90867';
