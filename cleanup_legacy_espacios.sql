-- Drop foreign key from eventos to espacios
ALTER TABLE eventos DROP CONSTRAINT IF EXISTS eventos_espacio_id_fkey;

-- Drop legacy espacios table
DROP TABLE IF EXISTS espacios;

-- Add foreign key from eventos to espacios_v2
-- Note: This assumes eventos.espacio_id will hold UUIDs matching espacios_v2.id
-- Since eventos is empty, this is safe.
ALTER TABLE eventos ADD CONSTRAINT eventos_espacio_id_fkey FOREIGN KEY (espacio_id) REFERENCES espacios_v2(id);
