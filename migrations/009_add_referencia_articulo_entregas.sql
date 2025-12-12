-- Agregar columna referencia_articulo_entregas a tabla articulos
ALTER TABLE public.articulos 
ADD COLUMN referencia_articulo_entregas text UNIQUE;

-- Crear índice para búsqueda rápida
CREATE INDEX idx_articulos_referencia_entregas ON public.articulos(referencia_articulo_entregas);
