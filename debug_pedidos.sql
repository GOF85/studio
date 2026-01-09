-- Check table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pedidos_material'
ORDER BY ordinal_position;

-- Check a sample record (limit 1)
SELECT * FROM pedidos_material LIMIT 1;
