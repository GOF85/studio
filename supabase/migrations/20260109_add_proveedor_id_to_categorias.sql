
-- Migración para añadir proveedor_id a categorias_personal 
-- y permitir la relación con la tabla proveedores.

-- 1. Añadir la columna proveedor_id si no existe
ALTER TABLE public.categorias_personal 
ADD COLUMN IF NOT EXISTS proveedor_id UUID REFERENCES public.proveedores(id) ON DELETE SET NULL;

-- 2. Crear un índice para mejorar el rendimiento de las búsquedas por proveedor
CREATE INDEX IF NOT EXISTS idx_categorias_personal_proveedor ON public.categorias_personal(proveedor_id);

-- 3. (Opcional) Comentario para documentación
COMMENT ON COLUMN public.categorias_personal.proveedor_id IS 'ID del proveedor (ETT) al que pertenece esta categoría y precio.';
