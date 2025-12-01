-- Verify the recetas table structure
-- Run this in Supabase SQL Editor to see the actual column names

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'recetas'
ORDER BY ordinal_position;
