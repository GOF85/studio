-- Migración: Agregar columnas de revisión a tabla elaboraciones
-- Fecha: 18 de Diciembre de 2025
-- Propósito: Agregar soporte para sistema de revisión requerida

-- Agregar columnas a tabla elaboraciones si no existen
ALTER TABLE elaboraciones
ADD COLUMN IF NOT EXISTS requiere_revision BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS comentario_revision TEXT,
ADD COLUMN IF NOT EXISTS fecha_revision TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS responsable_revision TEXT;

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_elaboraciones_requiere_revision ON elaboraciones(requiere_revision);
CREATE INDEX IF NOT EXISTS idx_elaboraciones_responsable_revision ON elaboraciones(responsable_revision);

-- Comentarios de documentación (opcional, para claridad)
COMMENT ON COLUMN elaboraciones.requiere_revision IS 'Indica si la elaboración requiere revisión';
COMMENT ON COLUMN elaboraciones.comentario_revision IS 'Comentarios sobre qué requiere revisión';
COMMENT ON COLUMN elaboraciones.fecha_revision IS 'Fecha/hora cuando se marcó para revisión';
COMMENT ON COLUMN elaboraciones.responsable_revision IS 'Email del usuario responsable de marcar para revisión';
