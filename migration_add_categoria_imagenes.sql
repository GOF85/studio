-- Añadir columna categoria a la tabla espacios_imagenes
ALTER TABLE espacios_imagenes 
ADD COLUMN IF NOT EXISTS categoria TEXT CHECK (categoria IN ('foto', 'plano')) DEFAULT 'foto';

-- Comentario: Esta columna permite diferenciar entre fotos comerciales y planos técnicos
