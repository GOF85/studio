-- Añadir campo imagenes a la tabla articulos
ALTER TABLE public.articulos
ADD COLUMN IF NOT EXISTS imagenes jsonb DEFAULT '[]'::jsonb;

-- Crear índice para mejora de rendimiento
CREATE INDEX IF NOT EXISTS idx_articulos_imagenes ON public.articulos USING gin (imagenes);

-- Comentario descriptivo
COMMENT ON COLUMN public.articulos.imagenes IS 'Array de imágenes del artículo con estructura: [{id, url, esPrincipal, orden, descripcion}]';
