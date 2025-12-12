-- Agregar columna precio_alquiler_entregas a tabla articulos
ALTER TABLE public.articulos 
ADD COLUMN IF NOT EXISTS precio_alquiler_entregas NUMERIC(10,2) DEFAULT 0;

-- Crear índice para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_articulos_precio_alquiler_entregas ON public.articulos(precio_alquiler_entregas);
