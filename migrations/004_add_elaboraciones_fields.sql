-- Add missing fields to elaboraciones table to match frontend requirements

ALTER TABLE elaboraciones 
ADD COLUMN IF NOT EXISTS fotos JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS video_produccion_url TEXT,
ADD COLUMN IF NOT EXISTS formato_expedicion TEXT,
ADD COLUMN IF NOT EXISTS ratio_expedicion NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS tipo_expedicion TEXT CHECK (tipo_expedicion IN ('REFRIGERADO', 'CONGELADO', 'SECO')),
ADD COLUMN IF NOT EXISTS produccion_total NUMERIC DEFAULT 1,
ADD COLUMN IF NOT EXISTS requiere_revision BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS comentario_revision TEXT,
ADD COLUMN IF NOT EXISTS fecha_revision TIMESTAMPTZ;

-- Create storage bucket for elaboraciones
INSERT INTO storage.buckets (id, name, public)
VALUES ('elaboraciones', 'elaboraciones', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the bucket (with unique names to avoid conflicts)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'elaboraciones_public_access'
    ) THEN
        CREATE POLICY "elaboraciones_public_access"
        ON storage.objects FOR SELECT
        USING ( bucket_id = 'elaboraciones' );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'elaboraciones_authenticated_upload'
    ) THEN
        CREATE POLICY "elaboraciones_authenticated_upload"
        ON storage.objects FOR INSERT
        WITH CHECK ( bucket_id = 'elaboraciones' AND auth.role() = 'authenticated' );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'elaboraciones_authenticated_update'
    ) THEN
        CREATE POLICY "elaboraciones_authenticated_update"
        ON storage.objects FOR UPDATE
        USING ( bucket_id = 'elaboraciones' AND auth.role() = 'authenticated' );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'elaboraciones_authenticated_delete'
    ) THEN
        CREATE POLICY "elaboraciones_authenticated_delete"
        ON storage.objects FOR DELETE
        USING ( bucket_id = 'elaboraciones' AND auth.role() = 'authenticated' );
    END IF;
END $$;
