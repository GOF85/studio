-- Add missing columns to pedidos_hielo
ALTER TABLE public.pedidos_hielo 
ADD COLUMN IF NOT EXISTS proveedor_id UUID REFERENCES public.proveedores(id),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pendiente';

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_pedidos_hielo_proveedor_id ON public.pedidos_hielo(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_hielo_evento_id ON public.pedidos_hielo(evento_id);
