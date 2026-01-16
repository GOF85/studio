-- Migration: OS Panel Control Dashboard
-- Date: 2026-01-15
-- Purpose: Add columns to eventos table for panel control and create audit table

-- 1. Add Sala columns to eventos
ALTER TABLE public.eventos
ADD COLUMN IF NOT EXISTS produccion_sala TEXT REFERENCES public.personal(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS revision_pm BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS metre_responsable TEXT REFERENCES public.personal(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS metres TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS logistica_evento TEXT REFERENCES public.personal(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS camareros_ext INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS logisticos_ext INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pedido_ett BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ped_almacen_bio_bod BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pedido_walkies BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pedido_hielo BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pedido_transporte BOOLEAN DEFAULT false;

-- 2. Add Cocina columns to eventos
ALTER TABLE public.eventos
ADD COLUMN IF NOT EXISTS produccion_cocina_cpr TEXT REFERENCES public.personal(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS jefe_cocina TEXT REFERENCES public.personal(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cocina TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS cocineros_ext INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS logisticos_ext_cocina INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS gastro_actualizada BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pedido_gastro BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pedido_cocina BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS personal_cocina BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS servicios_extra TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 3. Add Logistica columns to eventos
ALTER TABLE public.eventos
ADD COLUMN IF NOT EXISTS edo_almacen TEXT DEFAULT 'Pendiente',
ADD COLUMN IF NOT EXISTS mozo TEXT REFERENCES public.personal(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS estado_logistica TEXT DEFAULT 'Pendiente',
ADD COLUMN IF NOT EXISTS carambucos INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS jaulas TEXT,
ADD COLUMN IF NOT EXISTS pallets TEXT,
ADD COLUMN IF NOT EXISTS proveedor TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS h_recogida_cocina TIME,
ADD COLUMN IF NOT EXISTS transporte TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS h_recogida_pre_evento TIME,
ADD COLUMN IF NOT EXISTS h_descarga_evento TIME,
ADD COLUMN IF NOT EXISTS h_recogida_pos_evento TIME,
ADD COLUMN IF NOT EXISTS h_descarga_pos_evento TIME,
ADD COLUMN IF NOT EXISTS alquiler_lanzado BOOLEAN DEFAULT false;

-- 4. Create os_panel_cambios audit table
CREATE TABLE IF NOT EXISTS public.os_panel_cambios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
    numero_expediente TEXT,
    usuario_id TEXT,
    usuario_email TEXT,
    pestaña TEXT CHECK (pestaña IN ('Espacio', 'Sala', 'Cocina', 'Logística', 'Personal')),
    cambios JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    auto_guardado BOOLEAN DEFAULT true
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_os_panel_cambios_os_id ON public.os_panel_cambios(os_id);
CREATE INDEX IF NOT EXISTS idx_os_panel_cambios_timestamp ON public.os_panel_cambios(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_os_panel_cambios_numero_expediente ON public.os_panel_cambios(numero_expediente);

-- 6. Enable RLS for os_panel_cambios
ALTER TABLE public.os_panel_cambios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated to view panel changes"
  ON public.os_panel_cambios
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated to insert panel changes"
  ON public.os_panel_cambios
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 7. Grant permissions
GRANT SELECT ON public.os_panel_cambios TO authenticated;
GRANT INSERT ON public.os_panel_cambios TO authenticated;
